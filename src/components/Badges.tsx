import type { CanalStatus, Estagio, Lead, Verificacao } from '../lib/types'
import { CANAL_STATUS_LABEL, ESTAGIO_LABEL } from '../lib/types'

export function TierBadge({ tier, score }: { tier: string; score?: number }) {
  return (
    <span className={`badge tier-${tier}`}>
      {tier}
      {score !== undefined && <em>{score}</em>}
    </span>
  )
}

const COR_ESTAGIO: Record<Estagio, string> = {
  nao_contatado: 'cinza',
  contatado: 'azul',
  respondeu: 'gold',
  negociacao: 'gold',
  fechado: 'verde',
  perdido: 'vermelho',
}

export function EstagioBadge({ estagio }: { estagio: Estagio }) {
  return <span className={`badge cor-${COR_ESTAGIO[estagio]}`}>{ESTAGIO_LABEL[estagio]}</span>
}

const COR_CANAL: Record<CanalStatus, string> = {
  nao_testado: 'cinza',
  whatsapp_ok: 'verde',
  fixo_sem_whatsapp: 'laranja',
  whatsapp_bot: 'laranja',
  perfil_inexistente: 'vermelho',
  sem_contato: 'vermelho',
}

export function CanalBadge({
  status,
  onClick,
}: {
  status: CanalStatus
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className={`badge badge-btn cor-${COR_CANAL[status]}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
    >
      {CANAL_STATUS_LABEL[status]} ▾
    </button>
  )
}

export function VerificacaoBadge({ verificacao }: { verificacao: Verificacao }) {
  if (verificacao === 'completa') return null
  if (verificacao === 'parcial') return <span className="badge cor-laranja">⚠ parcial</span>
  return <span className="badge cor-cinza">? não informado</span>
}

export function ConfiancaDot({ confianca }: { confianca: string }) {
  if (!confianca) return null
  const cor = confianca === 'alta' ? 'verde' : confianca === 'media' ? 'gold' : 'vermelho'
  return (
    <span className={`dot-wrap`} title={`Confiança ${confianca}`}>
      <span className={`dot dot-${cor}`} /> {confianca}
    </span>
  )
}

export function BadgesDoLead({ lead, onCanal }: { lead: Lead; onCanal?: () => void }) {
  return (
    <div className="badges">
      <TierBadge tier={lead.tier} score={lead.score} />
      <EstagioBadge estagio={lead.estagio} />
      <CanalBadge status={lead.canal_status} onClick={onCanal} />
      <VerificacaoBadge verificacao={lead.verificacao} />
      <ConfiancaDot confianca={lead.confianca} />
    </div>
  )
}
