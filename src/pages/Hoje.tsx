import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, MessageSquare, Play, Target, Wallet } from 'lucide-react'
import { useAtualizaLead, useLeads, useTodosContatos } from '../hooks/useLeads'
import type { Lead } from '../lib/types'
import { CANAL_CONTATO_LABEL, ESTAGIOS_ENCERRADOS } from '../lib/types'
import { LeadCard } from '../components/LeadCard'
import { CanalSheet } from '../components/CanalSheet'
import { Tile } from '../components/Tile'
import { dataCurta, dataHora, diasAtraso, hojeIso, moeda, somaDias } from '../lib/format'

function saudacao() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function Hoje() {
  const { data: leads, isLoading } = useLeads()
  const { data: contatos } = useTodosContatos()
  const atualiza = useAtualizaLead()
  const navigate = useNavigate()
  const [canalDe, setCanalDe] = useState<Lead | null>(null)

  if (isLoading) return <p className="aviso-tela">Carregando…</p>
  if (!leads) return null

  const hoje = hojeIso()
  const followups = leads
    .filter(
      (l) => l.followup_em && l.followup_em <= hoje && !ESTAGIOS_ENCERRADOS.includes(l.estagio),
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

  const aguardando = leads.filter((l) => l.estagio === 'respondeu').length
  const pipeline = leads
    .filter((l) => l.estagio === 'negociacao')
    .reduce((s, l) => s + (l.valor_estimado ?? 0), 0)

  const recentes = (contatos ?? [])
    .slice()
    .sort((a, b) => Date.parse(b.em) - Date.parse(a.em))
    .slice(0, 6)

  const nomeDoLead = (id: number) => leads.find((l) => l.id === id)?.nome ?? `lead ${id}`

  return (
    <div className="pagina pagina-larga">
      <header className="cabecalho-pagina">
        <div>
          <h2>{saudacao()}!</h2>
          <span className="sub">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}{' '}
            · seu resumo de prospecção
          </span>
        </div>
        {prioritarios.length > 0 && (
          <button className="btn btn-gold" onClick={() => navigate('/rodada?tier=A,B')}>
            <Play size={16} /> Iniciar rodada
          </button>
        )}
      </header>

      <div className="grade-tiles">
        <Tile
          rotulo="Follow-ups de hoje"
          valor={followups.length}
          nota={followups.length ? 'precisam de retorno' : 'nada vencido'}
          icone={<CalendarClock size={18} />}
          cor={followups.length ? 'laranja' : 'verde'}
        />
        <Tile
          rotulo="Prioritários livres"
          valor={prioritarios.length}
          nota="tier A e B sem contato"
          icone={<Target size={18} />}
        />
        <Tile
          rotulo="Aguardando você"
          valor={aguardando}
          nota="responderam e não avançaram"
          icone={<MessageSquare size={18} />}
          cor="azul"
        />
        <Tile
          rotulo="Em negociação"
          valor={moeda(pipeline) || 'R$ 0'}
          nota="valor estimado no funil"
          icone={<Wallet size={18} />}
          cor="verde"
        />
      </div>

      <div className="duas-colunas">
        <section>
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

          <h3 className="secao">Prioritários ainda não tocados</h3>
          {prioritarios.length === 0 && (
            <p className="vazio">Todos os A/B viáveis já foram tocados.</p>
          )}
          {prioritarios.slice(0, 5).map((lead) => (
            <LeadCard key={lead.id} lead={lead} onCanal={setCanalDe} />
          ))}
          {prioritarios.length > 5 && (
            <button className="btn btn-ghost largo" onClick={() => navigate('/rodada?tier=A,B')}>
              <Play size={15} /> Abordar os {prioritarios.length} em série
            </button>
          )}
        </section>

        <aside>
          <h3 className="secao">Atividade recente</h3>
          <div className="card lista-atividade">
            {recentes.length === 0 && <p className="vazio">Nada registrado ainda.</p>}
            {recentes.map((c) => (
              <button
                key={c.id}
                className="atividade"
                onClick={() => navigate(`/lead/${c.lead_id}`)}
              >
                <span className={`atividade-ponto ${c.resposta ? 'respondeu' : ''}`} />
                <span className="atividade-texto">
                  <strong>{nomeDoLead(c.lead_id)}</strong>
                  <span className="sub">
                    {c.resposta ? 'respondeu' : 'contato enviado'} · {CANAL_CONTATO_LABEL[c.canal]}
                  </span>
                </span>
                <span className="atividade-hora">{dataHora(c.em).slice(0, 8)}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <CanalSheet lead={canalDe} onFechar={() => setCanalDe(null)} />
    </div>
  )
}
