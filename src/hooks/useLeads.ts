import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
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
      const agora = new Date().toISOString()
      await setDoc(doc(db, 'leads', String(id)), {
        ...dados,
        id,
        atualizado_em: agora,
        criado_em: agora,
      })
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

/**
 * Completa `criado_em` dos leads anteriores ao campo, usando o createTime que o
 * Firestore guarda de cada documento — o SDK web não expõe esse dado, a API REST sim.
 */
export function useRecuperaDataCriacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (idsSemData: number[]) => {
      const usuario = auth.currentUser
      if (!usuario || idsSemData.length === 0) return new Map<number, string>()
      const token = await usuario.getIdToken()
      const base = `https://firestore.googleapis.com/v1/projects/${db.app.options.projectId}/databases/(default)/documents/leads`
      const faltando = new Set(idsSemData)
      const achados = new Map<number, string>()

      let pagina = ''
      do {
        const url = `${base}?pageSize=300&mask.fieldPaths=id${pagina ? `&pageToken=${pagina}` : ''}`
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (!resp.ok) throw new Error(`Firestore REST ${resp.status}`)
        const corpo = (await resp.json()) as {
          documents?: { name: string; createTime: string }[]
          nextPageToken?: string
        }
        for (const d of corpo.documents ?? []) {
          const id = Number(d.name.split('/').pop())
          // createTime vem com nanossegundos; Date.parse só garante milissegundos.
          if (faltando.has(id)) achados.set(id, d.createTime.replace(/(\.\d{3})\d*Z$/, '$1Z'))
        }
        pagina = corpo.nextPageToken ?? ''
      } while (pagina)

      const pares = [...achados]
      for (let i = 0; i < pares.length; i += 400) {
        const lote = writeBatch(db)
        for (const [id, criado] of pares.slice(i, i + 400)) {
          lote.update(doc(db, 'leads', String(id)), { criado_em: criado })
        }
        await lote.commit()
      }
      return achados
    },
    onSuccess: (achados) => {
      if (achados.size === 0) return
      qc.setQueryData<Lead[]>(['leads'], (atual) =>
        atual?.map((l) => (achados.has(l.id) ? { ...l, criado_em: achados.get(l.id) } : l)),
      )
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

export function useAtualizaContato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contato: Contato) => {
      const { id, ...campos } = contato
      await updateDoc(doc(db, 'contatos', id), campos)
      return contato
    },
    onSuccess: (contato) => {
      qc.invalidateQueries({ queryKey: ['contatos', contato.lead_id] })
      qc.invalidateQueries({ queryKey: ['contatos', 'todos'] })
    },
  })
}

export function useApagaContato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; lead_id: number }) => {
      await deleteDoc(doc(db, 'contatos', id))
    },
    onSuccess: (_r, { lead_id }) => {
      qc.invalidateQueries({ queryKey: ['contatos', lead_id] })
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
      const criadoExistente = new Map(
        existentes.docs.map((d) => [Number(d.id), (d.data() as Lead).criado_em]),
      )

      const agora = new Date().toISOString()
      // writeBatch aceita até 500 operações; 400 deixa folga.
      for (let i = 0; i < resultado.leads.length; i += 400) {
        const lote = writeBatch(db)
        for (const lead of resultado.leads.slice(i, i + 400)) {
          // set() substitui o documento: a data de criação precisa ser repassada,
          // senão uma reimportação apagaria a original.
          const { criado_em: criadoNoArquivo, ...campos } = lead
          const criado =
            criadoExistente.get(lead.id) ??
            criadoNoArquivo ??
            (idsExistentes.has(lead.id) ? undefined : agora)
          lote.set(doc(db, 'leads', String(lead.id)), {
            ...campos,
            atualizado_em: agora,
            ...(criado ? { criado_em: criado } : {}),
          })
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
