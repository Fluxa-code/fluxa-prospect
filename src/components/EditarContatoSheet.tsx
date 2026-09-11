import { useState } from 'react'
import type { CanalContato, Contato } from '../lib/types'
import { CANAL_CONTATO_LABEL, CANAL_CONTATO_VALUES } from '../lib/types'
import { useAtualizaContato } from '../hooks/useLeads'
import { BottomSheet } from './BottomSheet'

function paraLocal(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function EditarContatoSheet({
  contato,
  onFechar,
}: {
  contato: Contato | null
  onFechar: () => void
}) {
  return (
    <BottomSheet aberto={contato !== null} titulo="Corrigir contato" onFechar={onFechar}>
      {contato && <Formulario key={contato.id} contato={contato} onFechar={onFechar} />}
    </BottomSheet>
  )
}

function Formulario({ contato, onFechar }: { contato: Contato; onFechar: () => void }) {
  const atualiza = useAtualizaContato()
  const [canal, setCanal] = useState<CanalContato>(contato.canal)
  const [quando, setQuando] = useState(() => paraLocal(contato.em))
  const [enviado, setEnviado] = useState(contato.enviado)
  const [resposta, setResposta] = useState(contato.resposta)
  const [erro, setErro] = useState('')

  async function salvar() {
    setErro('')
    try {
      await atualiza.mutateAsync({
        ...contato,
        canal,
        em: quando ? new Date(quando).toISOString() : contato.em,
        enviado: enviado.trim(),
        resposta: resposta.trim(),
      })
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar — confere o sinal.')
    }
  }

  return (
    <div className="form">
      <label className="label">Canal</label>
      <div className="chips-row">
        {CANAL_CONTATO_VALUES.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${canal === c ? 'ativa' : ''}`}
            onClick={() => setCanal(c)}
          >
            {CANAL_CONTATO_LABEL[c]}
          </button>
        ))}
      </div>

      <label className="label">Quando</label>
      <input
        type="datetime-local"
        className="input input-data"
        value={quando}
        onChange={(e) => setQuando(e.target.value)}
      />

      <label className="label">O que enviei</label>
      <textarea
        className="input"
        rows={3}
        value={enviado}
        onChange={(e) => setEnviado(e.target.value)}
      />

      <label className="label">Resposta</label>
      <textarea
        className="input"
        rows={2}
        value={resposta}
        onChange={(e) => setResposta(e.target.value)}
      />

      {erro && <p className="erro">{erro}</p>}
      <div className="form-acoes">
        <button type="button" className="btn btn-ghost" onClick={onFechar}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-gold"
          disabled={atualiza.isPending}
          onClick={salvar}
        >
          {atualiza.isPending ? 'Salvando…' : 'Salvar correção'}
        </button>
      </div>
    </div>
  )
}
