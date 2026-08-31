import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'

export function useSession() {
  const [usuario, setUsuario] = useState<User | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUsuario(u)
        setCarregando(false)
      }),
    [],
  )

  return { usuario, carregando }
}
