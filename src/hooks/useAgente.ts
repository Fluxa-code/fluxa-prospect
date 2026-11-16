import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { modoDemo } from '../lib/demo'

export interface EstadoAgente {
  /** última vez que o agente deu sinal de vida */
  visto_em: string
  /** o motor de busca (Docker) estava respondendo nesse momento */
  motor: boolean
  ocupado?: boolean
}

export interface Agente {
  online: boolean
  motor: boolean
  ocupado: boolean
  visto_em: string | null
}

/** Considera fora do ar se o último sinal tem mais de 3 minutos (ele bate a cada 1). */
const LIMITE_MS = 3 * 60_000

export function useAgente(): Agente {
  const [estado, setEstado] = useState<EstadoAgente | null>(null)
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    if (modoDemo) {
      setEstado({ visto_em: new Date().toISOString(), motor: true })
      return
    }
    return onSnapshot(doc(db, 'sistema', 'agente'), (d) => {
      setEstado(d.exists() ? (d.data() as EstadoAgente) : null)
    })
  }, [])

  // relógio próprio: sem isso a tela continuaria dizendo "online" depois que o PC caiu
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const visto = estado?.visto_em ? Date.parse(estado.visto_em) : 0
  return {
    online: Boolean(visto) && agora - visto < LIMITE_MS,
    motor: Boolean(estado?.motor),
    ocupado: Boolean(estado?.ocupado),
    visto_em: estado?.visto_em ?? null,
  }
}
