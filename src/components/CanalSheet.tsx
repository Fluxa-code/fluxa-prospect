import type { Lead } from '../lib/types'
import { CANAL_STATUS_LABEL, CANAL_STATUS_VALUES } from '../lib/types'
import { useAtualizaLead } from '../hooks/useLeads'
import { BottomSheet } from './BottomSheet'

/** Marca o status de canal em um toque — a dor nº 1 do fluxo de rua. */
export function CanalSheet({ lead, onFechar }: { lead: Lead | null; onFechar: () => void }) {
  const atualiza = useAtualizaLead()
  return (
    <BottomSheet
      aberto={lead !== null}
      titulo={lead ? `Canal — ${lead.nome}` : ''}
      onFechar={onFechar}
    >
      <div className="sheet-opcoes">
        {CANAL_STATUS_VALUES.map((valor) => (
          <button
            key={valor}
            type="button"
            className={`opcao ${lead?.canal_status === valor ? 'ativa' : ''}`}
            onClick={() => {
              if (lead) atualiza.mutate({ id: lead.id, patch: { canal_status: valor } })
              onFechar()
            }}
          >
            {CANAL_STATUS_LABEL[valor]}
            {lead?.canal_status === valor && ' ✓'}
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}
