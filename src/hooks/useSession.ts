import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { modoDemo } from '../lib/demo'

const USUARIO_DEMO = { email: 'demonstracao@fluxa' } as User

export function useSession() {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    if (modoDemo) return
    return onAuthStateChanged(auth, (u) => {
      setUsuario(u)
      setCarregando(false)
    })
  }, [])

  // modo demonstração (só em dev): finge um usuário para trabalhar o visual
  if (modoDemo) return { usuario: USUARIO_DEMO, carregando: false }

  return { usuario, carregando }
}
