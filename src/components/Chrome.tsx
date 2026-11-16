import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarCheck2,
  Database,
  LogOut,
  Play,
  Search,
  Radar,
  TrendingUp,
  Users,
} from 'lucide-react'
import { signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useLeads } from '../hooks/useLeads'
import { useAgente } from '../hooks/useAgente'
import { hojeIso } from '../lib/format'
import { ESTAGIOS_ENCERRADOS } from '../lib/types'
import { modoDemo } from '../lib/demo'

interface Item {
  to: string
  rotulo: string
  Icone: typeof Users
  end: boolean
}

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Visão geral',
    itens: [{ to: '/', rotulo: 'Hoje', Icone: CalendarCheck2, end: true }],
  },
  {
    titulo: 'Prospecção',
    itens: [
      { to: '/buscas', rotulo: 'Buscar leads', Icone: Radar, end: false },
      { to: '/lista', rotulo: 'Leads', Icone: Users, end: false },
      { to: '/rodada', rotulo: 'Rodada', Icone: Play, end: false },
      { to: '/funil', rotulo: 'Funil', Icone: TrendingUp, end: false },
    ],
  },
  {
    titulo: 'Ajustes',
    itens: [{ to: '/dados', rotulo: 'Dados', Icone: Database, end: false }],
  },
]

const TODOS = GRUPOS.flatMap((g) => g.itens)

const TITULOS: Record<string, string> = {
  '/': 'Hoje',
  '/lista': 'Leads',
  '/buscas': 'Buscar leads',
  '/rodada': 'Rodada',
  '/funil': 'Funil',
  '/dados': 'Dados',
}

function usePendencias() {
  const { data: leads } = useLeads()
  if (!leads) return { followups: 0, total: 0, naoContatados: 0 }
  const hoje = hojeIso()
  return {
    followups: leads.filter(
      (l) => l.followup_em && l.followup_em <= hoje && !ESTAGIOS_ENCERRADOS.includes(l.estagio),
    ).length,
    total: leads.length,
    naoContatados: leads.filter((l) => l.estagio === 'nao_contatado').length,
  }
}

function ItensNav({ compacto = false }: { compacto?: boolean }) {
  const { followups } = usePendencias()
  const itens = compacto ? TODOS.filter((i) => i.to !== '/rodada' && i.to !== '/buscas') : TODOS

  if (compacto) {
    return (
      <>
        {itens.map(({ to, rotulo, Icone, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-item">
            <span className="nav-icone">
              <Icone size={19} strokeWidth={2.2} />
              {to === '/' && followups > 0 && <span className="nav-badge">{followups}</span>}
            </span>
            <span className="nav-rotulo">{rotulo}</span>
          </NavLink>
        ))}
      </>
    )
  }

  return (
    <>
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo} className="nav-grupo">
          <span className="nav-grupo-titulo">{grupo.titulo}</span>
          {grupo.itens.map(({ to, rotulo, Icone, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-item">
              <span className="nav-icone">
                <Icone size={18} strokeWidth={2.2} />
              </span>
              <span className="nav-rotulo">{rotulo}</span>
              {to === '/' && followups > 0 && <span className="nav-conta">{followups}</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </>
  )
}

export function Sidebar({ usuario }: { usuario: User }) {
  const { total, naoContatados } = usePendencias()
  const agente = useAgente()
  return (
    <aside className="sidebar">
      <div className="marca">
        <span className="marca-logo">F</span>
        <span className="marca-nome">
          <strong>Fluxa</strong>
          <em>Prospect</em>
        </span>
      </div>

      <nav className="sidebar-nav">
        <ItensNav />
      </nav>

      <div className="sidebar-status">
        <div className="status-linha">
          <span className="dot dot-verde" />
          <strong>{total} leads na base</strong>
        </div>
        <small>{naoContatados} ainda não contatados</small>
        <div className="status-linha status-agente">
          <span className={`dot ${agente.online ? 'dot-verde' : 'dot-vermelho'}`} />
          <small>
            {agente.online
              ? agente.ocupado
                ? 'buscando agora'
                : 'PC de casa ligado'
              : 'PC de casa desligado'}
          </small>
        </div>
      </div>

      <div className="sidebar-rodape">
        <span className="sidebar-email" title={usuario.email ?? ''}>
          {modoDemo ? 'modo demonstração' : usuario.email}
        </span>
        <button className="sair" onClick={() => signOut(auth)} title="Sair">
          <LogOut size={17} strokeWidth={2.2} />
        </button>
      </div>
    </aside>
  )
}

export function BarraTopo() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [busca, setBusca] = useState('')
  const titulo = TITULOS[pathname] ?? (pathname.startsWith('/lead/') ? 'Lead' : 'Fluxa Prospect')

  return (
    <header className="barra-topo">
      <div className="barra-titulo">
        <span className="barra-secao">Prospecção</span>
        <span className="barra-sep">/</span>
        <strong>{titulo}</strong>
      </div>

      <form
        className="barra-busca"
        onSubmit={(e) => {
          e.preventDefault()
          if (busca.trim()) navigate(`/lista?q=${encodeURIComponent(busca.trim())}`)
        }}
      >
        <Search size={16} />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar lead por nome ou rua… (Enter)"
        />
      </form>

      <button className="btn btn-gold btn-topo" onClick={() => navigate('/rodada')}>
        <Play size={15} /> Rodada
      </button>
    </header>
  )
}

export function NavMobile() {
  return (
    <nav className="nav-mobile">
      <ItensNav compacto />
    </nav>
  )
}
