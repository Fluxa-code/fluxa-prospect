import { useState } from 'react'
import { useAtualizaLead, useLeads } from '../hooks/useLeads'
import type { Lead } from '../lib/types'
import { LeadCard } from '../components/LeadCard'
import { CanalSheet } from '../components/CanalSheet'
import { dataCurta, diasAtraso, hojeIso, somaDias } from '../lib/format'

export function Hoje() {
  const { data: leads, isLoading } = useLeads()
  const atualiza = useAtualizaLead()
  const [canalDe, setCanalDe] = useState<Lead | null>(null)

  if (isLoading) return <p className="aviso-tela">Carregando…</p>
  if (!leads) return null

  const hoje = hojeIso()
  const followups = leads
    .filter(
      (l) =>
        l.followup_em &&
        l.followup_em <= hoje &&
        l.estagio !== 'fechado' &&
        l.estagio !== 'perdido',
    )
    .sort((a, b) => (a.followup_em! < b.followup_em! ? -1 : 1))

  const prioritarios = leads
    .filter(
      (l) =>
        (l.tier === 'A' || l.tier === 'B') &&
        l.estagio === 'nao_contatado' &&
        l.canal_status !== 'sem_contato' &&
        l.canal_status !== 'perfil_inexistente',
    )
    .sort((a, b) => b.score - a.score)

  return (
    <div className="pagina">
      <header className="pagina-topo">
        <div>
          <h2>Hoje</h2>
          <span className="sub">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </span>
        </div>
        <span className="sub">
          {followups.length} follow-up{followups.length === 1 ? '' : 's'} ·{' '}
          {prioritarios.length} prioritários
        </span>
      </header>

      <h3 className="secao">Follow-ups vencidos e do dia</h3>
      {followups.length === 0 && <p className="vazio">Nenhum follow-up pendente. 🎉</p>}
      {followups.map((lead) => {
        const atraso = diasAtraso(lead.followup_em!)
        return (
          <LeadCard key={lead.id} lead={lead} onCanal={setCanalDe}>
            <div className="followup-info">
              <span className={atraso > 0 ? 'atrasado' : ''}>
                {atraso > 0
                  ? `venceu há ${atraso} dia${atraso === 1 ? '' : 's'} (${dataCurta(lead.followup_em)})`
                  : 'para hoje'}
                {lead.followup_nota && ` — ${lead.followup_nota}`}
              </span>
              <div className="acoes-linha" onClick={(e) => e.stopPropagation()}>
                <button
                  className="chip"
                  onClick={() =>
                    atualiza.mutate({ id: lead.id, patch: { followup_em: somaDias(hoje, 2) } })
                  }
                >
                  adiar +2d
                </button>
                <button
                  className="chip"
                  onClick={() =>
                    atualiza.mutate({ id: lead.id, patch: { followup_em: somaDias(hoje, 7) } })
                  }
                >
                  +7d
                </button>
                <button
                  className="chip"
                  onClick={() =>
                    atualiza.mutate({
                      id: lead.id,
                      patch: { followup_em: null, followup_nota: '' },
                    })
                  }
                >
                  concluir ✓
                </button>
              </div>
            </div>
          </LeadCard>
        )
      })}

      <h3 className="secao">Prioritários ainda não tocados (tier A/B)</h3>
      {prioritarios.length === 0 && <p className="vazio">Todos os A/B viáveis já foram tocados.</p>}
      {prioritarios.map((lead) => (
        <LeadCard key={lead.id} lead={lead} onCanal={setCanalDe} />
      ))}

      <CanalSheet lead={canalDe} onFechar={() => setCanalDe(null)} />
    </div>
  )
}
