import { NavLink, Route, Routes } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import {
  CalendarCheck2,
  Database,
  LogOut,
  TrendingUp,
  Users,
} from 'lucide-react'
import { auth, configurado } from './lib/firebase'
import { useSession } from './hooks/useSession'
import { useLeads } from './hooks/useLeads'
import { hojeIso } from './lib/format'
import { Login } from './pages/Login'
import { Hoje } from './pages/Hoje'
import { Lista } from './pages/Lista'
import { LeadDetalhe } from './pages/LeadDetalhe'
import { Funil } from './pages/Funil'
import { Dados } from './pages/Dados'

const NAV = [
  { to: '/', rotulo: 'Hoje', Icone: CalendarCheck2, end: true },
  { to: '/lista', rotulo: 'Leads', Icone: Users, end: false },
  { to: '/funil', rotulo: 'Funil', Icone: TrendingUp, end: false },
  { to: '/dados', rotulo: 'Dados', Icone: Database, end: false },
]

function SetupPendente() {
  return (
    <div className="login">
      <div className="marca-logo grande">F</div>
      <h1>
        Fluxa <span className="gold">Prospect</span>
      </h1>
      <div className="card setup">
        <p>
          Falta configurar o Firebase. Crie um arquivo <code>.env.local</code> na raiz do projeto
          com:
        </p>
        <pre>
          {'VITE_FIREBASE_API_KEY=...\nVITE_FIREBASE_AUTH_DOMAIN=SEU-PROJETO.firebaseapp.com\nVITE_FIREBASE_PROJECT_ID=SEU-PROJETO\nVITE_FIREBASE_APP_ID=1:...:web:...'}
        </pre>
        <p>Depois reinicie o servidor. O passo a passo completo está no README.</p>
      </div>
    </div>
  )
}

function PendenciasHoje() {
  const { data: leads } = useLeads()
  if (!leads) return null
  const hoje = hojeIso()
  const pendentes = leads.filter(
    (l) =>
      l.followup_em &&
      l.followup_em <= hoje &&
      l.estagio !== 'fechado' &&
      l.estagio !== 'perdido',
  ).length
  if (pendentes === 0) return null
  return <span className="nav-badge">{pendentes}</span>
}

function Navegacao() {
  return (
    <>
      {NAV.map(({ to, rotulo, Icone, end }) => (
        <NavLink key={to} to={to} end={end} className="nav-item">
          <span className="nav-icone">
            <Icone size={19} strokeWidth={2.2} />
            {to === '/' && <PendenciasHoje />}
          </span>
          <span className="nav-rotulo">{rotulo}</span>
        </NavLink>
      ))}
    </>
  )
}

export default function App() {
  const { usuario, carregando } = useSession()

  if (!configurado) return <SetupPendente />
  if (carregando) return <p className="aviso-tela">Carregando…</p>
  if (!usuario) return <Login />

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="marca">
          <span className="marca-logo">F</span>
          <span className="marca-nome">
            <strong>Fluxa</strong>
            <em>Prospect</em>
          </span>
        </div>
        <nav className="sidebar-nav">
          <Navegacao />
        </nav>
        <div className="sidebar-rodape">
          <span className="sidebar-email" title={usuario.email ?? ''}>
            {usuario.email}
          </span>
          <button className="sair" onClick={() => signOut(auth)} title="Sair">
            <LogOut size={17} strokeWidth={2.2} />
          </button>
        </div>
      </aside>

      <main className="conteudo">
        <Routes>
          <Route path="/" element={<Hoje />} />
          <Route path="/lista" element={<Lista />} />
          <Route path="/lead/:id" element={<LeadDetalhe />} />
          <Route path="/funil" element={<Funil />} />
          <Route path="/dados" element={<Dados />} />
        </Routes>
      </main>

      <nav className="nav-mobile">
        <Navegacao />
      </nav>
    </div>
  )
}
