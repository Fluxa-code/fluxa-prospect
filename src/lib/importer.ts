import Papa from 'papaparse'
import type {
  CanalContato,
  CanalStatus,
  ContatoSeed,
  Estagio,
  Lead,
  Verificacao,
} from './types'
import {
  CANAL_CONTATO_VALUES,
  CANAL_STATUS_VALUES,
  ESTAGIO_VALUES,
  TIER_VALUES,
} from './types'

export type LeadImport = Omit<Lead, 'atualizado_em'>

export interface ImportResult {
  leads: LeadImport[]
  contatos: ContatoSeed[]
  avisos: string[]
  descartados: string[]
}

// Campos que viram colunas de verdade; todo o resto do arquivo é preservado
// intocado em `auditoria` e volta idêntico na exportação.
const CAMPOS_PROPRIOS = new Set([
  'id', 'nome', 'segmento', 'cat', 'endereco', 'telefone', 'cnpj', 'site',
  'estado', 'veredito', 'tier', 'score', 'cms', 'instagram', 'facebook',
  'confianca', 'verificacao', 'canal_status', 'estagio', 'valor_estimado',
  'perda_motivo', 'followup_em', 'followup_nota', 'historico', 'contatos',
  'atualizado_em', 'criado_em', 'auditoria',
])

const CANAIS_CONHECIDOS = new Set(CANAL_CONTATO_VALUES)

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

/**
 * Converte o histórico legado em texto livre para contatos estruturados.
 * Formatos reais da base: "2026-08-18 whatsapp", "2026-08-21 follow-up",
 * "2026-08-18 whatsapp — respondeu bot", "2026-08-21 whatsapp — RESPONDEU (Simone)",
 * "2026-08-18" (só a data).
 */
export function parseHistorico(historico: string, leadId: number): ContatoSeed[] {
  return historico
    .split(';')
    .map((parte) => parte.trim())
    .filter(Boolean)
    .flatMap((parte) => {
      const m = parte.match(/^(\d{4}-\d{2}-\d{2})\s*(.*)$/)
      if (!m) return [] // sem data não dá para estruturar; fica no historico_legado
      const em = `${m[1]}T12:00:00-03:00`
      const resto = m[2].trim()

      let canal: CanalContato = 'outro'
      let texto = resto
      const primeiraPalavra = resto.split(/[\s—–-]/)[0]?.toLowerCase() ?? ''
      if (CANAIS_CONHECIDOS.has(primeiraPalavra as CanalContato)) {
        canal = primeiraPalavra as CanalContato
        texto = resto.slice(primeiraPalavra.length).replace(/^[\s—–-]+/, '').trim()
      } else if (primeiraPalavra.startsWith('follow')) {
        texto = 'follow-up'
      }

      const ehResposta = /respond/i.test(texto)
      return [{
        lead_id: leadId,
        em,
        canal,
        enviado: ehResposta ? '' : texto,
        resposta: ehResposta ? texto : '',
      }]
    })
}

function normalizaVerificacao(v: string): Verificacao {
  if (v === 'completa' || v === 'parcial') return v
  return 'nao_informado'
}

function normalizaCanalStatus(v: string): CanalStatus {
  return (CANAL_STATUS_VALUES as string[]).includes(v) ? (v as CanalStatus) : 'nao_testado'
}

function normalizaEstagio(v: string): Estagio {
  return (ESTAGIO_VALUES as string[]).includes(v) ? (v as Estagio) : 'nao_contatado'
}

interface RegistroBruto {
  [k: string]: unknown
}

function mapeiaLead(raw: RegistroBruto): { lead: LeadImport; contatos: ContatoSeed[] } | null {
  const id = Number(raw.id)
  if (!Number.isFinite(id)) return null
  const nome = str(raw.nome)
  if (!nome) return null

  const tierBruto = str(raw.tier).toUpperCase()
  const valorBruto = raw.valor_estimado
  const valor =
    valorBruto === null || valorBruto === undefined || str(valorBruto) === ''
      ? null
      : Number(valorBruto)

  // Reimportação de um export do próprio app traz `contatos` já estruturados;
  // arquivo original traz `historico` em texto livre.
  let contatos: ContatoSeed[]
  const historicoLegado = str(raw.historico)
  if (Array.isArray(raw.contatos)) {
    contatos = (raw.contatos as RegistroBruto[])
      .map((c) => ({
        lead_id: id,
        em: str(c.em),
        canal: (CANAIS_CONHECIDOS.has(str(c.canal) as CanalContato)
          ? str(c.canal)
          : 'outro') as CanalContato,
        enviado: str(c.enviado),
        resposta: str(c.resposta),
      }))
      .filter((c) => c.em !== '')
  } else {
    contatos = parseHistorico(historicoLegado, id)
  }

  const auditoria: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (!CAMPOS_PROPRIOS.has(k) && v !== '' && v !== null && v !== undefined) {
      auditoria[k] = v
    }
  }
  if (historicoLegado) auditoria.historico_legado = historicoLegado

  const lead: LeadImport = {
    id,
    nome,
    segmento: str(raw.segmento),
    cat: str(raw.cat),
    endereco: str(raw.endereco),
    telefone: str(raw.telefone),
    cnpj: str(raw.cnpj),
    site: str(raw.site),
    estado: str(raw.estado),
    veredito: str(raw.veredito),
    tier: (TIER_VALUES as readonly string[]).includes(tierBruto) ? tierBruto : 'D',
    score: Number(raw.score) || 0,
    cms: str(raw.cms),
    instagram: str(raw.instagram),
    facebook: str(raw.facebook),
    confianca: str(raw.confianca),
    verificacao: normalizaVerificacao(str(raw.verificacao)),
    canal_status: normalizaCanalStatus(str(raw.canal_status)),
    estagio: normalizaEstagio(str(raw.estagio)),
    valor_estimado: valor !== null && Number.isFinite(valor) ? valor : null,
    perda_motivo: str(raw.perda_motivo),
    followup_em: str(raw.followup_em) || null,
    followup_nota: str(raw.followup_nota),
    auditoria,
  }
  return { lead, contatos }
}

export function importaRegistros(registros: RegistroBruto[]): ImportResult {
  const leads: LeadImport[] = []
  const contatos: ContatoSeed[] = []
  const avisos: string[] = []
  const descartados: string[] = []

  for (const raw of registros) {
    const mapeado = mapeiaLead(raw)
    if (!mapeado) {
      descartados.push(str(raw.nome) || str(raw.id) || 'registro sem id/nome')
      continue
    }
    leads.push(mapeado.lead)
    contatos.push(...mapeado.contatos)

    if (mapeado.lead.canal_status === 'sem_contato' && mapeado.contatos.length > 0) {
      avisos.push(
        `${mapeado.lead.nome} (id ${mapeado.lead.id}): marcado como "sem contato" mas tem ` +
          `${mapeado.contatos.length} contato(s) no histórico — revisar o status de canal.`,
      )
    }
  }

  const idsVistos = new Set<number>()
  for (const l of leads) {
    if (idsVistos.has(l.id)) avisos.push(`id ${l.id} aparece mais de uma vez no arquivo.`)
    idsVistos.add(l.id)
  }

  return { leads, contatos, avisos, descartados }
}

export function parseArquivo(nome: string, conteudoBruto: string): ImportResult {
  const conteudo = conteudoBruto.replace(/^﻿/, '')
  if (nome.toLowerCase().endsWith('.csv')) {
    const parsed = Papa.parse<RegistroBruto>(conteudo, {
      header: true,
      skipEmptyLines: true,
    })
    return importaRegistros(parsed.data)
  }
  const json = JSON.parse(conteudo) as unknown
  const registros = Array.isArray(json)
    ? (json as RegistroBruto[])
    : ((json as RegistroBruto).leads as RegistroBruto[])
  if (!Array.isArray(registros)) {
    throw new Error('Formato não reconhecido: esperava um array de leads ou { leads: [...] }.')
  }
  return importaRegistros(registros)
}
