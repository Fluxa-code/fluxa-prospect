import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Copy, MessageCircle, Phone, SkipForward, X } from 'lucide-react'
import { useAtualizaLead, useLeads, useRegistraContato } from '../hooks/useLeads'
import type { Estagio, Lead } from '../lib/types'
import { CANAL_STATUS_LABEL, VERIFICACAO_LABEL } from '../lib/types'
import { mensagemSugerida } from '../lib/mensagens'
import { hojeIso, linkTelefone, linkWhatsapp, somaDias } from '../lib/format'
import { TierBadge } from '../components/Badges'
import { CanalSheet } from '../components/CanalSheet'
import { IconeInstagram } from '../components/IconesSociais'

/** O diagnóstico do site fica no pacote de auditoria, não em campo próprio do lead. */
function municao(lead: Lead): string {
  const p = lead.auditoria?.problemas
  return typeof p === 'string' ? p : ''
}

/**
 * Modo rodada: uma fila de leads para abordar em série. O app monta a mensagem e
 * abre o WhatsApp; quem aperta enviar é o Deivid. Ao marcar "enviei", o contato é
 * registrado, o estágio avança e o follow-up é agendado — tudo num toque.
 */
export function Rodada() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { data: leads, isLoading } = useLeads()
  const registra = useRegistraContato()
  const atualiza = useAtualizaLead()

  const [posicao, setPosicao] = useState(0)
  const [texto, setTexto] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [canalAberto, setCanalAberto] = useState(false)
  const [erro, setErro] = useState('')
  const [feitos, setFeitos] = useState({ enviados: 0, pulados: 0 })

  // A fila nasce dos filtros que vieram da tela de Leads (ou dos prioritários).
  const fila = useMemo(() => {
    if (!leads) return []
    const tiers = (params.get('tier') ?? '').split(',').filter(Boolean)
    const cats = (params.get('cat') ?? '').split(',').filter(Boolean)
    return leads
      .filter((l) => {
        if (l.estagio !== 'nao_contatado') return false
        if (l.canal_status === 'sem_contato' || l.canal_status === 'perfil_inexistente') return false
        if (tiers.length && !tiers.includes(l.tier)) return false
        if (cats.length && !cats.includes(l.cat)) return false
        return true
      })
      .sort((a, b) => b.score - a.score)
  }, [leads, params])

  if (isLoading) return <p className="aviso-tela">Carregando…</p>

  const lead: Lead | undefined = fila[posicao]
  const total = fila.length

  if (total === 0) {
    return (
      <div className="pagina">
        <header className="pagina-topo">
          <h2>Rodada</h2>
        </header>
        <p className="vazio">
          Nenhum lead disponível com esses filtros. Todos já foram contatados ou estão sem
          canal.
        </p>
        <button className="btn btn-ghost" onClick={() => navigate('/lista')}>
          Voltar para os leads
        </button>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="pagina">
        <header className="pagina-topo">
          <h2>Rodada concluída</h2>
        </header>
        <div className="hero">
          <div className="hero-rotulo">Nesta rodada</div>
          <div className="hero-valor">{feitos.enviados}</div>
          <div className="hero-contexto">
            {feitos.enviados === 1 ? 'abordagem enviada' : 'abordagens enviadas'}
            {feitos.pulados > 0 && ` · ${feitos.pulados} pulado(s)`}
          </div>
        </div>
        <div className="chips-row">
          <button className="btn btn-gold" onClick={() => navigate('/')}>
            Ver o Hoje
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/lista')}>
            Voltar para os leads
          </button>
        </div>
      </div>
    )
  }

  const mensagem = texto ?? mensagemSugerida(lead)
  const wa = linkWhatsapp(lead.telefone)
  const tel = linkTelefone(lead.telefone)
  const temWhats =
    wa !== null && lead.canal_status !== 'fixo_sem_whatsapp' && lead.canal_status !== 'whatsapp_bot'
  const instagram = lead.instagram
    ? lead.instagram.startsWith('http')
      ? lead.instagram
      : `https://instagram.com/${lead.instagram.replace(/^@/, '')}`
    : ''

  function avanca(enviado: boolean) {
    setTexto(null)
    setCopiado(false)
    setErro('')
    setFeitos((f) => ({
      enviados: f.enviados + (enviado ? 1 : 0),
      pulados: f.pulados + (enviado ? 0 : 1),
    }))
    setPosicao((p) => p + 1)
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setErro('Não consegui copiar — selecione o texto e copie na mão.')
    }
  }

  async function marcarEnviado() {
    if (!lead) return
    setErro('')
    const canal = temWhats ? 'whatsapp' : instagram ? 'instagram' : 'outro'
    try {
      await registra.mutateAsync({
        lead_id: lead.id,
        em: new Date().toISOString(),
        canal,
        enviado: mensagem,
        resposta: '',
      })
      await atualiza.mutateAsync({
        id: lead.id,
        patch: {
          estagio: 'contatado' as Estagio,
          followup_em: somaDias(hojeIso(), 3),
          followup_nota: 'sem resposta — reforçar',
          ...(canal === 'whatsapp' && lead.canal_status === 'nao_testado'
            ? { canal_status: 'whatsapp_ok' as const }
            : {}),
        },
      })
      avanca(true)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar — confere o sinal.')
    }
  }

  const salvando = registra.isPending || atualiza.isPending

  const proximos = fila.slice(posicao + 1, posicao + 6)

  return (
    <div className="pagina pagina-larga rodada">
      <header className="cabecalho-pagina">
        <div>
          <h2>Rodada</h2>
          <span className="sub">
            {posicao + 1} de {total} · {feitos.enviados} enviada
            {feitos.enviados === 1 ? '' : 's'}
            {feitos.pulados > 0 && ` · ${feitos.pulados} pulada${feitos.pulados === 1 ? '' : 's'}`}
          </span>
        </div>
        <button className="icone-btn" title="Sair da rodada" onClick={() => navigate('/lista')}>
          <X size={18} />
        </button>
      </header>

      <div className="barra-trilho rodada-progresso">
        <div className="barra" style={{ width: `${(posicao / total) * 100}%` }} />
      </div>

      <div className="duas-colunas">
        <section>
      <div className="card rodada-lead">
        <strong className="rodada-nome">{lead.nome}</strong>
        <span className="sub">{[lead.segmento, lead.endereco].filter(Boolean).join(' · ')}</span>
        <div className="badges">
          <TierBadge tier={lead.tier} score={lead.score} />
          <button className="badge badge-btn cor-cinza" onClick={() => setCanalAberto(true)}>
            {CANAL_STATUS_LABEL[lead.canal_status]} ▾
          </button>
        </div>
        {lead.verificacao !== 'completa' && (
          <p className="alerta alerta-laranja">
            ⚠ {VERIFICACAO_LABEL[lead.verificacao]} — confirme antes de citar dados.
          </p>
        )}
        {municao(lead) && <p className="rodada-municao">{municao(lead)}</p>}
      </div>

      <label className="label">Mensagem (dá pra editar antes de enviar)</label>
      <textarea
        className="input"
        rows={9}
        value={mensagem}
        onChange={(e) => setTexto(e.target.value)}
      />

      <div className="chips-row rodada-canais">
        {temWhats && (
          <a
            className="btn btn-verde"
            href={`${wa}?text=${encodeURIComponent(mensagem)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={16} /> Abrir WhatsApp
          </a>
        )}
        {instagram && (
          <a className="btn btn-ghost" href={instagram} target="_blank" rel="noreferrer">
            <IconeInstagram size={15} /> Instagram
          </a>
        )}
        {tel && (
          <a className="btn btn-ghost" href={tel}>
            <Phone size={15} /> Ligar
          </a>
        )}
        <button className="btn btn-ghost" onClick={copiar}>
          <Copy size={15} /> {copiado ? 'Copiado ✓' : 'Copiar'}
        </button>
      </div>

      {erro && <p className="erro">{erro}</p>}

      <div className="rodada-acoes">
        <button className="btn btn-ghost" onClick={() => avanca(false)} disabled={salvando}>
          <SkipForward size={16} /> Pular
        </button>
        <button className="btn btn-gold largo" onClick={marcarEnviado} disabled={salvando}>
          <Check size={17} /> {salvando ? 'Salvando…' : 'Enviei, próximo'}
        </button>
      </div>
      <p className="sub explicacao">
        "Enviei" registra o contato, move para contatado e agenda retorno em 3 dias.
      </p>
        </section>

        <aside>
          <h3 className="secao">Próximos na fila</h3>
          <div className="card lista-atividade">
            {proximos.length === 0 && <p className="vazio">Este é o último da rodada.</p>}
            {proximos.map((p, i) => (
              <div key={p.id} className="atividade">
                <span className="fila-ordem">{posicao + 2 + i}</span>
                <span className="atividade-texto">
                  <strong>{p.nome}</strong>
                  <span className="sub">
                    {p.cat} · tier {p.tier}
                  </span>
                </span>
              </div>
            ))}
          </div>
          {total - posicao - 1 > proximos.length && (
            <p className="sub explicacao">
              e mais {total - posicao - 1 - proximos.length} depois destes.
            </p>
          )}
        </aside>
      </div>

      <CanalSheet lead={canalAberto ? lead : null} onFechar={() => setCanalAberto(false)} />
    </div>
  )
}
