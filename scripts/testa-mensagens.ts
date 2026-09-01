import { readFileSync } from 'node:fs'
import { escopoDoLead, mensagemSugerida } from '../src/lib/mensagens'
import type { Lead } from '../src/lib/types'

const dados = JSON.parse(
  readFileSync('C:/Users/deivi/Downloads/leads_vila_barros.json', 'utf8'),
) as Lead[]

for (const id of [227, 15, 161, 48]) {
  const l = dados.find((x) => x.id === id)!
  console.log(`==== ${l.nome} [${escopoDoLead(l)} x ${l.cat}] ====`)
  console.log(mensagemSugerida(l))
  console.log()
}

const escopos: Record<string, number> = {}
for (const l of dados) escopos[escopoDoLead(l)] = (escopos[escopoDoLead(l)] ?? 0) + 1
console.log('cobertura de escopos:', JSON.stringify(escopos))
