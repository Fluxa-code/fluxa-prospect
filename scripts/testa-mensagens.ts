// Mostra a mensagem sugerida de leads de um arquivo de lote.
// Rodar: npx tsx scripts/testa-mensagens.ts <arquivo.json> [id ...]
import { readFileSync } from 'node:fs'
import { escopoDoLead, mensagemSugerida } from '../src/lib/mensagens'
import type { Lead } from '../src/lib/types'

const [arquivo, ...ids] = process.argv.slice(2)
if (!arquivo) {
  console.error('uso: npx tsx scripts/testa-mensagens.ts <arquivo.json> [id ...]')
  process.exit(1)
}

const bruto = JSON.parse(readFileSync(arquivo, 'utf8'))
const dados = (Array.isArray(bruto) ? bruto : bruto.leads) as Lead[]
const alvo = ids.length ? dados.filter((l) => ids.includes(String(l.id))) : dados.slice(0, 3)

for (const l of alvo) {
  console.log(`==== ${l.nome} [${escopoDoLead(l)} x ${l.cat}] ====`)
  console.log(mensagemSugerida(l))
  console.log()
}
