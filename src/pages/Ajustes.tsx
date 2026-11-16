import { useEffect, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { CONFIG_PADRAO, useConfig, useSalvaConfig, type Config } from '../hooks/useConfig'
import { useLeads } from '../hooks/useLeads'
import { PROPOSTA_PADRAO, propostaDe } from '../lib/mensagens'

/** Telas de preferência: como a mensagem é montada e como o follow-up é sugerido. */
export function Ajustes() {
  const config = useConfig()
  const salva = useSalvaConfig()
  const { data: leads } = useLeads()

  const [rascunho, setRascunho] = useState<Config>(config)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => setRascunho(config), [config])

  // só as categorias que existem na base, para não listar 17 campos à toa
  const categorias = [...new Set((leads ?? []).map((l) => l.cat).filter(Boolean))].sort()

  function campo<K extends keyof Config>(chave: K, valor: Config[K]) {
    setRascunho((r) => ({ ...r, [chave]: valor }))
    setSalvo(false)
  }

  async function gravar() {
    await salva.mutateAsync(rascunho)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  return (
    <div className="pagina pagina-larga">
      <header className="cabecalho-pagina">
        <div>
          <h2>Ajustes</h2>
          <span className="sub">
            Valem no computador e no celular. Em branco, o app usa o texto padrão.
          </span>
        </div>
        <button className="btn btn-gold" disabled={salva.isPending} onClick={gravar}>
          <Check size={16} /> {salva.isPending ? 'Salvando…' : salvo ? 'Salvo ✓' : 'Salvar'}
        </button>
      </header>

      <div className="duas-colunas">
        <section>
          <h3 className="secao">Mensagem</h3>
          <div className="card">
            <label className="label">Como você se apresenta</label>
            <input
              className="input"
              value={rascunho.apresentacao}
              onChange={(e) => campo('apresentacao', e.target.value)}
            />
            <p className="sub explicacao">
              Primeira linha da mensagem. Depois dela vem o que você faz e a cidade.
            </p>

            <label className="label">Chamada final</label>
            <textarea
              className="input"
              rows={3}
              value={rascunho.chamada}
              onChange={(e) => campo('chamada', e.target.value)}
            />
            <p className="sub explicacao">
              É o pedido no fim da mensagem. Troque se o diagnóstico de 3 pontos parar de
              funcionar.
            </p>
          </div>

          <h3 className="secao">Proposta por categoria</h3>
          <div className="card">
            <p className="sub explicacao" style={{ marginTop: 0 }}>
              O texto que entra depois de "A ideia pra vocês:". Deixe vazio para usar o padrão
              que já vem no app.
            </p>
            {categorias.map((cat) => (
              <div key={cat} className="linha-proposta">
                <label className="label">{cat}</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder={propostaDe(cat) || PROPOSTA_PADRAO}
                  value={rascunho.propostas[cat] ?? ''}
                  onChange={(e) =>
                    campo('propostas', { ...rascunho.propostas, [cat]: e.target.value })
                  }
                />
              </div>
            ))}
            {categorias.length === 0 && (
              <p className="vazio">Importe ou busque leads para ver as categorias aqui.</p>
            )}
          </div>
        </section>

        <aside>
          <h3 className="secao">Prospecção</h3>
          <div className="card">
            <label className="label">Sua cidade</label>
            <div className="linha-campos">
              <input
                className="input"
                value={rascunho.cidade}
                onChange={(e) => campo('cidade', e.target.value)}
              />
              <input
                className="input campo-uf"
                maxLength={2}
                value={rascunho.uf}
                onChange={(e) => campo('uf', e.target.value.toUpperCase())}
              />
            </div>
            <p className="sub explicacao">
              Quando o lead é da sua cidade, a mensagem diz "aqui em {rascunho.cidade}". Para
              os de fora, o texto muda sozinho.
            </p>

            <label className="label">Retorno automático</label>
            <div className="chips-row">
              {[2, 3, 5, 7].map((d) => (
                <button
                  key={d}
                  className={`chip ${rascunho.diasFollowup === d ? 'ativa' : ''}`}
                  onClick={() => campo('diasFollowup', d)}
                >
                  {d} dias
                </button>
              ))}
            </div>
            <p className="sub explicacao">
              Prazo sugerido quando você registra um contato sem resposta, inclusive na rodada.
            </p>
          </div>

          <button
            className="btn btn-ghost largo"
            onClick={() => {
              setRascunho(CONFIG_PADRAO)
              setSalvo(false)
            }}
          >
            <RotateCcw size={15} /> Voltar tudo ao padrão
          </button>
          <p className="sub explicacao">Isso só preenche a tela — salve para valer.</p>
        </aside>
      </div>
    </div>
  )
}
