import { Route, Routes } from 'react-router-dom'
import { configurado } from './lib/firebase'
import { useSession } from './hooks/useSession'
import { BarraTopo, NavMobile, Sidebar } from './components/Chrome'
import { Login } from './pages/Login'
import { Hoje } from './pages/Hoje'
import { Lista } from './pages/Lista'
import { Buscas } from './pages/Buscas'
import { LeadDetalhe } from './pages/LeadDetalhe'
import { Funil } from './pages/Funil'
import { Rodada } from './pages/Rodada'
import { Dados } from './pages/Dados'

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

export default function App() {
  const { usuario, carregando } = useSession()

  if (!configurado) return <SetupPendente />
  if (carregando) return <p className="aviso-tela">Carregando…</p>
  if (!usuario) return <Login />

  return (
    <div className="app">
      <Sidebar usuario={usuario} />

      <div className="coluna-principal">
        <BarraTopo />
        <main className="conteudo">
          <Routes>
            <Route path="/" element={<Hoje />} />
            <Route path="/lista" element={<Lista />} />
            <Route path="/buscas" element={<Buscas />} />
            <Route path="/lead/:id" element={<LeadDetalhe />} />
            <Route path="/rodada" element={<Rodada />} />
            <Route path="/funil" element={<Funil />} />
            <Route path="/dados" element={<Dados />} />
          </Routes>
        </main>
      </div>

      <NavMobile />
    </div>
  )
}
