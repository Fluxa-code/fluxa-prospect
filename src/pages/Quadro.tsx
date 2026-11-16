import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoveHorizontal } from 'lucide-react'
import { useAtualizaLead, useLeads } from '../hooks/useLeads'
import type { Estagio, Lead } from '../lib/types'
import { ESTAGIO_LABEL, ESTAGIO_VALUES } from '../lib/types'
import { BottomSheet } from '../components/BottomSheet'
import { moeda } from '../lib/format'

/** Estágios que somam dinheiro na coluna. */
const COM_VALOR: Estagio[] = ['negociacao', 'fechado']

const COR_COLUNA: Record<Estagio, string> = {
  nao_contatado: 'cinza',
  contatado: 'azul',
  respondeu: 'gold',
  negociacao: 'gold',
  fechado: 'verde',
  recusado: 'vermelho',
  perdido: 'vermelho',
}

export function Quadro() {
  const navigate = useNavigate()
  const { data: leads, isLoading } = useLeads()
  const atualiza = useAtualizaLead()

  const [arrastando, setArrastando] = useState<number | null>(null)
  const [alvo, setAlvo] = useState<Estagio | null>(null)
  const [mover, setMover] = useState<Lead | null>(null)
  const [busca, setBusca] = useState('')

  const colunas = useMemo(() => {
    const porEstagio = {} as Record<Estagio, Lead[]>
    for (const e of ESTAGIO_VALUES) porEstagio[e] = []
    for (const l of leads ?? []) {
      if (busca && !l.nome.toLowerCase().includes(busca.toLowerCase())) continue
      porEstagio[l.estagio]?.push(l)
    }
    for (const e of ESTAGIO_VALUES) porEstagio[e].sort((a, b) => b.score - a.score)
    return porEstagio
  }, [leads, busca])

  if (isLoading) return <p className="aviso-tela">Carregando…</p>

  function move(lead: Lead, estagio: Estagio) {
    if (lead.estagio === estagio) return
    atualiza.mutate({ id: lead.id, patch: { estagio } })
  }

  return (
    <div className="pagina pagina-cheia">
      <header className="cabecalho-pagina">
        <div>
          <h2>Quadro do funil</h2>
          <span className="sub">
            No computador, arraste o cartão entre as colunas. No celular, toque na seta.
          </span>
        </div>
        <input
          className="input busca-quadro"
          placeholder="Filtrar por nome…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </header>

      <div className="quadro">
        {ESTAGIO_VALUES.map((estagio) => {
          const lista = colunas[estagio]
          const soma = lista.reduce((s, l) => s + (l.valor_estimado ?? 0), 0)
          return (
            <section
              key={estagio}
              className={`coluna ${alvo === estagio ? 'coluna-alvo' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setAlvo(estagio)
              }}
              onDragLeave={() => setAlvo((a) => (a === estagio ? null : a))}
              onDrop={() => {
                const lead = (leads ?? []).find((l) => l.id === arrastando)
                if (lead) move(lead, estagio)
                setArrastando(null)
                setAlvo(null)
              }}
            >
              <header className="coluna-topo">
                <span className={`coluna-marca cor-${COR_COLUNA[estagio]}`} />
                <strong>{ESTAGIO_LABEL[estagio]}</strong>
                <span className="coluna-conta">{lista.length}</span>
              </header>
              {COM_VALOR.includes(estagio) && soma > 0 && (
                <span className="coluna-soma">{moeda(soma)}</span>
              )}

              <div className="coluna-cartoes">
                {lista.length === 0 && <p className="coluna-vazia">vazio</p>}
                {lista.map((lead) => (
                  <article
                    key={lead.id}
                    className={`cartao ${arrastando === lead.id ? 'arrastando' : ''}`}
                    draggable
                    onDragStart={() => setArrastando(lead.id)}
                    onDragEnd={() => {
                      setArrastando(null)
                      setAlvo(null)
                    }}
                    onClick={() => navigate(`/lead/${lead.id}`)}
                  >
                    <div className="cartao-topo">
                      <strong>{lead.nome}</strong>
                      <button
                        className="icone-btn mover"
                        title="Mover para outro estágio"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMover(lead)
                        }}
                      >
                        <MoveHorizontal size={14} />
                      </button>
                    </div>
                    <span className="sub">{lead.segmento || lead.cat}</span>
                    <div className="cartao-rodape">
                      <span className={`badge tier-${lead.tier}`}>{lead.tier}</span>
                      {lead.valor_estimado ? (
                        <span className="cartao-valor">{moeda(lead.valor_estimado)}</span>
                      ) : null}
                      {lead.followup_em && <span className="sub">↩ {lead.followup_em.slice(5)}</span>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <BottomSheet
        aberto={mover !== null}
        titulo={mover ? `Mover ${mover.nome} para…` : ''}
        onFechar={() => setMover(null)}
      >
        <div className="sheet-opcoes">
          {ESTAGIO_VALUES.map((e) => (
            <button
              key={e}
              className={`opcao ${mover?.estagio === e ? 'ativa' : ''}`}
              onClick={() => {
                if (mover) move(mover, e)
                setMover(null)
              }}
            >
              {ESTAGIO_LABEL[e]}
              {mover?.estagio === e && ' ✓'}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}
