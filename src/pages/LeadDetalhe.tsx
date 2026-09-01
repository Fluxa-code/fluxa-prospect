import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Globe, MessageCircle, Phone, Plus } from 'lucide-react'
import { IconeFacebook, IconeInstagram } from '../components/IconesSociais'
import { MensagemSugerida } from '../components/MensagemSugerida'
import { useAtualizaLead, useContatos, useLeads } from '../hooks/useLeads'
import type { Estagio, Lead } from '../lib/types'
import {
  CANAL_CONTATO_LABEL,
  ESTAGIO_LABEL,
  ESTAGIO_VALUES,
  VERIFICACAO_LABEL,
} from '../lib/types'
import { CanalBadge, ConfiancaDot, TierBadge } from '../components/Badges'
import { CanalSheet } from '../components/CanalSheet'
import { BottomSheet } from '../components/BottomSheet'
import { ContatoForm } from '../components/ContatoForm'
import { dataCurta, dataHora, hojeIso, linkTelefone, linkWhatsapp, somaDias } from '../lib/format'

function CampoValor({ lead }: { lead: Lead }) {
  const atualiza = useAtualizaLead()
  const [valor, setValor] = useState(lead.valor_estimado?.toString() ?? '')
  return (
    <div className="linha-valor">
      <label className="label">Valor estimado (R$)</label>
      <input
        className="input"
        type="number"
        inputMode="decimal"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          const n = valor === '' ? null : Number(valor)
          if (n !== lead.valor_estimado && (n === null || Number.isFinite(n))) {
            atualiza.mutate({ id: lead.id, patch: { valor_estimado: n } })
          }
        }}
        placeholder="ex.: 1800"
      />
    </div>
  )
}

function CampoPerda({ lead }: { lead: Lead }) {
  const atualiza = useAtualizaLead()
  const [motivo, setMotivo] = useState(lead.perda_motivo)
  const recusa = lead.estagio === 'recusado'
  return (
    <div className="linha-valor">
      <label className="label">{recusa ? 'Motivo da recusa' : 'Motivo da perda'}</label>
      <input
        className="input"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        onBlur={() => {
          if (motivo !== lead.perda_motivo) {
            atualiza.mutate({ id: lead.id, patch: { perda_motivo: motivo } })
          }
        }}
        placeholder={recusa ? 'ex.: já tem site, sem interesse' : 'ex.: fechou com outra agência'}
      />
    </div>
  )
}

export function LeadDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: leads } = useLeads()
  const lead = leads?.find((l) => l.id === Number(id))
  const { data: contatos } = useContatos(Number(id))
  const atualiza = useAtualizaLead()
  const [canalAberto, setCanalAberto] = useState(false)
  const [contatoAberto, setContatoAberto] = useState(false)

  if (!leads) return <p className="aviso-tela">Carregando…</p>
  if (!lead) return <p className="aviso-tela">Lead não encontrado.</p>

  const aud = (chave: string): string => {
    const v = lead.auditoria[chave]
    if (Array.isArray(v)) return v.join('; ')
    return v ? String(v) : ''
  }

  const wa = linkWhatsapp(lead.telefone)
  const tel = linkTelefone(lead.telefone)
  const mostraWa =
    wa !== null &&
    lead.canal_status !== 'fixo_sem_whatsapp' &&
    lead.canal_status !== 'whatsapp_bot' &&
    lead.canal_status !== 'sem_contato'

  const municao: [string, string][] = [
    ['Estado do site', lead.estado],
    ['CMS', lead.cms],
    ['Problemas', aud('problemas')],
    ['Oportunidade', aud('oportunidade') || aud('acao')],
    ['Por que abordar', aud('motivo')],
    ['Evidência', aud('evidencia')],
    ['Sinais de obsolescência', aud('sinais_obsolescencia')],
    ['Notas', aud('notas')],
  ]

  return (
    <div className="pagina detalhe">
      <button className="voltar" onClick={() => navigate(-1)}>
        <ChevronLeft size={16} /> voltar
      </button>

      <div className="detalhe-colunas">
      <div>
      <header className="detalhe-topo">
        <h2>{lead.nome}</h2>
        <span className="sub">
          {[lead.segmento, lead.cat].filter(Boolean).join(' · ')}
        </span>
        {lead.endereco && <span className="sub">{lead.endereco}</span>}
        {lead.cnpj && <span className="sub mono">CNPJ {lead.cnpj}</span>}
        <div className="badges">
          <TierBadge tier={lead.tier} score={lead.score} />
          <CanalBadge status={lead.canal_status} onClick={() => setCanalAberto(true)} />
          <ConfiancaDot confianca={lead.confianca} />
        </div>
        {lead.verificacao !== 'completa' && (
          <p className={`alerta ${lead.verificacao === 'parcial' ? 'alerta-laranja' : 'alerta-cinza'}`}>
            {lead.verificacao === 'parcial' ? '⚠' : '?'} {VERIFICACAO_LABEL[lead.verificacao]} —
            confirme os dados antes de usar na abordagem.
          </p>
        )}
      </header>

      <div className="acoes-grandes">
        {mostraWa && (
          <a className="btn btn-verde" href={wa!} target="_blank" rel="noreferrer">
            <MessageCircle size={16} /> WhatsApp
          </a>
        )}
        {tel && (
          <a className="btn btn-ghost" href={tel}>
            <Phone size={15} /> Ligar
          </a>
        )}
        {lead.instagram && (
          <a
            className="btn btn-ghost"
            href={
              lead.instagram.startsWith('http')
                ? lead.instagram
                : `https://instagram.com/${lead.instagram.replace(/^@/, '')}`
            }
            target="_blank"
            rel="noreferrer"
          >
            <IconeInstagram size={15} /> Instagram
          </a>
        )}
        {lead.facebook && (
          <a className="btn btn-ghost" href={lead.facebook} target="_blank" rel="noreferrer">
            <IconeFacebook size={15} /> Facebook
          </a>
        )}
        {lead.site && (
          <a className="btn btn-ghost" href={lead.site} target="_blank" rel="noreferrer">
            <Globe size={15} /> Site
          </a>
        )}
      </div>

      <h3 className="secao">Estágio</h3>
      <div className="chips-row">
        {ESTAGIO_VALUES.map((e) => (
          <button
            key={e}
            className={`chip ${lead.estagio === e ? 'ativa' : ''}`}
            onClick={() => atualiza.mutate({ id: lead.id, patch: { estagio: e as Estagio } })}
          >
            {ESTAGIO_LABEL[e]}
          </button>
        ))}
      </div>
      {(lead.estagio === 'negociacao' || lead.estagio === 'fechado') && <CampoValor key={`v${lead.id}`} lead={lead} />}
      {(lead.estagio === 'perdido' || lead.estagio === 'recusado') && (
        <CampoPerda key={`p${lead.id}-${lead.estagio}`} lead={lead} />
      )}

      <h3 className="secao">Follow-up</h3>
      <div className="chips-row">
        {lead.followup_em ? (
          <>
            <span className="badge cor-gold">
              {dataCurta(lead.followup_em)}
              {lead.followup_nota && ` — ${lead.followup_nota}`}
            </span>
            <button
              className="chip"
              onClick={() =>
                atualiza.mutate({ id: lead.id, patch: { followup_em: somaDias(hojeIso(), 2) } })
              }
            >
              +2d
            </button>
            <button
              className="chip"
              onClick={() =>
                atualiza.mutate({ id: lead.id, patch: { followup_em: somaDias(hojeIso(), 7) } })
              }
            >
              +7d
            </button>
            <button
              className="chip"
              onClick={() =>
                atualiza.mutate({ id: lead.id, patch: { followup_em: null, followup_nota: '' } })
              }
            >
              remover
            </button>
          </>
        ) : (
          <>
            <button
              className="chip"
              onClick={() =>
                atualiza.mutate({ id: lead.id, patch: { followup_em: somaDias(hojeIso(), 2) } })
              }
            >
              +2 dias
            </button>
            <button
              className="chip"
              onClick={() =>
                atualiza.mutate({ id: lead.id, patch: { followup_em: somaDias(hojeIso(), 7) } })
              }
            >
              +7 dias
            </button>
          </>
        )}
      </div>

      </div>

      <div>
      <h3 className="secao">Munição de abordagem</h3>
      <div className="card municao">
        {municao
          .filter(([, v]) => v)
          .map(([rotulo, v]) => (
            <p key={rotulo}>
              <strong>{rotulo}:</strong> {v}
            </p>
          ))}
      </div>

      <MensagemSugerida key={`m${lead.id}`} lead={lead} />

      <div className="registrar-wrap">
        <button className="btn btn-gold largo" onClick={() => setContatoAberto(true)}>
          <Plus size={17} /> Registrar contato
        </button>
      </div>

      <h3 className="secao">Histórico ({contatos?.length ?? 0})</h3>
      {contatos?.length === 0 && <p className="vazio">Nenhum contato registrado ainda.</p>}
      {contatos?.map((c) => (
        <div key={c.id} className="card contato">
          <span className="sub">
            {dataHora(c.em)} · {CANAL_CONTATO_LABEL[c.canal]}
          </span>
          {c.enviado && <p>{c.enviado}</p>}
          {c.resposta && <p className="resposta">↳ {c.resposta}</p>}
        </div>
      ))}

      </div>
      </div>

      <CanalSheet lead={canalAberto ? lead : null} onFechar={() => setCanalAberto(false)} />
      <BottomSheet
        aberto={contatoAberto}
        titulo={`Registrar contato — ${lead.nome}`}
        onFechar={() => setContatoAberto(false)}
      >
        <ContatoForm lead={lead} onFechar={() => setContatoAberto(false)} />
      </BottomSheet>
    </div>
  )
}
