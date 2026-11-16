/**
 * Ponte entre o Google Maps Scraper Kit e o Fluxa Prospect.
 *
 * Lê o que o kit produziu (painel/dados/leads.json ou o CSV do scripts/scrape.py),
 * audita o site de cada negócio e grava um lote no formato do importador do app.
 *
 *   npx tsx scripts/gmaps-para-fluxa.ts <entrada> --id-inicial 5001 --origem "restaurantes Guarulhos"
 *
 * Opções:
 *   --id-inicial N     primeiro id do lote (obrigatório; use um bloco de mil livre)
 *   --origem "texto"   descrição do lote, vai no campo origem de cada lead
 *   --base arq.json    export atual do app, para não repetir lead que já existe
 *   --saida arq.json   padrão: C:/Users/deivi/Downloads/leads_<origem>.json
 *   --sem-auditoria    pula a checagem dos sites (rápido, porém sem diagnóstico)
 *   --limite N         processa só os N primeiros (teste)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import {
  auditaSite,
  catDoApp,
  formataTel,
  HOJE as hojeFn,
  semAcento,
  soDigitos,
  type Auditoria,
  type Bruto,
} from '../src/lib/gmaps'

const HOJE = hojeFn()

// ── entrada: aceita o leads.json do painel ou o CSV do scrape.py ────────────────
function parseCsv(texto: string): Bruto[] {
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
    (l) => Object.fromEntries(cab.map((h, i) => [h.trim(), (l[i] ?? '').trim()])) as Bruto,
  )
}

function leEntrada(caminho: string): Bruto[] {
  const texto = readFileSync(caminho, 'utf8').replace(/^\uFEFF/, '')
  if (caminho.toLowerCase().endsWith('.csv')) return parseCsv(texto)
  const json = JSON.parse(texto) as unknown
  if (Array.isArray(json)) return json as Bruto[]
  // leads.json do painel é um objeto { "<id do lead>": {lead}, ... }
  return Object.values(json as Record<string, Bruto>)
}

// ── auditoria do site ───────────────────────────────────────────────────────────
// ── montagem do lote ────────────────────────────────────────────────────────────
function arg(nome: string, padrao?: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`)
  return i >= 0 ? process.argv[i + 1] : padrao
}

async function main() {
  const entrada = process.argv[2]
  const idInicial = Number(arg('id-inicial'))
  if (!entrada || !Number.isFinite(idInicial)) {
    console.error(
      'uso: npx tsx scripts/gmaps-para-fluxa.ts <entrada.json|csv> --id-inicial 5001 ' +
        '[--origem "..."] [--base export.json] [--saida arq.json] [--sem-auditoria] [--limite N]',
    )
    process.exit(1)
  }
  const origem = arg('origem', 'lote Google Maps')!
  const auditar = !process.argv.includes('--sem-auditoria')
  const limite = Number(arg('limite', '0'))

  let brutos = leEntrada(entrada)
  if (limite > 0) brutos = brutos.slice(0, limite)

  // dedupe contra a base atual do app, por nome e por telefone
  const base = arg('base')
  const nomesBase = new Set<string>()
  const telsBase = new Set<string>()
  if (base) {
    const b = JSON.parse(readFileSync(base, 'utf8')) as unknown
    const lista = (Array.isArray(b) ? b : (b as { leads: unknown[] }).leads) as {
      nome?: string
      telefone?: string
    }[]
    for (const l of lista) {
      if (l.nome) nomesBase.add(semAcento(l.nome))
      const t = soDigitos(l.telefone ?? '')
      if (t.length >= 10) telsBase.add(t.slice(-9))
    }
  }

  const saida: Record<string, unknown>[] = []
  const repetidos: string[] = []
  let id = idInicial

  for (const b of brutos) {
    const nome = (b.nome ?? b.title ?? '').trim()
    if (!nome) continue

    const telBruto = (b.whatsapp || b.telefone || b.phone || '') as string
    const digitos = soDigitos(telBruto)
    const ehCelular =
      b.tel_tipo === 'celular' || Boolean(b.whatsapp) || /^(?:55)?\d{2}9\d{8}$/.test(digitos)

    if (nomesBase.has(semAcento(nome)) || (digitos.length >= 10 && telsBase.has(digitos.slice(-9)))) {
      repetidos.push(nome)
      continue
    }

    const site = ((b.site ?? b.website ?? '') as string).trim()
    const instagram = ((b.instagram ?? '') as string).trim()
    const facebook = ((b.facebook ?? '') as string).trim()
    const categoria = ((b.categoria ?? b.category ?? '') as string).trim()
    const endereco = [b.endereco ?? b.address, b.bairro, b.cidade, b.uf].filter(Boolean).join(', ')

    let a: Auditoria
    if (site && auditar) {
      process.stdout.write(`\r  auditando ${saida.length + 1}/${brutos.length}…   `)
      a = await auditaSite(site)
    } else if (site) {
      a = {
        estado: '',
        veredito: '',
        tier: 'C',
        score: 50,
        cms: '',
        problemas: '',
        evidencia: `site listado no Google Maps, não auditado (${HOJE})`,
        confianca: 'media',
      }
    } else if (instagram || facebook) {
      a = {
        estado: 'Só redes sociais',
        veredito: '',
        tier: 'B',
        score: 72,
        cms: '',
        problemas:
          'presença só em rede social; não encontrei site próprio na listagem do Google Maps',
        evidencia: `ficha do Google Maps sem site (${HOJE})`,
        confianca: 'media',
      }
    } else {
      // Régua da skill: negócio vivo (telefone ou avaliações no Google) sem site é B;
      // só listagem, sem sinal de vida, é C.
      const vivo = digitos.length >= 10 || Number(b.nota ?? b.review_rating ?? 0) > 0
      a = {
        estado: 'Sem presença digital',
        veredito: '',
        tier: vivo ? 'B' : 'C',
        score: vivo ? 70 : 50,
        cms: '',
        problemas: 'sem site e sem rede social na ficha do Google Maps',
        evidencia: `ficha do Google Maps sem site e sem rede social (${HOJE})`,
        confianca: vivo ? 'media' : 'baixa',
      }
    }

    const notas: string[] = []
    if (digitos.length >= 10 && !ehCelular) {
      notas.push(`telefone fixo: ${formataTel(telBruto)} — confirmar se tem WhatsApp`)
    }
    const nota = b.nota ?? b.review_rating
    const avaliacoes = b.avaliacoes ?? b.review_count
    if (nota) notas.push(`Google: nota ${nota} com ${avaliacoes ?? '?'} avaliações`)
    if (b.maps) notas.push(`ficha no Maps: ${b.maps}`)
    if (b.email) notas.push(`e-mail publicado no site: ${b.email} (não usar para disparo frio)`)

    saida.push({
      id: id++,
      nome,
      segmento: categoria,
      cat: catDoApp(categoria),
      endereco,
      telefone: ehCelular ? formataTel(telBruto) : '',
      cnpj: '',
      site,
      estado: a.estado,
      veredito: a.veredito,
      tier: a.tier,
      score: a.score,
      cms: a.cms,
      instagram,
      facebook,
      confianca: a.confianca,
      verificacao: 'parcial',
      canal_status: 'nao_testado',
      estagio: 'nao_contatado',
      historico: '',
      problemas: a.problemas,
      oportunidade: '',
      motivo: '',
      evidencia: a.evidencia,
      notas: notas.join(' · '),
      origem: `Google Maps (kit) + auditoria automática ${HOJE} — ${origem}`,
    })
  }

  const destino =
    arg('saida') ??
    `C:/Users/deivi/Downloads/leads_${semAcento(origem).replace(/[^a-z0-9]+/g, '_')}.json`
  writeFileSync(destino, JSON.stringify(saida, null, 1), 'utf8')

  const porEstado: Record<string, number> = {}
  for (const l of saida) {
    const chave = String(l.estado) || '(sem estado)'
    porEstado[chave] = (porEstado[chave] ?? 0) + 1
  }
  console.log(`\n\nArquivo: ${destino}`)
  console.log(`${saida.length} leads · ids ${idInicial}–${id - 1}`)
  console.log('estado do site:', porEstado)
  console.log(`com celular no botão de WhatsApp: ${saida.filter((l) => l.telefone).length}`)
  if (repetidos.length) {
    console.log(
      `já existiam na base (ignorados): ${repetidos.length} — ` +
        `${repetidos.slice(0, 5).join(', ')}${repetidos.length > 5 ? '…' : ''}`,
    )
  }
}

main().catch((e) => {
  console.error('ERRO:', e)
  process.exit(1)
})
