import { useState } from 'react'
import { Copy, MessageCircle } from 'lucide-react'
import type { Lead } from '../lib/types'
import { ESCOPO_ROTULO, escopoDoLead, mensagemSugerida } from '../lib/mensagens'
import { linkWhatsapp } from '../lib/format'

export function MensagemSugerida({ lead }: { lead: Lead }) {
  const [texto, setTexto] = useState(() => mensagemSugerida(lead))
  const [copiado, setCopiado] = useState(false)

  const wa = linkWhatsapp(lead.telefone)
  const mostraWa =
    wa !== null &&
    lead.canal_status !== 'fixo_sem_whatsapp' &&
    lead.canal_status !== 'whatsapp_bot' &&
    lead.canal_status !== 'sem_contato'

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // clipboard bloqueado (contexto inseguro): seleciona para copiar na mão
      const area = document.getElementById(`msg-${lead.id}`) as HTMLTextAreaElement | null
      area?.select()
    }
  }

  return (
    <>
      <h3 className="secao">Mensagem sugerida</h3>
      <p className="sub explicacao" style={{ marginBottom: 8 }}>
        Montada por escopo ({ESCOPO_ROTULO[escopoDoLead(lead)]}) + categoria ({lead.cat || 'geral'}
        ). Edita à vontade antes de mandar.
      </p>
      <textarea
        id={`msg-${lead.id}`}
        className="input"
        rows={9}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <div className="chips-row" style={{ marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={copiar}>
          <Copy size={15} /> {copiado ? 'Copiado ✓' : 'Copiar'}
        </button>
        {mostraWa && (
          <a
            className="btn btn-verde"
            href={`${wa}?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={15} /> Abrir no WhatsApp
          </a>
        )}
      </div>
    </>
  )
}
