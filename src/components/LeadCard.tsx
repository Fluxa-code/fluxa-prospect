import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Lead } from '../lib/types'
import { BadgesDoLead } from './Badges'

export function LeadCard({
  lead,
  onCanal,
  children,
}: {
  lead: Lead
  onCanal?: (lead: Lead) => void
  children?: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <div className="card lead-card" onClick={() => navigate(`/lead/${lead.id}`)}>
      <div className="lead-card-topo">
        <strong>{lead.nome}</strong>
        <span className="sub">
          {[lead.segmento, lead.endereco].filter(Boolean).join(' · ')}
        </span>
      </div>
      <BadgesDoLead lead={lead} onCanal={onCanal ? () => onCanal(lead) : undefined} />
      {children}
    </div>
  )
}
