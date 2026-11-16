import type { ReactNode } from 'react'

/** Cartão de número com ícone, no espírito do painel do Herbert. */
export function Tile({
  rotulo,
  valor,
  nota,
  icone,
  cor = 'gold',
}: {
  rotulo: string
  valor: ReactNode
  nota?: string
  icone: ReactNode
  cor?: 'gold' | 'verde' | 'azul' | 'laranja'
}) {
  return (
    <div className="card tile">
      <div className="tile-topo">
        <span className="tile-rotulo">{rotulo}</span>
        <span className={`tile-icone tile-${cor}`}>{icone}</span>
      </div>
      <strong className="tile-valor">{valor}</strong>
      {nota && <span className="tile-nota">{nota}</span>}
    </div>
  )
}
