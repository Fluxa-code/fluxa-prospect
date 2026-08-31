import { useRef, useState } from 'react'
import { Download, FolderOpen, LogOut } from 'lucide-react'
import { useImporta, useLeads, useTodosContatos } from '../hooks/useLeads'
import type { RelatorioImportacao } from '../hooks/useLeads'
import type { ImportResult } from '../lib/importer'
import { parseArquivo } from '../lib/importer'
import { baixaArquivo, exportaCsv, exportaJson } from '../lib/exporter'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { hojeIso } from '../lib/format'

export function Dados() {
  const { data: leads } = useLeads()
  const { data: contatos } = useTodosContatos()
  const importa = useImporta()
  const inputRef = useRef<HTMLInputElement>(null)

  const [pendente, setPendente] = useState<{ nome: string; resultado: ImportResult } | null>(null)
  const [relatorio, setRelatorio] = useState<RelatorioImportacao | null>(null)
  const [erro, setErro] = useState('')

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    setErro('')
    setRelatorio(null)
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    try {
      const conteudo = await arquivo.text()
      setPendente({ nome: arquivo.name, resultado: parseArquivo(arquivo.name, conteudo) })
    } catch (err) {
      setErro(`Não consegui ler o arquivo: ${err instanceof Error ? err.message : String(err)}`)
    }
    e.target.value = ''
  }

  async function confirmar() {
    if (!pendente) return
    setErro('')
    try {
      const rel = await importa.mutateAsync(pendente.resultado)
      setRelatorio(rel)
      setPendente(null)
    } catch (err) {
      setErro(`Importação falhou: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <div className="pagina">
      <header className="pagina-topo">
        <h2>Dados</h2>
      </header>

      <h3 className="secao">Exportar (backup versionável)</h3>
      <div className="chips-row">
        <button
          className="btn btn-gold"
          disabled={!leads || !contatos}
          onClick={() =>
            baixaArquivo(
              `leads_vila_barros_${hojeIso()}.json`,
              exportaJson(leads!, contatos!),
              'application/json',
            )
          }
        >
          <Download size={16} /> Exportar JSON
        </button>
        <button
          className="btn btn-ghost"
          disabled={!leads || !contatos}
          onClick={() =>
            baixaArquivo(
              `leads_vila_barros_${hojeIso()}.csv`,
              exportaCsv(leads!, contatos!),
              'text/csv',
            )
          }
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>
      <p className="sub explicacao">
        O JSON exportado reimporta sem perder nada (contatos estruturados inclusos). Commita ele no
        git como backup.
      </p>

      <h3 className="secao">Importar JSON/CSV</h3>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv"
        hidden
        onChange={aoEscolherArquivo}
      />
      <button className="btn btn-ghost" onClick={() => inputRef.current?.click()}>
        <FolderOpen size={16} /> Escolher arquivo…
      </button>
      <p className="sub explicacao">
        Importar sobrescreve os campos dos leads presentes no arquivo (contatos nunca são apagados,
        só adicionados). Use para a carga inicial ou para restaurar um backup.
      </p>

      {pendente && (
        <div className="card importacao">
          <strong>{pendente.nome}</strong>
          <p>
            {pendente.resultado.leads.length} leads · {pendente.resultado.contatos.length} contatos
            no histórico
          </p>
          {pendente.resultado.descartados.length > 0 && (
            <p className="erro">
              Descartados (sem id/nome): {pendente.resultado.descartados.join(', ')}
            </p>
          )}
          {pendente.resultado.avisos.length > 0 && (
            <div className="avisos">
              <strong>⚠ Avisos:</strong>
              <ul>
                {pendente.resultado.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="form-acoes">
            <button className="btn btn-ghost" onClick={() => setPendente(null)}>
              Cancelar
            </button>
            <button className="btn btn-gold" disabled={importa.isPending} onClick={confirmar}>
              {importa.isPending ? 'Importando…' : 'Confirmar importação'}
            </button>
          </div>
        </div>
      )}

      {relatorio && (
        <div className="card importacao ok">
          <strong>Importação concluída ✓</strong>
          <p>
            {relatorio.leadsNovos} leads novos · {relatorio.leadsAtualizados} atualizados ·{' '}
            {relatorio.contatosNovos} contatos novos
            {relatorio.contatosJaExistiam > 0 &&
              ` · ${relatorio.contatosJaExistiam} contatos já existiam (ignorados)`}
          </p>
          {relatorio.avisos.length > 0 && (
            <div className="avisos">
              <strong>⚠ Para revisar:</strong>
              <ul>
                {relatorio.avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {erro && <p className="erro">{erro}</p>}

      <h3 className="secao">Sessão</h3>
      <button className="btn btn-ghost" onClick={() => signOut(auth)}>
        <LogOut size={16} /> Sair
      </button>
    </div>
  )
}
