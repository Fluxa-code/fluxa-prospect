/**
 * Agente do Fluxa Prospect.
 *
 * Fica rodando no PC de casa, observa a fila de buscas criada pelo app (inclusive
 * pelo celular), executa o motor do Google Maps que está no Docker, audita o site de
 * cada negócio e grava os leads direto no app. Depois atualiza o status da busca.
 *
 *   npx tsx scripts/agente.ts
 *
 * Precisa de: motor em http://localhost:8080 (docker compose up -d no gmaps-kit) e,
 * no .env.local, as credenciais do app (FLUXA_EMAIL e FLUXA_SENHA).
 */
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { auditaSite, catDoApp, formataTel, HOJE, semAcento, soDigitos } from '../src/lib/gmaps'
import { TAMANHOS, type Busca } from '../src/lib/buscas'
import type { Lead } from '../src/lib/types'

const MOTOR = process.env.MOTOR ?? 'http://localhost:8080'
const AGENTE = 'FluxaProspect/1.0 (prospeccao local; contato pelo app)'

function env(): Record<string, string> {
  const texto = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const vars: Record<string, string> = {}
  for (const linha of texto.split('\n')) {
    const m = linha.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\r]*)"?\s*$/)
    if (m) vars[m[1]] = m[2]
  }
  return vars
}

const log = (...p: unknown[]) =>
  console.log(new Date().toLocaleTimeString('pt-BR'), ...p.map(String))

// ── motor de busca (gosom/google-maps-scraper via Docker) ──────────────────────
interface ResultadoMotor {
  title?: string
  category?: string
  phone?: string
  website?: string
  address?: string
  review_rating?: number
  review_count?: number
  [k: string]: unknown
}

async function motor(caminho: string, corpo?: unknown) {
  const resp = await fetch(`${MOTOR}${caminho}`, {
    method: corpo ? 'POST' : 'GET',
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  if (!resp.ok) throw new Error(`motor respondeu ${resp.status} em ${caminho}`)
  return resp.json()
}

/** Centro do mapa pelo OpenStreetMap (1 requisição por segundo, política deles). */
async function geocodifica(local: string): Promise<{ lat: string; lon: string }> {
  const q = new URLSearchParams({ format: 'json', limit: '1', countrycodes: 'br', q: local })
  const resp = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, {
    headers: { 'User-Agent': AGENTE },
  })
  const hits = (await resp.json()) as { lat: string; lon: string }[]
  await new Promise((r) => setTimeout(r, 1100))
  if (!hits.length) throw new Error(`não achei "${local}" no mapa`)
  return { lat: hits[0].lat, lon: hits[0].lon }
}

async function rodaBusca(b: Busca): Promise<ResultadoMotor[]> {
  const onde = [b.bairro, b.cidade, b.uf, 'Brasil'].filter(Boolean).join(', ')
  const { lat, lon } = await geocodifica(onde)
  const t = TAMANHOS[b.tamanho]

  const criado = (await motor('/api/v1/jobs', {
    name: `fluxa-${Date.now()}`,
    keywords: b.termos.map((k) => `${k} em ${b.cidade}`),
    lang: 'pt',
    zoom: 15,
    lat,
    lon,
    fast_mode: false,
    radius: b.bairro ? 3000 : 10000,
    depth: t.depth,
    email: false,
    max_time: t.maxTime,
    proxies: [],
  })) as { id: string }

  const limite = Date.now() + t.maxTime * 1000 + 120_000
  for (;;) {
    await new Promise((r) => setTimeout(r, 5000))
    const info = (await motor(`/api/v1/jobs/${criado.id}`)) as { Status?: string; status?: string }
    const status = (info.Status ?? info.status ?? '').toLowerCase()
    if (status === 'ok') break
    if (status === 'failed') throw new Error('o motor marcou a busca como falha')
    if (Date.now() > limite) throw new Error('o motor passou do tempo limite')
  }

  const csv = await (await fetch(`${MOTOR}/api/v1/jobs/${criado.id}/download`)).text()
  return csvParaObjetos(csv)
}

function csvParaObjetos(texto: string): ResultadoMotor[] {
  const linhas: string[][] = []
  let campo = ''
  let linha: string[] = []
  let aspas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"'
        i++
      } else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === ',') {
      linha.push(campo)
      campo = ''
    } else if (c === '\n') {
      linha.push(campo)
      linhas.push(linha)
      linha = []
      campo = ''
    } else if (c !== '\r') campo += c
  }
  if (campo || linha.length) {
    linha.push(campo)
    linhas.push(linha)
  }
  const [cab, ...resto] = linhas.filter((l) => l.some((v) => v !== ''))
  if (!cab) return []
  return resto.map(
    (l) => Object.fromEntries(cab.map((h, i) => [h.trim(), (l[i] ?? '').trim()])) as ResultadoMotor,
  )
}

// ── conversão para lead do app, com auditoria de site ──────────────────────────
async function converte(
  bruto: ResultadoMotor[],
  b: Busca,
  existentes: Lead[],
  proximoId: () => number,
  aviso: (texto: string) => Promise<void>,
): Promise<{ novos: Omit<Lead, 'atualizado_em'>[]; repetidos: number }> {
  const nomes = new Set(existentes.map((l) => semAcento(l.nome)))
  const tels = new Set(
    existentes.map((l) => soDigitos(l.telefone)).filter((t) => t.length >= 10).map((t) => t.slice(-9)),
  )

  const novos: Omit<Lead, 'atualizado_em'>[] = []
  let repetidos = 0
  let i = 0

  for (const r of bruto) {
    i++
    const nome = (r.title ?? '').trim()
    if (!nome) continue
    const digitos = soDigitos(String(r.phone ?? ''))
    if (nomes.has(semAcento(nome)) || (digitos.length >= 10 && tels.has(digitos.slice(-9)))) {
      repetidos++
      continue
    }
    if (i % 10 === 0) await aviso(`auditando sites (${i} de ${bruto.length})`)

    const site = String(r.website ?? '').trim()
    const categoria = String(r.category ?? '').trim()
    const ehCelular = /^(?:55)?\d{2}9\d{8}$/.test(digitos)

    const a = site
      ? await auditaSite(site)
      : {
          estado: 'Sem presença digital',
          veredito: '',
          tier: digitos.length >= 10 ? 'B' : 'C',
          score: digitos.length >= 10 ? 70 : 50,
          cms: '',
          problemas: 'sem site na ficha do Google Maps',
          evidencia: `ficha do Google Maps sem site (${HOJE()})`,
          confianca: digitos.length >= 10 ? 'media' : 'baixa',
        }

    const notas: string[] = []
    if (digitos.length >= 10 && !ehCelular) {
      notas.push(`telefone fixo: ${formataTel(String(r.phone))} — confirmar se tem WhatsApp`)
    }
    if (r.review_rating) {
      notas.push(`Google: nota ${r.review_rating} com ${r.review_count ?? '?'} avaliações`)
    }

    novos.push({
      id: proximoId(),
      nome,
      segmento: categoria,
      cat: catDoApp(categoria),
      endereco: String(r.address ?? ''),
      telefone: ehCelular ? formataTel(String(r.phone)) : '',
      cnpj: '',
      site,
      estado: a.estado,
      veredito: a.veredito,
      tier: a.tier,
      score: a.score,
      cms: a.cms,
      instagram: '',
      facebook: '',
      confianca: a.confianca,
      verificacao: 'parcial',
      canal_status: 'nao_testado',
      estagio: 'nao_contatado',
      valor_estimado: null,
      perda_motivo: '',
      followup_em: null,
      followup_nota: '',
      auditoria: { problemas: a.problemas, evidencia: a.evidencia, busca_id: b.id },
      criado_em: new Date().toISOString(),
    })
  }

  return { novos, repetidos }
}

// ── laço principal ─────────────────────────────────────────────────────────────
async function main() {
  const vars = env()
  const app = initializeApp({
    apiKey: vars.VITE_FIREBASE_API_KEY,
    authDomain: vars.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: vars.VITE_FIREBASE_PROJECT_ID,
    appId: vars.VITE_FIREBASE_APP_ID,
  })
  const email = vars.FLUXA_EMAIL
  const senha = vars.FLUXA_SENHA
  if (!email || !senha) {
    throw new Error('Faltam FLUXA_EMAIL e FLUXA_SENHA no .env.local (as mesmas do login do app).')
  }
  await signInWithEmailAndPassword(getAuth(app), email, senha)
  const db = getFirestore(app)
  log('agente conectado como', email)

  try {
    await fetch(`${MOTOR}/api/v1/jobs`)
    log('motor de busca respondendo em', MOTOR)
  } catch {
    log('ATENÇÃO: motor não respondeu em', MOTOR, '— rode o Ligar Prospecta no gmaps-kit')
  }

  let ocupado = false

  async function processa(b: Busca) {
    if (ocupado) return
    ocupado = true
    const ref = doc(db, 'buscas', b.id)
    const aviso = async (progresso: string) => {
      await updateDoc(ref, { progresso })
    }
    try {
      log('busca', b.id, '→', b.termos.join(', '), 'em', b.cidade)
      await updateDoc(ref, {
        status: 'rodando',
        iniciado_em: new Date().toISOString(),
        progresso: 'procurando no mapa',
      })

      const bruto = await rodaBusca(b)
      await aviso(`${bruto.length} encontrados, visitando os sites`)

      const snap = await getDocs(collection(db, 'leads'))
      const existentes = snap.docs.map((d) => d.data() as Lead)
      let maior = existentes.reduce((m, l) => Math.max(m, l.id), 0)
      const proximoId = () => ++maior

      const { novos, repetidos } = await converte(bruto, b, existentes, proximoId, aviso)

      for (let i = 0; i < novos.length; i += 400) {
        const lote = writeBatch(db)
        for (const lead of novos.slice(i, i + 400)) {
          lote.set(doc(db, 'leads', String(lead.id)), {
            ...lead,
            atualizado_em: new Date().toISOString(),
          })
        }
        await lote.commit()
      }

      await updateDoc(ref, {
        status: 'concluida',
        concluido_em: new Date().toISOString(),
        progresso: '',
        encontrados: bruto.length,
        novos: novos.length,
        repetidos,
      })
      log('busca', b.id, 'concluída:', novos.length, 'novos,', repetidos, 'repetidos')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      log('busca', b.id, 'FALHOU:', msg)
      await updateDoc(ref, { status: 'erro', erro: msg, progresso: '' }).catch(() => {})
    } finally {
      ocupado = false
    }
  }

  onSnapshot(
    query(collection(db, 'buscas'), where('status', '==', 'na_fila'), orderBy('criado_em')),
    (snap) => {
      const fila = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Busca, 'id'>) }))
      if (fila.length && !ocupado) void processa(fila[0])
    },
    (e) => log('erro observando a fila:', e.message),
  )

  log('aguardando buscas… (Ctrl+C para parar)')
}

main().catch((e) => {
  console.error('ERRO:', e instanceof Error ? e.message : e)
  process.exit(1)
})
