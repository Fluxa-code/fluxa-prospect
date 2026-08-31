import type { Contato, Lead } from './types'

function historicoTexto(contatos: Contato[]): string {
  return contatos
    .slice()
    .sort((a, b) => Date.parse(a.em) - Date.parse(b.em))
    .map((c) => {
      const data = c.em.slice(0, 10)
      const extra = c.resposta || c.enviado
      return `${data} ${c.canal}${extra ? ` — ${extra}` : ''}`
    })
    .join('; ')
}

function leadCompleto(lead: Lead, contatos: Contato[]) {
  const { auditoria, ...campos } = lead
  const doLead = contatos.filter((c) => c.lead_id === lead.id)
  return {
    ...auditoria,
    ...campos,
    historico: historicoTexto(doLead),
    contatos: doLead
      .slice()
      .sort((a, b) => Date.parse(a.em) - Date.parse(b.em))
      .map(({ em, canal, enviado, resposta }) => ({ em, canal, enviado, resposta })),
  }
}

export function exportaJson(leads: Lead[], contatos: Contato[]): string {
  return JSON.stringify(
    {
      versao: 2,
      exportado_em: new Date().toISOString(),
      leads: leads.map((l) => leadCompleto(l, contatos)),
    },
    null,
    1,
  )
}

// Mesmas colunas do CSV original do Deivid + os campos novos no final,
// para a planilha antiga continuar abrindo sem susto.
const COLUNAS_CSV = [
  'id', 'nome', 'segmento', 'cat', 'endereco', 'telefone', 'cnpj', 'site',
  'estado', 'veredito', 'tier', 'score', 'canal_status', 'estagio', 'historico',
  'instagram', 'facebook', 'cms', 'copyright_ano', 'problemas', 'acao', 'motivo',
  'evidencia', 'confianca', 'verificacao', 'valor_estimado', 'perda_motivo',
  'followup_em', 'followup_nota',
]

function celula(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = Array.isArray(v) ? v.join('; ') : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function exportaCsv(leads: Lead[], contatos: Contato[]): string {
  const linhas = [COLUNAS_CSV.join(',')]
  for (const lead of leads) {
    const completo = leadCompleto(lead, contatos) as Record<string, unknown>
    linhas.push(COLUNAS_CSV.map((c) => celula(completo[c])).join(','))
  }
  return linhas.join('\r\n')
}

export function baixaArquivo(nome: string, conteudo: string, tipo: string) {
  // BOM só no CSV, para o Excel abrir acentos direito; em JSON o BOM quebra o parse.
  const bom = nome.toLowerCase().endsWith('.csv') ? '﻿' : ''
  const blob = new Blob([bom + conteudo], { type: `${tipo};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}
