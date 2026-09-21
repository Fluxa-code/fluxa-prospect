// Apaga a base antiga (leads id <= 230 e seus contatos) do Firestore,
// com backup re-importável salvo em Downloads antes de qualquer exclusão.
// Rodar: npx tsx scripts/limpa-base-antiga.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { initializeApp } from 'firebase/app'
import { inMemoryPersistence, initializeAuth, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  writeBatch,
} from 'firebase/firestore'
import type { Contato, Lead } from '../src/lib/types'
import { exportaJson } from '../src/lib/exporter'

const CORTE_ID = 230
const EMAIL = 'deivid123.leite@gmail.com'

function leEnv(): Record<string, string> {
  const texto = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const env: Record<string, string> = {}
  for (const linha of texto.split('\n')) {
    const m = linha.match(/^\s*([A-Z_]+)\s*=\s*"?([^"\r]*)"?\s*$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

async function main() {
  const env = leEnv()
  const app = initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  })
  const auth = initializeAuth(app, { persistence: inMemoryPersistence })
  const rl = createInterface({ input: process.stdin, output: process.stdout })

  const senha = await rl.question(`Senha do app (${EMAIL}): `)
  await signInWithEmailAndPassword(auth, EMAIL, senha.trim())
  console.log('Login ok.\n')

  const db = getFirestore(app)
  const leadsSnap = await getDocs(collection(db, 'leads'))
  const contatosSnap = await getDocs(collection(db, 'contatos'))

  const antigos = leadsSnap.docs.filter((d) => Number(d.id) <= CORTE_ID)
  const contatosAntigos = contatosSnap.docs.filter(
    (d) => Number((d.data() as Contato).lead_id) <= CORTE_ID,
  )
  const mantidos = leadsSnap.size - antigos.length

  if (antigos.length === 0) {
    console.log('Nenhum lead com id <= 230 no banco. Nada a fazer.')
    rl.close()
    return
  }

  // Backup re-importável (mesmo formato do Exportar JSON do app)
  const backupLeads = antigos.map((d) => d.data() as Lead)
  const backupContatos = contatosAntigos.map(
    (d) => ({ id: d.id, ...(d.data() as Omit<Contato, 'id'>) }) as Contato,
  )
  const caminhoBackup = `C:/Users/deivi/Downloads/backup_base_antiga_${new Date().toISOString().slice(0, 10)}.json`
  writeFileSync(caminhoBackup, exportaJson(backupLeads, backupContatos))

  console.log(`Backup salvo: ${caminhoBackup}`)
  console.log(`\nVai APAGAR: ${antigos.length} leads (id <= ${CORTE_ID}) e ${contatosAntigos.length} contatos.`)
  console.log(`Ficam no banco: ${mantidos} leads (lotes novos, id >= 1001).\n`)

  const confirma = await rl.question('Digite APAGAR (maiúsculo) para confirmar: ')
  rl.close()
  if (confirma.trim() !== 'APAGAR') {
    console.log('Cancelado. Nada foi apagado.')
    return
  }

  const alvos = [
    ...antigos.map((d) => doc(db, 'leads', d.id)),
    ...contatosAntigos.map((d) => doc(db, 'contatos', d.id)),
  ]
  for (let i = 0; i < alvos.length; i += 400) {
    const lote = writeBatch(db)
    for (const ref of alvos.slice(i, i + 400)) lote.delete(ref)
    await lote.commit()
    console.log(`...${Math.min(i + 400, alvos.length)}/${alvos.length}`)
  }
  console.log(`\nFeito. ${antigos.length} leads e ${contatosAntigos.length} contatos apagados.`)
  console.log('Se bater arrependimento: Dados → Importar → o arquivo de backup restaura tudo.')
}

main().catch((e) => {
  console.error('ERRO:', e instanceof Error ? e.message : e)
  process.exit(1)
})
