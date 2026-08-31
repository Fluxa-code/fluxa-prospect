import { useLeads, useTodosContatos } from '../hooks/useLeads'
import {
  CANAL_CONTATO_LABEL,
  CANAL_STATUS_LABEL,
  CANAL_STATUS_VALUES,
  ESTAGIO_LABEL,
  ESTAGIO_VALUES,
} from '../lib/types'
import type { CanalContato } from '../lib/types'
import { moeda } from '../lib/format'

export function Funil() {
  const { data: leads, isLoading } = useLeads()
  const { data: contatos } = useTodosContatos()

  if (isLoading) return <p className="aviso-tela">Carregando…</p>
  if (!leads) return null

  const porEstagio = ESTAGIO_VALUES.map((e) => ({
    estagio: e,
    qtd: leads.filter((l) => l.estagio === e).length,
  }))
  const maxEstagio = Math.max(1, ...porEstagio.map((p) => p.qtd))

  const contatados = leads.filter((l) => l.estagio !== 'nao_contatado').length
  const responderam = leads.filter((l) =>
    ['respondeu', 'negociacao', 'fechado'].includes(l.estagio),
  ).length
  const taxa = contatados > 0 ? Math.round((responderam / contatados) * 100) : 0

  const pipeline = leads
    .filter((l) => l.estagio === 'negociacao')
    .reduce((s, l) => s + (l.valor_estimado ?? 0), 0)
  const fechado = leads
    .filter((l) => l.estagio === 'fechado')
    .reduce((s, l) => s + (l.valor_estimado ?? 0), 0)

  const porCanalTeste = CANAL_STATUS_VALUES.map((c) => ({
    canal: c,
    qtd: leads.filter((l) => l.canal_status === c).length,
  })).filter((p) => p.qtd > 0)

  const canaisUsados = [...new Set((contatos ?? []).map((c) => c.canal))] as CanalContato[]
  const respostaPorCanal = canaisUsados
    .map((canal) => {
      const doCanal = (contatos ?? []).filter((c) => c.canal === canal)
      const comResposta = doCanal.filter((c) => c.resposta !== '').length
      return { canal, enviados: doCanal.length, respostas: comResposta }
    })
    .sort((a, b) => b.enviados - a.enviados)

  return (
    <div className="pagina">
      <header className="pagina-topo">
        <h2>Funil</h2>
      </header>

      <div className="hero">
        <div className="hero-rotulo">Taxa de resposta</div>
        <div className="hero-valor">{taxa}%</div>
        <div className="hero-contexto">
          {responderam} de {contatados} contatados responderam
        </div>
      </div>

      <div className="cards-numeros">
        <div className="card numero">
          <strong>{leads.length}</strong>
          <span>leads na base</span>
        </div>
        <div className="card numero">
          <strong>{contatados}</strong>
          <span>contatados</span>
        </div>
        <div className="card numero">
          <strong>{moeda(pipeline) || 'R$ 0'}</strong>
          <span>em negociação</span>
        </div>
        <div className="card numero gold-borda">
          <strong>{moeda(fechado) || 'R$ 0'}</strong>
          <span>fechado</span>
        </div>
      </div>

      <h3 className="secao">Estágios</h3>
      <div className="card">
        {porEstagio.map(({ estagio, qtd }) => (
          <div key={estagio} className="barra-linha">
            <span className="barra-rotulo">{ESTAGIO_LABEL[estagio]}</span>
            <div className="barra-trilho">
              <div
                className={`barra ${estagio === 'fechado' ? 'barra-verde' : estagio === 'perdido' ? 'barra-vermelha' : ''}`}
                style={{ width: `${Math.max(2, (qtd / maxEstagio) * 100)}%` }}
              />
            </div>
            <span className="barra-qtd">{qtd}</span>
          </div>
        ))}
      </div>

      <h3 className="secao">Status de canal</h3>
      <div className="card">
        {porCanalTeste.map(({ canal, qtd }) => (
          <div key={canal} className="barra-linha">
            <span className="barra-rotulo">{CANAL_STATUS_LABEL[canal]}</span>
            <div className="barra-trilho">
              <div
                className="barra"
                style={{ width: `${Math.max(2, (qtd / leads.length) * 100)}%` }}
              />
            </div>
            <span className="barra-qtd">{qtd}</span>
          </div>
        ))}
      </div>

      <h3 className="secao">Resposta por canal de contato</h3>
      <div className="card">
        {respostaPorCanal.length === 0 && <p className="vazio">Ainda sem contatos registrados.</p>}
        {respostaPorCanal.map(({ canal, enviados, respostas }) => (
          <div key={canal} className="barra-linha">
            <span className="barra-rotulo">{CANAL_CONTATO_LABEL[canal]}</span>
            <span className="sub">
              {respostas}/{enviados} responderam
              {enviados > 0 && ` (${Math.round((respostas / enviados) * 100)}%)`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
