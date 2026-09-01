import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Contato, ContatoSeed, Lead } from '../lib/types'
import type { ImportResult } from '../lib/importer'

const leadsCol = () => collection(db, 'leads')
const contatosCol = () => collection(db, 'contatos')

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const snap = await getDocs(query(leadsCol(), orderBy('score', 'desc')))
      return snap.docs.map((d) => d.data() as Lead)
    },
    staleTime: 30_000,
  })
}

export function useContatos(leadId: number) {
  return useQuery({
    queryKey: ['contatos', leadId],
    queryFn: async () => {
      const snap = await getDocs(query(contatosCol(), where('lead_id', '==', leadId)))
      return snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as ContatoSeed) }) as Contato)
        .sort((a, b) => Date.parse(b.em) - Date.parse(a.em))
    },
  })
}

export function useTodosContatos() {
  return useQuery({
    queryKey: ['contatos', 'todos'],
    queryFn: async () => {
      const snap = await getDocs(contatosCol())
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as ContatoSeed) }) as Contato)
    },
    staleTime: 30_000,
  })
}

export function useAtualizaLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Partial<Lead> }) => {
      await updateDoc(doc(db, 'leads', String(id)), {
        ...patch,
        atualizado_em: new Date().toISOString(),
      })
      return { id, patch }
    },
    onSuccess: ({ id, patch }) => {
      qc.setQueryData<Lead[]>(['leads'], (atual) =>
        atual?.map((l) => (l.id === id ? { ...l, ...patch } : l)),
      )
    },
  })
}

export function useCriaLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dados: Omit<Lead, 'id' | 'atualizado_em'>) => {
      // Próximo id livre, lido do servidor para não colidir com a base importada.
      const atuais = await getDocs(leadsCol())
      const maxId = atuais.docs.reduce((m, d) => Math.max(m, Number(d.id) || 0), 0)
      const id = maxId + 1
      await setDoc(doc(db, 'leads', String(id)), {
        ...dados,
        id,
        atualizado_em: new Date().toISOString(),
      })
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useRegistraContato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contato: ContatoSeed) => {
      await addDoc(contatosCol(), contato)
    },
    onSuccess: (_dados, contato) => {
      qc.invalidateQueries({ queryKey: ['contatos', contato.lead_id] })
      qc.invalidateQueries({ queryKey: ['contatos', 'todos'] })
    },
  })
}

export interface RelatorioImportacao {
  leadsNovos: number
  leadsAtualizados: number
  contatosNovos: number
  contatosJaExistiam: number
  avisos: string[]
  descartados: string[]
}

/** Sobe o resultado do parse para o Firestore: leads em lote + contatos deduplicados. */
export function useImporta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (resultado: ImportResult): Promise<RelatorioImportacao> => {
      const existentes = await getDocs(leadsCol())
      const idsExistentes = new Set(existentes.docs.map((d) => Number(d.id)))

      const agora = new Date().toISOString()
      // writeBatch aceita até 500 operações; 400 deixa folga.
      for (let i = 0; i < resultado.leads.length; i += 400) {
        const lote = writeBatch(db)
        for (const lead of resultado.leads.slice(i, i + 400)) {
          lote.set(doc(db, 'leads', String(lead.id)), { ...lead, atualizado_em: agora })
        }
        await lote.commit()
      }

      // Dedup de contatos por (lead, instante, canal) para reimportação ser idempotente.
      const contatosAtuais = await getDocs(contatosCol())
      const chave = (c: { lead_id: number; em: string; canal: string }) =>
        `${c.lead_id}|${Date.parse(c.em)}|${c.canal}`
      const jaExistem = new Set(contatosAtuais.docs.map((d) => chave(d.data() as ContatoSeed)))
      const novos = resultado.contatos.filter((c) => !jaExistem.has(chave(c)))

      for (let i = 0; i < novos.length; i += 400) {
        const lote = writeBatch(db)
        for (const contato of novos.slice(i, i + 400)) {
          lote.set(doc(contatosCol()), contato)
        }
        await lote.commit()
      }

      qc.invalidateQueries()
      return {
        leadsNovos: resultado.leads.filter((l) => !idsExistentes.has(l.id)).length,
        leadsAtualizados: resultado.leads.filter((l) => idsExistentes.has(l.id)).length,
        contatosNovos: novos.length,
        contatosJaExistiam: resultado.contatos.length - novos.length,
        avisos: resultado.avisos,
        descartados: resultado.descartados,
      }
    },
  })
}
