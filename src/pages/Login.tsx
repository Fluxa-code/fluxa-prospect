import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase'

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await signInWithEmailAndPassword(auth, email, senha)
    } catch (err) {
      const codigo = (err as { code?: string }).code ?? ''
      setErro(
        codigo === 'auth/invalid-credential' || codigo === 'auth/wrong-password'
          ? 'E-mail ou senha errados.'
          : codigo === 'auth/network-request-failed'
            ? 'Sem conexão — confere o sinal e tenta de novo.'
            : `Login falhou (${codigo || 'erro desconhecido'}).`,
      )
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="login">
      <div className="marca-logo grande">F</div>
      <h1>
        Fluxa <span className="gold">Prospect</span>
      </h1>
      <p className="sub">Prospecção Vila Barros</p>
      <form onSubmit={entrar} className="form">
        <input
          className="input"
          type="email"
          placeholder="e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <input
          className="input"
          type="password"
          placeholder="senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
        />
        {erro && <p className="erro">{erro}</p>}
        <button className="btn btn-gold" type="submit" disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
