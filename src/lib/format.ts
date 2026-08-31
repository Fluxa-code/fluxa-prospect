export function dataCurta(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function dataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function moeda(v: number | null | undefined): string {
  if (v === null || v === undefined) return ''
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function hojeIso(): string {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function somaDias(baseIso: string, dias: number): string {
  const d = new Date(`${baseIso}T12:00:00`)
  d.setDate(d.getDate() + dias)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

export function diasAtraso(followupIso: string): number {
  const hoje = new Date(`${hojeIso()}T12:00:00`).getTime()
  const alvo = new Date(`${followupIso}T12:00:00`).getTime()
  return Math.round((hoje - alvo) / 86_400_000)
}

/** Telefone BR anotado à mão → link wa.me. Retorna null se não der para montar. */
export function linkWhatsapp(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, '')
  if (digitos.length < 10) return null
  const completo = digitos.startsWith('55') ? digitos : `55${digitos}`
  return `https://wa.me/${completo}`
}

export function linkTelefone(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, '')
  if (digitos.length < 8) return null
  return `tel:+${digitos.startsWith('55') ? digitos : `55${digitos}`}`
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Busca por nome/rua ignorando acento e caixa. */
export function combinaBusca(texto: string, busca: string): boolean {
  return semAcento(texto).toLowerCase().includes(semAcento(busca).toLowerCase().trim())
}
