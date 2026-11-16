import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MessageCircle, Play, Plus, X } from 'lucide-react'
import { useLeads, useRecuperaDataCriacao, useTodosContatos } from '../hooks/useLeads'
import type { Lead } from '../lib/types'
import {
  CANAL_STATUS_LABEL,
  CANAL_STATUS_VALUES,
  ESTAGIO_LABEL,
  ESTAGIO_VALUES,
  TIER_VALUES,
  VERIFICACAO_LABEL,
} from '../lib/types'
import { CanalSheet } from '../components/CanalSheet'
import { BottomSheet } from '../components/BottomSheet'
import { NovoLeadForm } from '../components/NovoLeadForm'
import { CanalBadge, EstagioBadge, TierBadge, VerificacaoBadge } from '../components/Badges'
import { agrupaPorCriacao, type Ordem } from '../lib/ordem'
import { combinaBusca, dataCurta, linkWhatsapp, moeda } from '../lib/format'

type Grupo = 'tier' | 'estagio' | 'canal' | 'cat' | 'verificacao'

const GRUPO_TITULO: Record<Grupo, string> = {
  tier: 'Tier',
  estagio: 'Estágio',
  canal: 'Canal',
  cat: 'Categoria',
  verificacao: 'Verificação',
}

const CHAVE_ORDEM = 'fluxa-prospect:ordem-lista'

function ordemSalva(): Ordem {
  try {
    return localStorage.getItem(CHAVE_ORDEM) === 'recentes' ? 'recentes' : 'prioridade'
  } catch {
    return 'prioridade'
  }
}

/** Uma linha da tabela no computador; vira cartão no celular (ver CSS). */
function Linha({
  lead,
  ultimoContato,
  onCanal,
}: {
  lead: Lead
  ultimoContato?: string
  onCanal: (l: Lead) => void
}) {
  const navigate = useNavigate()
  const wa = linkWhatsapp(lead.telefone)
  const temWhats =
    wa !== null && lead.canal_status !== 'fixo_sem_whatsapp' && lead.canal_status !== 'whatsapp_bot'

  return (
    <div className="linha-lead" onClick={() => navigate(`/lead/${lead.id}`)}>
      <div className="col-nome">
        <strong>{lead.nome}</strong>
        <span className="sub">{[lead.segmento, lead.endereco].filter(Boolean).join(' · ')}</span>
      </div>

      <div className="col-estado">
        <span className="sub">{lead.estado || '—'}</span>
        <VerificacaoBadge verificacao={lead.verificacao} />
      </div>

      <div className="col-canal" onClick={(e) => e.stopPropagation()}>
        <CanalBadge status={lead.canal_status} onClick={() => onCanal(lead)} />
      </div>

      <div className="col-estagio">
        <EstagioBadge estagio={lead.estagio} />
        {lead.valor_estimado ? (
          <span className="cartao-valor">{moeda(lead.valor_estimado)}</span>
        ) : null}
      </div>

      <div className="col-quando">
        {lead.followup_em ? (
          <span className="sub">↩ {dataCurta(lead.followup_em)}</span>
        ) : ultimoContato ? (
          <span className="sub">{dataCurta(ultimoContato)}</span>
        ) : (
          <span className="sub">—</span>
        )}
      </div>

      <div className="col-tier">
        <TierBadge tier={lead.tier} score={lead.score} />
      </div>

      <div className="col-acoes" onClick={(e) => e.stopPropagation()}>
        {temWhats && (
          <a
            className="icone-btn whats"
            href={wa!}
            target="_blank"
            rel="noreferrer"
            title="Abrir WhatsApp"
          >
            <MessageCircle size={15} />
          </a>
        )}
      </div>
    </div>
  )
}

export function Lista() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: leads, isLoading } = useLeads()
  const { data: contatos } = useTodosContatos()
  const recupera = useRecuperaDataCriacao()

  const [ordem, setOrdem] = useState<Ordem>(() =>
    params.get('ordem') === 'recentes' ? 'recentes' : ordemSalva(),
  )
  const jaTentouRecuperar = useRef(false)
  const [busca, setBusca] = useState(params.get('q') ?? '')
  const [filtros, setFiltros] = useState<Record<Grupo, Set<string>>>({
    tier: new Set(),
    estagio: new Set(),
    canal: new Set(),
    cat: new Set(),
    verificacao: new Set(),
  })
  const [sheetAberta, setSheetAberta] = useState<Grupo | null>(null)
  const [canalDe, setCanalDe] = useState<Lead | null>(null)
  const [novoAberto, setNovoAberto] = useState(false)

  // a busca da barra de cima chega por ?q=
  useEffect(() => {
    const q = params.get('q')
    if (q !== null) setBusca(q)
  }, [params])

  const categorias = useMemo(
    () => [...new Set((leads ?? []).map((l) => l.cat).filter(Boolean))].sort(),
    [leads],
  )

  /** data do contato mais recente de cada lead, para a coluna "quando" */
  const ultimoPorLead = useMemo(() => {
    const m = new Map<number, string>()
    for (const c of contatos ?? []) {
      const atual = m.get(c.lead_id)
      if (!atual || c.em > atual) m.set(c.lead_id, c.em)
    }
    return m
  }, [contatos])

  const opcoes: Record<Grupo, { valor: string; rotulo: string }[]> = {
    tier: TIER_VALUES.map((t) => ({ valor: t, rotulo: `Tier ${t}` })),
    estagio: ESTAGIO_VALUES.map((e) => ({ valor: e, rotulo: ESTAGIO_LABEL[e] })),
    canal: CANAL_STATUS_VALUES.map((c) => ({ valor: c, rotulo: CANAL_STATUS_LABEL[c] })),
    cat: categorias.map((c) => ({ valor: c, rotulo: c })),
    verificacao: (['completa', 'parcial', 'nao_informado'] as const).map((v) => ({
      valor: v,
      rotulo: VERIFICACAO_LABEL[v],
    })),
  }

  function alterna(grupo: Grupo, valor: string) {
    setFiltros((atual) => {
      const novo = new Set(atual[grupo])
      if (novo.has(valor)) novo.delete(valor)
      else novo.add(valor)
      return { ...atual, [grupo]: novo }
    })
  }

  function limpaTudo() {
    setBusca('')
    setParams({})
    setFiltros({
      tier: new Set(),
      estagio: new Set(),
      canal: new Set(),
      cat: new Set(),
      verificacao: new Set(),
    })
  }

  const filtrados = useMemo(() => {
    if (!leads) return []
    return leads.filter((l) => {
      if (filtros.tier.size && !filtros.tier.has(l.tier)) return false
      if (filtros.estagio.size && !filtros.estagio.has(l.estagio)) return false
      if (filtros.canal.size && !filtros.canal.has(l.canal_status)) return false
      if (filtros.cat.size && !filtros.cat.has(l.cat)) return false
      if (filtros.verificacao.size && !filtros.verificacao.has(l.verificacao)) return false
      if (busca && !combinaBusca(`${l.nome} ${l.endereco} ${l.segmento}`, busca)) return false
      return true
    })
  }, [leads, filtros, busca])

  const grupos = useMemo(
    () => (ordem === 'recentes' ? agrupaPorCriacao(filtrados) : []),
    [ordem, filtrados],
  )

  useEffect(() => {
    if (ordem !== 'recentes' || !leads || jaTentouRecuperar.current) return
    const semData = leads.filter((l) => !l.criado_em).map((l) => l.id)
    if (semData.length === 0) return
    jaTentouRecuperar.current = true
    recupera.mutate(semData, {
      onError: (e) => console.warn('Não deu pra recuperar a data de inserção:', e),
    })
  }, [ordem, leads, recupera])

  function trocaOrdem(nova: Ordem) {
    setOrdem(nova)
    try {
      localStorage.setItem(CHAVE_ORDEM, nova)
    } catch {
      // navegador bloqueando storage: a ordem só não fica lembrada
    }
  }

  if (isLoading) return <p className="aviso-tela">Carregando…</p>

  const ativos: { grupo: Grupo; valor: string; rotulo: string }[] = []
  for (const g of Object.keys(filtros) as Grupo[]) {
    for (const v of filtros[g]) {
      ativos.push({
        grupo: g,
        valor: v,
        rotulo: opcoes[g].find((o) => o.valor === v)?.rotulo ?? v,
      })
    }
  }
  const temFiltro = ativos.length > 0 || busca !== ''

  const cabecalho = (
    <div className="linha-lead cabecalho-tabela">
      <span className="col-nome">Lead</span>
      <span className="col-estado">Presença digital</span>
      <span className="col-canal">Canal</span>
      <span className="col-estagio">Estágio</span>
      <span className="col-quando">Retorno / último</span>
      <span className="col-tier">Tier</span>
      <span className="col-acoes" />
    </div>
  )

  return (
    <div className="pagina pagina-larga">
      <header className="cabecalho-pagina">
        <div>
          <h2>Leads</h2>
          <span className="sub">
            {filtrados.length} de {leads?.length ?? 0}
            {temFiltro ? ' (filtrados)' : ''}
          </span>
        </div>
        <div className="topo-acoes">
          <button
            className="btn btn-ghost btn-novo"
            title="Abordar em série os não contatados deste filtro"
            onClick={() => {
              const p = new URLSearchParams()
              if (filtros.tier.size) p.set('tier', [...filtros.tier].join(','))
              if (filtros.cat.size) p.set('cat', [...filtros.cat].join(','))
              navigate(`/rodada${p.toString() ? `?${p}` : ''}`)
            }}
          >
            <Play size={15} /> Rodada
          </button>
          <button className="btn btn-gold btn-novo" onClick={() => setNovoAberto(true)}>
            <Plus size={16} /> Novo
          </button>
        </div>
      </header>

      <div className="barra-filtros">
        <input
          className="input busca"
          placeholder="Buscar por nome, rua ou segmento…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="chips-row filtros">
          {(Object.keys(GRUPO_TITULO) as Grupo[]).map((g) => (
            <button
              key={g}
              className={`chip ${filtros[g].size ? 'ativa' : ''}`}
              onClick={() => setSheetAberta(g)}
            >
              {GRUPO_TITULO[g]}
              {filtros[g].size > 0 && ` (${filtros[g].size})`} ▾
            </button>
          ))}
          <span className="separador-vertical" />
          <button
            className={`chip ${ordem === 'prioridade' ? 'ativa' : ''}`}
            onClick={() => trocaOrdem('prioridade')}
          >
            Prioridade
          </button>
          <button
            className={`chip ${ordem === 'recentes' ? 'ativa' : ''}`}
            onClick={() => trocaOrdem('recentes')}
          >
            Mais recentes
          </button>
          {recupera.isPending && <span className="sub">buscando datas…</span>}
        </div>

        {temFiltro && (
          <div className="chips-row filtros-ativos">
            {busca && (
              <button className="chip ativa" onClick={() => setBusca('')}>
                "{busca}" <X size={12} />
              </button>
            )}
            {ativos.map((a) => (
              <button
                key={`${a.grupo}-${a.valor}`}
                className="chip ativa"
                onClick={() => alterna(a.grupo, a.valor)}
              >
                {a.rotulo} <X size={12} />
              </button>
            ))}
            <button className="chip limpar" onClick={limpaTudo}>
              limpar tudo
            </button>
          </div>
        )}
      </div>

      {filtrados.length === 0 && <p className="vazio">Nenhum lead com esses filtros.</p>}

      {ordem === 'prioridade' && filtrados.length > 0 && (
        <div className="tabela-leads">
          {cabecalho}
          {filtrados.map((lead) => (
            <Linha
              key={lead.id}
              lead={lead}
              ultimoContato={ultimoPorLead.get(lead.id)}
              onCanal={setCanalDe}
            />
          ))}
        </div>
      )}

      {ordem === 'recentes' &&
        grupos.map((g) => (
          <section key={g.chave}>
            <h3 className="secao">
              {g.rotulo} · {g.leads.length} lead{g.leads.length === 1 ? '' : 's'}
            </h3>
            <div className="tabela-leads">
              {cabecalho}
              {g.leads.map((lead) => (
                <Linha
                  key={lead.id}
                  lead={lead}
                  ultimoContato={ultimoPorLead.get(lead.id)}
                  onCanal={setCanalDe}
                />
              ))}
            </div>
          </section>
        ))}

      <BottomSheet
        aberto={sheetAberta !== null}
        titulo={sheetAberta ? `Filtrar por ${GRUPO_TITULO[sheetAberta]}` : ''}
        onFechar={() => setSheetAberta(null)}
      >
        {sheetAberta && (
          <div className="sheet-opcoes">
            {opcoes[sheetAberta].map(({ valor, rotulo }) => (
              <button
                key={valor}
                className={`opcao ${filtros[sheetAberta].has(valor) ? 'ativa' : ''}`}
                onClick={() => alterna(sheetAberta, valor)}
              >
                {rotulo}
                {filtros[sheetAberta].has(valor) && ' ✓'}
              </button>
            ))}
          </div>
        )}
      </BottomSheet>

      <CanalSheet lead={canalDe} onFechar={() => setCanalDe(null)} />

      <BottomSheet aberto={novoAberto} titulo="Novo lead" onFechar={() => setNovoAberto(false)}>
        <NovoLeadForm categorias={categorias} onFechar={() => setNovoAberto(false)} />
      </BottomSheet>
    </div>
  )
}
