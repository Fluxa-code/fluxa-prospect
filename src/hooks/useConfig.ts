import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { modoDemo } from '../lib/demo'

/**
 * Preferências do app, guardadas no Firebase (valem no PC e no celular).
 * Tudo tem valor padrão: se o documento não existir, o app funciona igual.
 */
export interface Config {
  /** como você se apresenta na primeira mensagem */
  apresentacao: string
  /** cidade onde você atua, usada no texto quando o lead é da mesma cidade */
  cidade: string
  uf: string
  /** dias até o retorno sugerido quando o contato fica sem resposta */
  diasFollowup: number
  /** texto final da mensagem (a chamada para ação) */
  chamada: string
  /** proposta por categoria — sobrescreve o texto embutido */
  propostas: Record<string, string>
}

export const CONFIG_PADRAO: Config = {
  apresentacao: 'Oi, tudo bem? Aqui é o Deivid, da Fluxa',
  cidade: 'Guarulhos',
  uf: 'SP',
  diasFollowup: 3,
  chamada:
    'Posso te mandar um diagnóstico rápido e gratuito do que eu mudaria? São 3 pontos, sem compromisso.',
  propostas: {},
}

export function useConfig(): Config {
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO)

  useEffect(() => {
    if (modoDemo) return
    return onSnapshot(doc(db, 'sistema', 'config'), (d) => {
      setConfig(d.exists() ? { ...CONFIG_PADRAO, ...(d.data() as Partial<Config>) } : CONFIG_PADRAO)
    })
  }, [])

  return config
}

export function useSalvaConfig() {
  return useMutation({
    mutationFn: async (patch: Partial<Config>) => {
      await setDoc(doc(db, 'sistema', 'config'), patch, { merge: true })
    },
  })
}
