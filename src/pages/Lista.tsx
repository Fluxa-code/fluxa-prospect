import { useMemo, useState } from 'react'
import { useLeads } from '../hooks/useLeads'
import type { Lead } from '../lib/types'
import {
  CANAL_STATUS_LABEL,
  CANAL_STATUS_VALUES,
  ESTAGIO_LABEL,
  ESTAGIO_VALUES,
  TIER_VALUES,
  VERIFICACAO_LABEL,
} from '../lib/types'
import { LeadCard } from '../components/LeadCard'
import { CanalSheet } from '../components/CanalSheet'
import { BottomSheet } from '../components/BottomSheet'
import { combinaBusca } from '../lib/format'

type Grupo = 'tier' | 'estagio' | 'canal' | 'cat' | 'verificacao'

const GRUPO_TITULO: Record<Grupo, string> = {
  tier: 'Tier',
  estagio: 'Estágio',
  canal: 'Canal',
  cat: 'Categoria',
  verificacao: 'Verificação',
}

export function Lista() {
  const { data: leads, isLoading } = useLeads()
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<Record<Grupo, Set<string>>>({
    tier: new Set(),
    estagio: new Set(),
    canal: new Set(),
    cat: new Set(),
    verificacao: new Set(),
  })
  const [sheetAberta, setSheetAberta] = useState<Grupo | null>(null)
  const [canalDe, setCanalDe] = useState<Lead | null>(null)

  const categorias = useMemo(
    () => [...new Set((leads ?? []).map((l) => l.cat).filter(Boolean))].sort(),
    [leads],
  )

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

  const filtrados = useMemo(() => {
    if (!leads) return []
    return leads.filter((l) => {
      if (filtros.tier.size && !filtros.tier.has(l.tier)) return false
      if (filtros.estagio.size && !filtros.estagio.has(l.estagio)) return false
      if (filtros.canal.size && !filtros.canal.has(l.canal_status)) return false
      if (filtros.cat.size && !filtros.cat.has(l.cat)) return false
      if (filtros.verificacao.size && !filtros.verificacao.has(l.verificacao)) return false
      if (busca && !combinaBusca(`${l.nome} ${l.endereco}`, busca)) return false
      return true
    })
  }, [leads, filtros, busca])

  if (isLoading) return <p className="aviso-tela">Carregando…</p>

  const temFiltro = Object.values(filtros).some((s) => s.size > 0) || busca !== ''

  return (
    <div className="pagina">
      <header className="pagina-topo">
        <h2>Leads</h2>
        <span className="sub">
          {filtrados.length} de {leads?.length ?? 0}
        </span>
      </header>

      <input
        className="input busca"
        placeholder="Buscar por nome ou rua…"
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
        {temFiltro && (
          <button
            className="chip limpar"
            onClick={() => {
              setBusca('')
              setFiltros({
                tier: new Set(),
                estagio: new Set(),
                canal: new Set(),
                cat: new Set(),
                verificacao: new Set(),
              })
            }}
          >
            limpar ✕
          </button>
        )}
      </div>

      {filtrados.map((lead) => (
        <LeadCard key={lead.id} lead={lead} onCanal={setCanalDe} />
      ))}
      {filtrados.length === 0 && <p className="vazio">Nenhum lead com esses filtros.</p>}

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
    </div>
  )
}
