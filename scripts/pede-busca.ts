/**
 * Enfileira uma busca sem passar pela tela — útil para teste e para a linha de comando.
 *
 *   npx tsx scripts/pede-busca.ts "food trucks" --cidade Guarulhos --uf SP --tamanho rapida
 *   npx tsx scripts/pede-busca.ts "adegas, distribuidora de bebidas" --bairro "Vila Barros"
 */
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { addDoc, collection, getFirestore } from 'firebase/firestore'
import { TAMANHOS, type TamanhoBusca } from '../src/lib/buscas'

function env(): Record<string, string> {
  const texto = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const vars: Record<string, string> = {}
  for (const linha of texto.split('\n')) {
    const m = linha.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\r]*)"?\s*$/)
    if (m) vars[m[1]] = m[2]
  }
  return vars
}

const arg = (nome: string, padrao = '') => {
  const i = process.argv.indexOf(`--${nome}`)
  return i >= 0 ? (process.argv[i + 1] ?? padrao) : padrao
}

async function main() {
  const termos = (process.argv[2] ?? '')
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (!termos.length) {
    console.error('uso: npx tsx scripts/pede-busca.ts "nicho1, nicho2" [--cidade X] [--uf SP] [--bairro Y] [--tamanho rapida|padrao|completa|cidade]')
    process.exit(1)
  }
  const tamanho = (arg('tamanho', 'rapida') as TamanhoBusca) ?? 'rapida'
  if (!TAMANHOS[tamanho]) {
    console.error(`tamanho inválido: ${tamanho}`)
    process.exit(1)
  }

  const vars = env()
  const app = initializeApp({
    apiKey: vars.VITE_FIREBASE_API_KEY,
    authDomain: vars.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: vars.VITE_FIREBASE_PROJECT_ID,
    appId: vars.VITE_FIREBASE_APP_ID,
  })
  await signInWithEmailAndPassword(getAuth(app), vars.FLUXA_EMAIL, vars.FLUXA_SENHA)

  const ref = await addDoc(collection(getFirestore(app), 'buscas'), {
    termos,
    cidade: arg('cidade', 'Guarulhos'),
    uf: arg('uf', 'SP'),
    bairro: arg('bairro'),
    tamanho,
    status: 'na_fila',
    criado_em: new Date().toISOString(),
  })
  console.log('busca enfileirada:', ref.id, '→', termos.join(', '), `(${tamanho})`)
  process.exit(0)
}

main().catch((e) => {
  console.error('ERRO:', e instanceof Error ? e.message : e)
  process.exit(1)
})
