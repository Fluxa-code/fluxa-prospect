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

const ANO = new Date().getFullYear()
const HOJE = new Date().toISOString().slice(0, 10)

// ── entrada: aceita o leads.json do painel ou o CSV do scrape.py ────────────────
interface Bruto {
  nome?: string
  title?: string
  categoria?: string
  category?: string
  telefone?: string
  phone?: string
  tel_tipo?: string
  whatsapp?: string
  site?: string
  website?: string
  instagram?: string
  facebook?: string
  endereco?: string
  address?: string
  bairro?: string
  cidade?: string
  uf?: string
  email?: string
  review_rating?: string | number
  review_count?: string | number
  [k: string]: unknown
}

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
interface Auditoria {
  estado: string
  veredito: string
  tier: string
  score: number
  cms: string
  problemas: string
  evidencia: string
  confianca: string
}

const PLATAFORMAS: [RegExp, string][] = [
  [/wixsite\.com|wix\.com/i, 'Wix'],
  [/wp-content|wp-includes|wordpress/i, 'WordPress'],
  [/cdn\.shopify|shopify/i, 'Shopify'],
  [/squarespace/i, 'Squarespace'],
  [/mitiendanube|nuvemshop/i, 'Nuvemshop'],
  [/lojaintegrada/i, 'Loja Integrada'],
  [/webnode/i, 'Webnode'],
  [/blogspot|blogger/i, 'Blogspot'],
  [/linktr\.ee|linktree/i, 'Linktree'],
]

const SUBDOMINIO_GRATIS =
  /wixsite\.com|webnode|blogspot\.com|wordpress\.com|negocio\.site|business\.site/i

function quebrado(problema: string, evidencia: string): Auditoria {
  return {
    estado: 'Site quebrado / domínio perdido',
    veredito: 'quebrado',
    tier: 'A',
    score: 95,
    cms: 'desconhecido (site inacessível)',
    problemas: problema,
    evidencia,
    confianca: 'alta',
  }
}

async function auditaSite(url: string): Promise<Auditoria> {
  const alvo = /^https?:\/\//i.test(url) ? url : `https://${url}`
  const controle = new AbortController()
  const limite = setTimeout(() => controle.abort(), 12_000)
  try {
    const resp = await fetch(alvo, {
      redirect: 'follow',
      signal: controle.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FluxaProspect/1.0)' },
    })
    const html = (await resp.text()).slice(0, 400_000)
    const destino = resp.url || alvo

    if (resp.status >= 500) {
      return quebrado(
        `servidor respondeu ${resp.status} — o site não abre para o cliente`,
        `HTTP ${resp.status} em ${alvo} (${HOJE})`,
      )
    }
    if (resp.status === 404 || resp.status === 410) {
      return quebrado(
        `a página inicial responde ${resp.status}`,
        `HTTP ${resp.status} em ${alvo} (${HOJE})`,
      )
    }

    const cms = PLATAFORMAS.find(([re]) => re.test(html))?.[1] ?? 'não identificado'
    const manutencao =
      /em\s+manuten|em\s+constru|temporariamente\s+(fora|indispon)|site\s+em\s+breve/i.test(html)
    // "Copyright 2015-2022" vale pelo fim do intervalo, não pelo começo: pega todos os
    // anos logo depois do © e usa o maior.
    const anos: number[] = []
    for (const bloco of html.matchAll(/(?:©|&copy;|copyright)([^<]{0,40})/gi)) {
      for (const achado of bloco[1].matchAll(/(?:19|20)\d{2}/g)) {
        const a = Number(achado[0])
        if (a >= 2000 && a <= ANO) anos.push(a)
      }
    }
    const ano = anos.length ? Math.max(...anos) : null
    const gratis = SUBDOMINIO_GRATIS.test(destino)
    const base =
      `${alvo} respondeu ${resp.status}` +
      `${destino !== alvo ? ` (redirecionou para ${destino})` : ''}; plataforma ${cms}` +
      `${ano ? `; copyright ${ano}` : '; sem ano de copyright'} (auditado em ${HOJE})`

    if (manutencao) {
      return {
        estado: 'Site obsoleto',
        veredito: 'obsoleto',
        tier: 'A',
        score: 88,
        cms,
        problemas: 'site exibe página de manutenção/em construção no lugar do conteúdo',
        evidencia: base,
        confianca: 'alta',
      }
    }
    if (ano !== null && ano <= ANO - 3) {
      return {
        estado: 'Site obsoleto',
        veredito: 'obsoleto',
        tier: 'B',
        score: 78,
        cms,
        problemas: `copyright de ${ano} — site sem atualização aparente há ${ANO - ano} anos`,
        evidencia: base,
        confianca: 'alta',
      }
    }
    if (gratis) {
      return {
        estado: 'Site datado',
        veredito: 'datado',
        tier: 'B',
        score: 75,
        cms,
        problemas: 'usa subdomínio gratuito de plataforma, sem domínio próprio',
        evidencia: base,
        confianca: 'alta',
      }
    }
    if (ano !== null && ano <= ANO - 1) {
      return {
        estado: 'Site datado',
        veredito: 'datado',
        tier: 'B',
        score: 72,
        cms,
        problemas: `copyright de ${ano}, um ou dois anos atrás`,
        evidencia: base,
        confianca: 'alta',
      }
    }
    return {
      estado: 'Site aceitável',
      veredito: 'aceitavel',
      tier: 'C',
      score: 58,
      cms,
      problemas:
        'site no ar e atualizado — conferir se o cliente consegue agendar ou comprar sozinho por ele',
      evidencia: base,
      confianca: 'alta',
    }
  } catch (e) {
    const causa = (e as { cause?: { code?: string } })?.cause?.code
    const msg = String(causa ?? (e as Error)?.name ?? e)
    if (/ENOTFOUND|EAI_AGAIN/i.test(msg)) {
      return quebrado(
        'o domínio não resolve em DNS — quem clica no Google cai no erro',
        `falha de DNS (${msg}) em ${alvo}, ${HOJE}`,
      )
    }
    if (/CERT|TLS|SSL/i.test(msg)) {
      return quebrado(
        'certificado inválido — o navegador bloqueia com aviso de segurança',
        `erro de certificado (${msg}) em ${alvo}, ${HOJE}`,
      )
    }
    return quebrado('o servidor não responde', `sem resposta (${msg}) em ${alvo}, ${HOJE}`)
  } finally {
    clearTimeout(limite)
  }
}

// ── categoria do Maps -> categoria do app ───────────────────────────────────────
const CATEGORIAS: [RegExp, string][] = [
  [/restaurante|pizzaria|lanchonete|hamburgue|food truck|bar\b|churrasc|sushi|cafeteria|caf[ée]/i, 'Restaurante'],
  [/padaria|mercado|supermercad|a[çc]ougue|adega|distribuidora de bebida|doceria|confeitaria/i, 'Alimentação'],
  [/barbe/i, 'Barbearia'],
  [/sal[ãa]o|cabelei|manicure|est[ée]tica|c[íi]lios|sobrancelha|depila|spa|beleza/i, 'Beleza'],
  [
    /cl[íi]nic|consult[óo]rio|m[ée]dic|dentist|odonto|fisioterap|psic[óo]|psiquiatr|nutri|laborat[óo]ri|ortoped|cardiolog|pediatr|dermatolog|ginecolog|obstetr|urolog|oftalmolog|otorrino|endocrinolog|reumatolog|geriatr|neurolog|cirurgi[ãa]|radiolog|vacina/i,
    'Saúde',
  ],
  [/oficina|auto|mec[âa]nic|funilaria|pneu|concession[áa]r|moto|lava.?r[áa]pido/i, 'Automotivo'],
  [/pet|veterin[áa]r|banho e tosa/i, 'Pet'],
  [/escola|curso|idioma|autoescola|creche|faculdade/i, 'Educação'],
  [/gr[áa]fic|comunica[çc][ãa]o visual|impress[ãa]o|plotagem/i, 'Gráfica'],
  [/constru[çc]|materia|marmorari|serralheri|vidra[çc]|m[óo]veis|marcenari|el[ée]tric|hidr[áa]ulic/i, 'Construção'],
  [/transport|log[íi]stic|entrega|mudan[çc]|frete/i, 'Logística'],
  [/academia|crossfit|pilates|luta|personal/i, 'Esporte'],
  [/inform[áa]tic|tecnologi|celular|assist[êe]ncia t[ée]cnica|software/i, 'Tecnologia'],
  [/loja|roupa|cal[çc]ad|[óo]tica|joalheri|papelari|presente/i, 'Varejo'],
]

const catDoApp = (categoria: string) =>
  CATEGORIAS.find(([re]) => re.test(categoria))?.[1] ?? 'Serviços'

// ── montagem do lote ────────────────────────────────────────────────────────────
const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const soDigitos = (s: string) => (s ?? '').replace(/\D/g, '')

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
      a = {
        estado: 'Sem presença digital',
        veredito: '',
        tier: 'C',
        score: 50,
        cms: '',
        problemas: 'sem site e sem rede social na ficha do Google Maps',
        evidencia: `ficha do Google Maps sem site e sem rede social (${HOJE})`,
        confianca: 'baixa',
      }
    }

    const notas: string[] = []
    if (digitos.length >= 10 && !ehCelular) {
      notas.push(`telefone fixo: ${telBruto} — confirmar se tem WhatsApp`)
    }
    if (b.review_rating) {
      notas.push(`Google: nota ${b.review_rating} com ${b.review_count ?? '?'} avaliações`)
    }
    if (b.email) notas.push(`e-mail publicado no site: ${b.email} (não usar para disparo frio)`)

    saida.push({
      id: id++,
      nome,
      segmento: categoria,
      cat: catDoApp(categoria),
      endereco,
      telefone: ehCelular ? telBruto : '',
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
