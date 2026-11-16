import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Busca, TamanhoBusca } from '../lib/buscas'
import { modoDemo } from '../lib/demo'

const buscasCol = () => collection(db, 'buscas')

const BUSCAS_DEMO: Busca[] = [
  {
    id: 'd1',
    termos: ['food trucks'],
    cidade: 'Guarulhos',
    uf: 'SP',
    bairro: '',
    tamanho: 'rapida',
    status: 'concluida',
    criado_em: new Date(Date.now() - 3600_000).toISOString(),
    encontrados: 16,
    novos: 14,
    repetidos: 2,
  },
  {
    id: 'd2',
    termos: ['adegas', 'distribuidora de bebidas'],
    cidade: 'Guarulhos',
    uf: 'SP',
    bairro: 'Vila Barros',
    tamanho: 'padrao',
    status: 'rodando',
    criado_em: new Date(Date.now() - 300_000).toISOString(),
    progresso: 'visitando os sites encontrados',
  },
]

/** Lista em tempo real: o agente atualiza o status e a tela acompanha sozinha. */
export function useBuscas() {
  const [buscas, setBuscas] = useState<Busca[] | null>(modoDemo ? BUSCAS_DEMO : null)

  useEffect(() => {
    if (modoDemo) return
    return onSnapshot(query(buscasCol(), orderBy('criado_em', 'desc')), (snap) => {
      setBuscas(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Busca, 'id'>) })))
    })
  }, [])

  return buscas
}

export interface PedidoBusca {
  termos: string[]
  cidade: string
  uf: string
  bairro: string
  tamanho: TamanhoBusca
}

export function useCriaBusca() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (pedido: PedidoBusca) => {
      const doc = {
        ...pedido,
        status: 'na_fila' as const,
        criado_em: new Date().toISOString(),
      }
      const ref = await addDoc(buscasCol(), doc)
      return ref.id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}

export function useApagaBusca() {
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, 'buscas', id))
    },
  })
}
