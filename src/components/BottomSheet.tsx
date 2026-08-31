import type { ReactNode } from 'react'

export function BottomSheet({
  aberto,
  titulo,
  onFechar,
  children,
}: {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: ReactNode
}) {
  if (!aberto) return null
  return (
    <div className="sheet-backdrop" onClick={onFechar}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-alca" />
        <h3>{titulo}</h3>
        {children}
      </div>
    </div>
  )
}
