/** Buscas de leads pedidas pelo app e executadas pelo agente que roda no PC. */

export type StatusBusca = 'na_fila' | 'rodando' | 'concluida' | 'erro'

export type TamanhoBusca = 'rapida' | 'padrao' | 'completa' | 'cidade'

export interface Busca {
  id: string
  termos: string[]
  cidade: string
  uf: string
  bairro: string
  tamanho: TamanhoBusca
  status: StatusBusca
  criado_em: string
  iniciado_em?: string
  concluido_em?: string
  /** o que o agente está fazendo agora ("buscando no mapa", "auditando sites…") */
  progresso?: string
  encontrados?: number
  novos?: number
  repetidos?: number
  erro?: string
}

export const TAMANHOS: Record<
  TamanhoBusca,
  { rotulo: string; quanto: string; tempo: string; depth: number; grid: number; maxTime: number }
> = {
  rapida: {
    rotulo: 'Rápida',
    quanto: '~20 empresas',
    tempo: '2 min',
    depth: 1,
    grid: 0,
    maxTime: 600,
  },
  padrao: {
    rotulo: 'Padrão',
    quanto: '60 a 120',
    tempo: '5 a 10 min',
    depth: 5,
    grid: 0,
    maxTime: 900,
  },
  completa: {
    rotulo: 'Completa',
    quanto: 'até 120',
    tempo: '10 a 15 min',
    depth: 10,
    grid: 0,
    maxTime: 1200,
  },
  cidade: {
    rotulo: 'Cidade inteira',
    quanto: '200 a 600',
    tempo: '30 a 60 min',
    depth: 5,
    grid: 3,
    maxTime: 900,
  },
}

export const STATUS_ROTULO: Record<StatusBusca, string> = {
  na_fila: 'Na fila',
  rodando: 'Rodando',
  concluida: 'Concluída',
  erro: 'Deu erro',
}

/** Sugestões de nicho — as mesmas do portal, mais as categorias que o Deivid trabalha. */
export const NICHOS_SUGERIDOS = [
  'restaurantes',
  'food trucks',
  'adegas',
  'barbearias',
  'salões de beleza',
  'studios de cílios',
  'pet shops',
  'oficinas mecânicas',
  'gráficas',
  'clínicas odontológicas',
  'lojas de material de construção',
  'academias',
  'escolas de idiomas',
  'assistência técnica de celular',
  'marmorarias',
  'confeitarias',
]
