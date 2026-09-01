import type { Lead } from './types'

// Mensagem sugerida = gancho (escopo do problema do site) + proposta (categoria) + CTA.
// Texto pensado para WhatsApp frio: curto, problema concreto, sem parecer disparo em massa.

export type Escopo =
  | 'quebrado'
  | 'obsoleto'
  | 'datado'
  | 'so_redes'
  | 'sem_presenca'
  | 'aceitavel'
  | 'moderno'
  | 'franquia'
  | 'generico'

export function escopoDoLead(lead: Lead): Escopo {
  const estado = lead.estado.toLowerCase()
  if (estado.includes('quebrado')) return 'quebrado'
  if (estado.includes('obsoleto')) return 'obsoleto'
  if (estado.includes('datado')) return 'datado'
  if (estado.includes('redes')) return 'so_redes'
  if (estado.includes('sem presen')) return 'sem_presenca'
  if (estado.includes('aceit')) return 'aceitavel'
  if (estado.includes('moderno')) return 'moderno'
  if (estado.includes('franquia')) return 'franquia'
  return 'generico'
}

export const ESCOPO_ROTULO: Record<Escopo, string> = {
  quebrado: 'site quebrado',
  obsoleto: 'site obsoleto',
  datado: 'site datado',
  so_redes: 'só redes sociais',
  sem_presenca: 'sem presença digital',
  aceitavel: 'site aceitável',
  moderno: 'site moderno',
  franquia: 'site da franquia',
  generico: 'genérico',
}

const GANCHO: Record<Escopo, (l: Lead) => string> = {
  quebrado: (l) =>
    `Fui procurar o site da ${l.nome} e ele está fora do ar — quem encontra vocês no Google clica e cai no erro. Isso costuma perder cliente sem ninguém perceber.`,
  obsoleto: (l) =>
    `Vi o site da ${l.nome}: está no ar, mas parado no tempo. No celular ele não passa a imagem que o negócio merece.`,
  datado: (l) =>
    `Vi o site da ${l.nome} e ele está funcionando, mas com cara de alguns anos atrás — dá pra modernizar sem começar do zero.`,
  so_redes: (l) =>
    `Vi que a ${l.nome} tem movimento nas redes, mas quem pesquisa no Google não encontra um site de vocês — e tem cliente que só fecha depois de ver um.`,
  sem_presenca: (l) =>
    `Procurei a ${l.nome} no Google e não achei site nem página própria — hoje quem busca "${l.segmento.toLowerCase()} perto de mim" está caindo direto no concorrente.`,
  aceitavel: (l) =>
    `Vi o site da ${l.nome} — está bem estruturado. Meu papo é outro: colocar mais gente dentro dele, com Google e tráfego pago.`,
  moderno: (l) =>
    `O site da ${l.nome} está bonito — meu papo não é refazer nada, é trazer mais visita qualificada pra ele com Google e tráfego pago.`,
  franquia: (l) =>
    `Vi que a ${l.nome} aparece só na página da rede — uma página própria da unidade coloca vocês na frente de quem busca aqui na região.`,
  generico: (l) =>
    `Dei uma olhada na presença digital da ${l.nome} e vi espaço claro pra trazer mais cliente pelo Google e WhatsApp.`,
}

const PROPOSTA: Record<string, string> = {
  Restaurante: 'cardápio online e pedido caindo direto no seu WhatsApp, sem taxa de aplicativo',
  Alimentação: 'produtos e ofertas no ar, com pedido e encomenda pelo WhatsApp',
  Varejo: 'catálogo dos produtos com botão de comprar pelo WhatsApp',
  Automotivo: 'orçamento rápido pelo WhatsApp e presença no Google pra quem busca peça e serviço na região',
  Gráfica: 'portfólio online e orçamento chegando pelo WhatsApp em dois cliques',
  Logística: 'página com cotação e contato direto, passando confiança pra fechar contrato com empresa',
  Saúde: 'agendamento simples pelo site e WhatsApp, sem telefone ocupado',
  Tecnologia: 'vitrine dos serviços e captação de orçamentos por quem busca no Google',
  Construção: 'portfólio de obras e pedido de orçamento direto no WhatsApp',
  Beleza: 'agendamento online e vitrine dos serviços pra quem descobre vocês no Instagram e no Google',
  Casa: 'portfólio dos trabalhos e orçamento pelo WhatsApp',
  Indústria: 'site institucional que passa solidez pra comprador e fornecedor',
  Serviços: 'página que transforma busca no Google em orçamento no seu WhatsApp',
  Esporte: 'página com planos e horários, com matrícula começando pelo WhatsApp',
  Educação: 'página com cursos e turmas, com matrícula começando pelo WhatsApp',
  Pet: 'agendamento de banho e tosa pelo WhatsApp e presença no Google pra quem procura na região',
}

const PROPOSTA_PADRAO = 'presença no Google e orçamentos chegando direto no seu WhatsApp'

export function mensagemSugerida(lead: Lead): string {
  const gancho = GANCHO[escopoDoLead(lead)](lead)
  const proposta = PROPOSTA[lead.cat] ?? PROPOSTA_PADRAO
  return (
    `Oi, tudo bem? Aqui é o Deivid, da Fluxa — trabalho com sites e presença digital aqui em Guarulhos.\n\n` +
    `${gancho}\n\n` +
    `A ideia pra vocês: ${proposta}.\n\n` +
    `Posso te mandar um diagnóstico rápido e gratuito do que eu mudaria? São 3 pontos, sem compromisso.`
  )
}
