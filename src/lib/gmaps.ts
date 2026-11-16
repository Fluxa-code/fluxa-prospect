/**
 * Núcleo compartilhado da importação do Google Maps: tipos do lead bruto, auditoria
 * de site e mapeamento de categoria. Usado pelo conversor de linha de comando
 * (scripts/gmaps-para-fluxa.ts) e pelo agente que roda as buscas no PC.
 */

const ANO = new Date().getFullYear()
export const HOJE = () => new Date().toISOString().slice(0, 10)

export interface Bruto {
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
  // nomes do painel do kit
  nota?: string | number
  avaliacoes?: string | number
  maps?: string
  // nomes do CSV do scrape.py
  review_rating?: string | number
  review_count?: string | number
  [k: string]: unknown
}

export interface Auditoria {
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

export async function auditaSite(url: string): Promise<Auditoria> {
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
        `HTTP ${resp.status} em ${alvo} (${HOJE()})`,
      )
    }
    if (resp.status === 404 || resp.status === 410) {
      return quebrado(
        `a página inicial responde ${resp.status}`,
        `HTTP ${resp.status} em ${alvo} (${HOJE()})`,
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
      `${ano ? `; copyright ${ano}` : '; sem ano de copyright'} (auditado em ${HOJE()})`

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
        `falha de DNS (${msg}) em ${alvo}, ${HOJE()}`,
      )
    }
    if (/CERT|TLS|SSL/i.test(msg)) {
      return quebrado(
        'certificado inválido — o navegador bloqueia com aviso de segurança',
        `erro de certificado (${msg}) em ${alvo}, ${HOJE()}`,
      )
    }
    return quebrado('o servidor não responde', `sem resposta (${msg}) em ${alvo}, ${HOJE()}`)
  } finally {
    clearTimeout(limite)
  }
}

// ── categoria do Maps -> categoria do app ───────────────────────────────────────
const CATEGORIAS: [RegExp, string][] = [
  [
    /restaurante|pizzaria|lanchonete|lanches|hamburgue|burger|food truck|trailer|bar\b|churrasc|sushi|cafeteria|caf[ée]|pastelaria|past[ée]is|hot ?dog|crepe|tapioca|espetinho|marmit|self.?service|comida/i,
    'Restaurante',
  ],
  [
    /padaria|mercado|supermercad|a[çc]ougue|adega|distribuidora de bebida|doceria|confeitaria|a[çc]a[íi]|sorvet|gelato|sucos|salgados|bolos|chocolate/i,
    'Alimentação',
  ],
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

export const catDoApp = (categoria: string) =>
  CATEGORIAS.find(([re]) => re.test(categoria))?.[1] ?? 'Serviços'

export const semAcento = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
export const soDigitos = (s: string) => (s ?? '').replace(/\D/g, '')

/** 5511979847732 -> (11) 97984-7732 — o kit devolve só dígitos, com 55 na frente. */
export function formataTel(bruto: string): string {
  let d = soDigitos(bruto)
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return bruto
}

