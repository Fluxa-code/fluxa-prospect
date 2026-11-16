/**
 * Raio-x da base: total de leads, distribuição por origem/estágio e nomes repetidos.
 *   npx tsx scripts/resumo-base.ts
 */
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, getFirestore } from 'firebase/firestore'
import type { Lead } from '../src/lib/types'
import { semAcento } from '../src/lib/gmaps'

function env(): Record<string, string> {
  const texto = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const vars: Record<string, string> = {}
  for (const linha of texto.split('\n')) {
    const m = linha.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\r]*)"?\s*$/)
    if (m) vars[m[1]] = m[2]
  }
  return vars
}

async function main() {
  const vars = env()
  const app = initializeApp({
    apiKey: vars.VITE_FIREBASE_API_KEY,
    authDomain: vars.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: vars.VITE_FIREBASE_PROJECT_ID,
    appId: vars.VITE_FIREBASE_APP_ID,
  })
  await signInWithEmailAndPassword(getAuth(app), vars.FLUXA_EMAIL, vars.FLUXA_SENHA)
  const db = getFirestore(app)

  const leads = (await getDocs(collection(db, 'leads'))).docs.map((d) => d.data() as Lead)
  console.log(`total de leads: ${leads.length}`)

  const conta = (f: (l: Lead) => string) => {
    const m: Record<string, number> = {}
    for (const l of leads) m[f(l) || '(vazio)'] = (m[f(l) || '(vazio)'] ?? 0) + 1
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }

  console.log('\npor estágio:', Object.fromEntries(conta((l) => l.estagio)))
  console.log('por tier:   ', Object.fromEntries(conta((l) => l.tier)))
  console.log(
    '\npor origem:',
    Object.fromEntries(conta((l) => String(l.auditoria?.origem ?? '').slice(0, 60))),
  )

  const porNome: Record<string, number[]> = {}
  for (const l of leads) {
    const k = semAcento(l.nome)
    ;(porNome[k] ??= []).push(l.id)
  }
  const repetidos = Object.entries(porNome).filter(([, ids]) => ids.length > 1)
  console.log(`\nnomes repetidos: ${repetidos.length}`)
  for (const [nome, ids] of repetidos.slice(0, 10)) console.log(`  ${nome}: ids ${ids.join(', ')}`)

  console.log('\nultimos 6 leads criados:')
  const recentes = leads
    .filter((l) => l.criado_em)
    .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))
    .slice(0, 6)
  for (const l of recentes) {
    console.log(
      `  ${l.id} | ${l.nome.slice(0, 26).padEnd(26)} | ${l.cat.padEnd(12)} | ${(l.estado || '(sem estado)').padEnd(24)} | tier ${l.tier} | ${l.telefone || '(sem cel)'}`,
    )
  }

  const buscas = (await getDocs(collection(db, 'buscas'))).docs.map((d) => d.data())
  console.log(`\nbuscas registradas: ${buscas.length}`)
  process.exit(0)
}

main().catch((e) => {
  console.error('ERRO:', e instanceof Error ? e.message : e)
  process.exit(1)
})
