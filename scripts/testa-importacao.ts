// Teste de mesa do importador contra os arquivos reais do Deivid.
// Rodar: npx tsx scripts/testa-importacao.ts <caminho.json> [caminho.csv]
import { readFileSync } from 'node:fs'
import { parseArquivo } from '../src/lib/importer'

for (const caminho of process.argv.slice(2)) {
  const resultado = parseArquivo(caminho, readFileSync(caminho, 'utf8'))
  console.log(`\n=== ${caminho} ===`)
  console.log(`leads: ${resultado.leads.length} | contatos: ${resultado.contatos.length}`)
  console.log(`descartados: ${resultado.descartados.length}`, resultado.descartados)
  console.log('avisos:')
  for (const a of resultado.avisos) console.log('  -', a)

  console.log('contatos estruturados:')
  for (const c of resultado.contatos) {
    const lead = resultado.leads.find((l) => l.id === c.lead_id)
    console.log(
      `  ${lead?.nome} | ${c.em.slice(0, 10)} | ${c.canal} | enviado="${c.enviado}" | resposta="${c.resposta}"`,
    )
  }

  const porVerificacao: Record<string, number> = {}
  const porCanal: Record<string, number> = {}
  const porEstagio: Record<string, number> = {}
  for (const l of resultado.leads) {
    porVerificacao[l.verificacao] = (porVerificacao[l.verificacao] ?? 0) + 1
    porCanal[l.canal_status] = (porCanal[l.canal_status] ?? 0) + 1
    porEstagio[l.estagio] = (porEstagio[l.estagio] ?? 0) + 1
  }
  console.log('verificacao:', porVerificacao)
  console.log('canal_status:', porCanal)
  console.log('estagio:', porEstagio)

  const exemplo = resultado.leads.find((l) => l.id === 227)
  if (exemplo) {
    console.log('auditoria do lead 227 (chaves):', Object.keys(exemplo.auditoria).join(', '))
  }
}
