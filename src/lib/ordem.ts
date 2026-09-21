import type { Lead } from './types'

export type Ordem = 'prioridade' | 'recentes'

/** Lead sem data vai pro fim; empate (mesmo lote) fica em ordem de id, do maior pro menor. */
function momentoCriacao(l: Lead): number {
  const t = l.criado_em ? Date.parse(l.criado_em) : NaN
  return Number.isFinite(t) ? t : -Infinity
}

export function ordenaPorCriacao(leads: Lead[]): Lead[] {
  return leads.slice().sort((a, b) => momentoCriacao(b) - momentoCriacao(a) || b.id - a.id)
}

function diaLocal(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function rotuloDia(t: number): string {
  const hoje = Date.now()
  if (diaLocal(t) === diaLocal(hoje)) return 'Hoje'
  if (diaLocal(t) === diaLocal(hoje - 86_400_000)) return 'Ontem'
  return new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export interface GrupoCriacao {
  chave: string
  rotulo: string
  leads: Lead[]
}

/** Agrupa por dia de inserção, mais recente primeiro — cada lote importado vira um bloco. */
export function agrupaPorCriacao(leads: Lead[]): GrupoCriacao[] {
  const grupos: GrupoCriacao[] = []
  for (const lead of ordenaPorCriacao(leads)) {
    const t = momentoCriacao(lead)
    const chave = Number.isFinite(t) ? diaLocal(t) : 'sem-data'
    let grupo = grupos[grupos.length - 1]
    if (!grupo || grupo.chave !== chave) {
      grupo = { chave, rotulo: Number.isFinite(t) ? rotuloDia(t) : 'Sem data de inserção', leads: [] }
      grupos.push(grupo)
    }
    grupo.leads.push(lead)
  }
  return grupos
}
