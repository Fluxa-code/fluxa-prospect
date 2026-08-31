import { useMemo, useState } from 'react'
import type { CanalContato, Estagio, Lead } from '../lib/types'
import { CANAL_CONTATO_LABEL, CANAL_CONTATO_VALUES } from '../lib/types'
import { useAtualizaLead, useRegistraContato } from '../hooks/useLeads'
import { hojeIso, somaDias } from '../lib/format'

function canalPadrao(lead: Lead): CanalContato {
  if (lead.canal_status === 'whatsapp_ok') return 'whatsapp'
  if (lead.canal_status === 'fixo_sem_whatsapp') return 'telefone'
  if (lead.telefone && lead.canal_status === 'nao_testado') return 'whatsapp'
  if (lead.instagram) return 'instagram'
  if (lead.facebook) return 'facebook'
  return 'outro'
}

export function ContatoForm({ lead, onFechar }: { lead: Lead; onFechar: () => void }) {
  const [canal, setCanal] = useState<CanalContato>(() => canalPadrao(lead))
  const [enviado, setEnviado] = useState('')
  const [resposta, setResposta] = useState('')
  const [followup, setFollowup] = useState<string>('')
  const [followupNota, setFollowupNota] = useState('')
  const [erro, setErro] = useState('')

  const registra = useRegistraContato()
  const atualiza = useAtualizaLead()

  // Sugestões coerentes: o app propõe, o Deivid decide (desmarca se não quiser).
  const sugestoes = useMemo(() => {
    const lista: { chave: string; rotulo: string; patch: Partial<Lead> }[] = []
    const respondeu = resposta.trim().length > 0
    if (respondeu && canal === 'whatsapp' && lead.canal_status !== 'whatsapp_ok') {
      lista.push({
        chave: 'canal_ok',
        rotulo: 'Marcar canal como "WhatsApp ok"',
        patch: { canal_status: 'whatsapp_ok' },
      })
    }
    if (respondeu && (lead.estagio === 'nao_contatado' || lead.estagio === 'contatado')) {
      lista.push({
        chave: 'respondeu',
        rotulo: 'Mover estágio para "Respondeu"',
        patch: { estagio: 'respondeu' as Estagio },
      })
    } else if (!respondeu && lead.estagio === 'nao_contatado') {
      lista.push({
        chave: 'contatado',
        rotulo: 'Mover estágio para "Contatado"',
        patch: { estagio: 'contatado' as Estagio },
      })
    }
    return lista
  }, [canal, resposta, lead.canal_status, lead.estagio])

  const [desmarcadas, setDesmarcadas] = useState<Set<string>>(new Set())

  async function salvar() {
    setErro('')
    try {
      await registra.mutateAsync({
        lead_id: lead.id,
        em: new Date().toISOString(),
        canal,
        enviado: enviado.trim(),
        resposta: resposta.trim(),
      })
      let patch: Partial<Lead> = {}
      for (const s of sugestoes) {
        if (!desmarcadas.has(s.chave)) patch = { ...patch, ...s.patch }
      }
      if (followup) {
        patch.followup_em = followup
        patch.followup_nota = followupNota.trim()
      }
      if (Object.keys(patch).length > 0) {
        await atualiza.mutateAsync({ id: lead.id, patch })
      }
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar — confere o sinal e tenta de novo.')
    }
  }

  return (
    <div className="form">
      <label className="label">Canal usado</label>
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

      <label className="label">O que enviei</label>
      <textarea
        className="input"
        rows={3}
        value={enviado}
        onChange={(e) => setEnviado(e.target.value)}
        placeholder="Ex.: print do site fora do ar + proposta de refazer"
      />

      <label className="label">Resposta (pode ficar vazio e preencher depois)</label>
      <textarea
        className="input"
        rows={2}
        value={resposta}
        onChange={(e) => setResposta(e.target.value)}
        placeholder="Ex.: pediu valores, retornar amanhã"
      />

      <label className="label">Follow-up</label>
      <div className="chips-row">
        <button
          type="button"
          className={`chip ${followup === somaDias(hojeIso(), 2) ? 'ativa' : ''}`}
          onClick={() => setFollowup(somaDias(hojeIso(), 2))}
        >
          +2 dias
        </button>
        <button
          type="button"
          className={`chip ${followup === somaDias(hojeIso(), 7) ? 'ativa' : ''}`}
          onClick={() => setFollowup(somaDias(hojeIso(), 7))}
        >
          +7 dias
        </button>
        <input
          type="date"
          className="input input-data"
          value={followup}
          onChange={(e) => setFollowup(e.target.value)}
        />
        {followup && (
          <button type="button" className="chip" onClick={() => setFollowup('')}>
            limpar
          </button>
        )}
      </div>
      {followup && (
        <input
          className="input"
          value={followupNota}
          onChange={(e) => setFollowupNota(e.target.value)}
          placeholder="Nota do follow-up (ex.: mandar orçamento)"
        />
      )}

      {sugestoes.length > 0 && (
        <div className="sugestoes">
          <span className="label">Ao salvar, aplicar também:</span>
          {sugestoes.map((s) => (
            <label key={s.chave} className="check">
              <input
                type="checkbox"
                checked={!desmarcadas.has(s.chave)}
                onChange={(e) => {
                  const novo = new Set(desmarcadas)
                  if (e.target.checked) novo.delete(s.chave)
                  else novo.add(s.chave)
                  setDesmarcadas(novo)
                }}
              />
              {s.rotulo}
            </label>
          ))}
        </div>
      )}

      {erro && <p className="erro">{erro}</p>}
      <div className="form-acoes">
        <button type="button" className="btn btn-ghost" onClick={onFechar}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn-gold"
          disabled={registra.isPending || atualiza.isPending}
          onClick={salvar}
        >
          {registra.isPending ? 'Salvando…' : 'Salvar contato'}
        </button>
      </div>
    </div>
  )
}
