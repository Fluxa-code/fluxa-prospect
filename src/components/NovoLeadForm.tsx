import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Lead } from '../lib/types'
import { ESTADO_SITE_VALUES, TIER_VALUES } from '../lib/types'
import { useCriaLead } from '../hooks/useLeads'

// Score padrão por tier, na régua da base importada (A 95-85, B ~77, C ~50, D baixo).
const SCORE_POR_TIER: Record<string, number> = { A: 88, B: 75, C: 50, D: 30 }

export function NovoLeadForm({
  categorias,
  onFechar,
}: {
  categorias: string[]
  onFechar: () => void
}) {
  const navigate = useNavigate()
  const cria = useCriaLead()

  const [nome, setNome] = useState('')
  const [segmento, setSegmento] = useState('')
  const [cat, setCat] = useState('')
  const [endereco, setEndereco] = useState('')
  const [telefone, setTelefone] = useState('')
  const [instagram, setInstagram] = useState('')
  const [site, setSite] = useState('')
  const [estado, setEstado] = useState('')
  const [tier, setTier] = useState('C')
  const [notas, setNotas] = useState('')
  const [erro, setErro] = useState('')

  async function salvar() {
    if (!nome.trim()) {
      setErro('Nome é obrigatório.')
      return
    }
    setErro('')
    const auditoria: Record<string, unknown> = { origem: 'cadastro manual no app' }
    if (notas.trim()) auditoria.notas = notas.trim()

    const dados: Omit<Lead, 'id' | 'atualizado_em'> = {
      nome: nome.trim(),
      segmento: segmento.trim(),
      cat: cat.trim(),
      endereco: endereco.trim(),
      telefone: telefone.trim(),
      cnpj: '',
      site: site.trim(),
      estado,
      veredito: '',
      tier,
      score: SCORE_POR_TIER[tier] ?? 50,
      cms: '',
      instagram: instagram.trim(),
      facebook: '',
      confianca: '',
      verificacao: 'nao_informado',
      canal_status: 'nao_testado',
      estagio: 'nao_contatado',
      valor_estimado: null,
      perda_motivo: '',
      followup_em: null,
      followup_nota: '',
      auditoria,
    }
    try {
      const id = await cria.mutateAsync(dados)
      onFechar()
      navigate(`/lead/${id}`)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar — confere o sinal.')
    }
  }

  return (
    <div className="form">
      <label className="label">Nome do negócio *</label>
      <input
        className="input"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="ex.: Padaria do Zé"
        autoFocus
      />

      <label className="label">Segmento</label>
      <input
        className="input"
        value={segmento}
        onChange={(e) => setSegmento(e.target.value)}
        placeholder="ex.: Padaria"
      />

      <label className="label">Categoria</label>
      <input
        className="input"
        list="categorias-conhecidas"
        value={cat}
        onChange={(e) => setCat(e.target.value)}
        placeholder="escolhe ou digita uma nova"
      />
      <datalist id="categorias-conhecidas">
        {categorias.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <label className="label">Endereço</label>
      <input
        className="input"
        value={endereco}
        onChange={(e) => setEndereco(e.target.value)}
        placeholder="ex.: R. Fonte Boa, 120"
      />

      <label className="label">Telefone / WhatsApp</label>
      <input
        className="input"
        type="tel"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
        placeholder="(11) 9…"
      />

      <label className="label">Instagram</label>
      <input
        className="input"
        value={instagram}
        onChange={(e) => setInstagram(e.target.value)}
        placeholder="@perfil ou link"
      />

      <label className="label">Site</label>
      <input
        className="input"
        type="url"
        value={site}
        onChange={(e) => setSite(e.target.value)}
        placeholder="https://…"
      />

      <label className="label">Estado do site</label>
      <select className="input" value={estado} onChange={(e) => setEstado(e.target.value)}>
        <option value="">Não sei ainda</option>
        {ESTADO_SITE_VALUES.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      <label className="label">Tier de prioridade</label>
      <div className="chips-row">
        {TIER_VALUES.map((t) => (
          <button
            key={t}
            type="button"
            className={`chip ${tier === t ? 'ativa' : ''}`}
            onClick={() => setTier(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <label className="label">Observações</label>
      <textarea
        className="input"
        rows={2}
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="ex.: dono atende de manhã; vi na rua em 01/09"
      />

      {erro && <p className="erro">{erro}</p>}
      <div className="form-acoes">
        <button type="button" className="btn btn-ghost" onClick={onFechar}>
          Cancelar
        </button>
        <button type="button" className="btn btn-gold" disabled={cria.isPending} onClick={salvar}>
          {cria.isPending ? 'Salvando…' : 'Criar lead'}
        </button>
      </div>
    </div>
  )
}
