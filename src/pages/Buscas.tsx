import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, Loader2, Search, Trash2, TriangleAlert } from 'lucide-react'
import { useApagaBusca, useBuscas, useCriaBusca } from '../hooks/useBuscas'
import type { StatusBusca, TamanhoBusca } from '../lib/buscas'
import { NICHOS_SUGERIDOS, STATUS_ROTULO, TAMANHOS } from '../lib/buscas'
import { dataHora } from '../lib/format'

const ICONE: Record<StatusBusca, typeof Clock> = {
  na_fila: Clock,
  rodando: Loader2,
  concluida: CheckCircle2,
  erro: TriangleAlert,
}

const COR: Record<StatusBusca, string> = {
  na_fila: 'cinza',
  rodando: 'gold',
  concluida: 'verde',
  erro: 'vermelho',
}

export function Buscas() {
  const navigate = useNavigate()
  const buscas = useBuscas()
  const cria = useCriaBusca()
  const apaga = useApagaBusca()

  const [termos, setTermos] = useState('')
  const [cidade, setCidade] = useState('Guarulhos')
  const [uf, setUf] = useState('SP')
  const [bairro, setBairro] = useState('')
  const [tamanho, setTamanho] = useState<TamanhoBusca>('padrao')
  const [erro, setErro] = useState('')

  const lista = termos
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean)

  async function enviar() {
    if (lista.length === 0) {
      setErro('Escreva pelo menos um nicho, do jeito que um cliente buscaria no Google.')
      return
    }
    if (!cidade.trim()) {
      setErro('Informe a cidade.')
      return
    }
    setErro('')
    try {
      await cria.mutateAsync({
        termos: lista,
        cidade: cidade.trim(),
        uf: uf.trim().toUpperCase(),
        bairro: bairro.trim(),
        tamanho,
      })
      setTermos('')
      setBairro('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui registrar a busca.')
    }
  }

  const rodando = buscas?.some((b) => b.status === 'rodando' || b.status === 'na_fila')

  return (
    <div className="pagina pagina-larga">
      <header className="cabecalho-pagina">
        <div>
          <h2>Buscar leads</h2>
          <span className="sub">
            O pedido entra na fila e o computador de casa executa — você pode fechar o app.
          </span>
        </div>
      </header>

      <div className="duas-colunas">
        <section>
          <div className="card">
            <label className="label">O que você procura?</label>
            <input
              className="input"
              value={termos}
              onChange={(e) => setTermos(e.target.value)}
              placeholder="ex.: restaurantes, food trucks"
            />
            <p className="sub explicacao">
              Pode colocar mais de um, separados por vírgula. Escreva do jeito que um cliente
              buscaria no Google.
            </p>

            <div className="chips-row" style={{ marginTop: 10 }}>
              {NICHOS_SUGERIDOS.slice(0, 10).map((n) => (
                <button
                  key={n}
                  className="chip"
                  onClick={() => setTermos((t) => (t ? `${t}, ${n}` : n))}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="linha-campos">
              <div>
                <label className="label">Cidade</label>
                <input
                  className="input"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </div>
              <div className="campo-uf">
                <label className="label">UF</label>
                <input
                  className="input"
                  value={uf}
                  maxLength={2}
                  onChange={(e) => setUf(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Bairro (opcional)</label>
                <input
                  className="input"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="ex.: Vila Barros"
                />
              </div>
            </div>

            <label className="label">Tamanho da busca</label>
            <div className="grade-tamanhos">
              {(Object.keys(TAMANHOS) as TamanhoBusca[]).map((t) => (
                <button
                  key={t}
                  className={`cartao-tamanho ${tamanho === t ? 'ativo' : ''}`}
                  onClick={() => setTamanho(t)}
                >
                  <strong>{TAMANHOS[t].rotulo}</strong>
                  <span>{TAMANHOS[t].quanto}</span>
                  <small>{TAMANHOS[t].tempo}</small>
                </button>
              ))}
            </div>

            {erro && <p className="erro">{erro}</p>}

            <div className="form-acoes">
              <button className="btn btn-gold" disabled={cria.isPending} onClick={enviar}>
                <Search size={16} /> {cria.isPending ? 'Enviando…' : 'Buscar empresas'}
              </button>
            </div>
            {rodando && (
              <p className="sub explicacao">
                Já existe busca na fila — elas rodam uma de cada vez.
              </p>
            )}
          </div>
        </section>

        <aside>
          <h3 className="secao">Buscas recentes</h3>
          <div className="card lista-atividade">
            {buscas === null && <p className="vazio">Carregando…</p>}
            {buscas?.length === 0 && <p className="vazio">Nenhuma busca ainda.</p>}
            {buscas?.slice(0, 10).map((b) => {
              const Icone = ICONE[b.status]
              return (
                <div key={b.id} className="atividade busca-item">
                  <span className={`tile-icone tile-${COR[b.status]} icone-busca`}>
                    <Icone size={15} className={b.status === 'rodando' ? 'girando' : ''} />
                  </span>
                  <span className="atividade-texto">
                    <strong>{b.termos.join(', ')}</strong>
                    <span className="sub">
                      {[b.bairro, b.cidade, b.uf].filter(Boolean).join(', ')} ·{' '}
                      {TAMANHOS[b.tamanho]?.rotulo ?? b.tamanho}
                    </span>
                    <span className="sub">
                      {STATUS_ROTULO[b.status]}
                      {b.status === 'rodando' && b.progresso ? ` — ${b.progresso}` : ''}
                      {b.status === 'concluida' &&
                        ` — ${b.novos ?? 0} novos de ${b.encontrados ?? 0}`}
                      {b.status === 'erro' && b.erro ? ` — ${b.erro}` : ''}
                    </span>
                  </span>
                  <span className="busca-acoes">
                    <span className="atividade-hora">{dataHora(b.criado_em).slice(0, 8)}</span>
                    {b.status !== 'rodando' && (
                      <button
                        className="icone-btn perigo"
                        title="Remover da lista"
                        onClick={() => apaga.mutate(b.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
          {buscas?.some((b) => b.status === 'concluida' && (b.novos ?? 0) > 0) && (
            <button className="btn btn-ghost largo" onClick={() => navigate('/lista?ordem=recentes')}>
              Ver os leads que chegaram
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
