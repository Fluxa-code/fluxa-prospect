// Domínio do Fluxa Prospect — enums validados com o Deivid em 2026-08-31.

export type CanalStatus =
  | 'nao_testado'
  | 'whatsapp_ok'
  | 'fixo_sem_whatsapp'
  | 'whatsapp_bot'
  | 'perfil_inexistente'
  | 'sem_contato'

export type Estagio =
  | 'nao_contatado'
  | 'contatado'
  | 'respondeu'
  | 'negociacao'
  | 'fechado'
  | 'perdido'

export type Verificacao = 'completa' | 'parcial' | 'nao_informado'

export type CanalContato =
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'telefone'
  | 'email'
  | 'presencial'
  | 'outro'

export interface Lead {
  id: number
  nome: string
  segmento: string
  cat: string
  endereco: string
  telefone: string
  cnpj: string
  site: string
  estado: string
  veredito: string
  tier: string
  score: number
  cms: string
  instagram: string
  facebook: string
  confianca: string
  verificacao: Verificacao
  canal_status: CanalStatus
  estagio: Estagio
  valor_estimado: number | null
  perda_motivo: string
  followup_em: string | null
  followup_nota: string
  auditoria: Record<string, unknown>
  atualizado_em: string
}

export interface Contato {
  id: string
  lead_id: number
  em: string
  canal: CanalContato
  enviado: string
  resposta: string
}

export type ContatoSeed = Omit<Contato, 'id'>

export const CANAL_STATUS_VALUES: CanalStatus[] = [
  'nao_testado',
  'whatsapp_ok',
  'fixo_sem_whatsapp',
  'whatsapp_bot',
  'perfil_inexistente',
  'sem_contato',
]

export const CANAL_STATUS_LABEL: Record<CanalStatus, string> = {
  nao_testado: 'Não testado',
  whatsapp_ok: 'WhatsApp ok',
  fixo_sem_whatsapp: 'Fixo sem WhatsApp',
  whatsapp_bot: 'Cai em bot',
  perfil_inexistente: 'Perfil inexistente',
  sem_contato: 'Sem contato',
}

export const ESTAGIO_VALUES: Estagio[] = [
  'nao_contatado',
  'contatado',
  'respondeu',
  'negociacao',
  'fechado',
  'perdido',
]

export const ESTAGIO_LABEL: Record<Estagio, string> = {
  nao_contatado: 'Não contatado',
  contatado: 'Contatado',
  respondeu: 'Respondeu',
  negociacao: 'Em negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
}

export const VERIFICACAO_LABEL: Record<Verificacao, string> = {
  completa: 'Verificação completa',
  parcial: 'Verificação parcial',
  nao_informado: 'Verificação não informada',
}

export const CANAL_CONTATO_VALUES: CanalContato[] = [
  'whatsapp',
  'instagram',
  'facebook',
  'telefone',
  'email',
  'presencial',
  'outro',
]

export const CANAL_CONTATO_LABEL: Record<CanalContato, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  telefone: 'Telefone',
  email: 'E-mail',
  presencial: 'Presencial',
  outro: 'Outro',
}

export const TIER_VALUES = ['A', 'B', 'C', 'D'] as const
