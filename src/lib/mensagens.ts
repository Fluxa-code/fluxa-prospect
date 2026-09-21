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

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Primeira palavra masculina pede "o/do"; o resto do nome segue "a/da" (a loja, a clínica).
const INICIO_MASCULINO = [
  'dr', 'consultorio', 'instituto', 'centro', 'espaco', 'studio', 'estudio', 'buffet',
  'restaurante', 'supermercado', 'mercado', 'salao', 'atelie', 'emporio', 'grupo',
  'hospital', 'laboratorio', 'posto', 'box',
]

function artigo(l: Lead): 'o' | 'a' {
  const primeira = semAcento(l.nome).split(/[\s.]+/)[0] ?? ''
  return INICIO_MASCULINO.includes(primeira) ? 'o' : 'a'
}

/** "o Dr. João" / "a Dra. Ana" / "a Padaria X" */
const oNome = (l: Lead) => `${artigo(l)} ${l.nome}`
/** "do Dr. João" / "da Dra. Ana" / "da Padaria X" */
const doNome = (l: Lead) => `d${artigo(l)} ${l.nome}`

const GANCHO: Record<Escopo, (l: Lead) => string> = {
  quebrado: (l) =>
    `Fui procurar o site ${doNome(l)} e ele está fora do ar — quem encontra vocês no Google clica e cai no erro. Isso costuma perder cliente sem ninguém perceber.`,
  obsoleto: (l) =>
    `Vi o site ${doNome(l)}: está no ar, mas parado no tempo. No celular ele não passa a imagem que o negócio merece.`,
  datado: (l) =>
    `Vi o site ${doNome(l)} e ele está funcionando, mas com cara de alguns anos atrás — dá pra modernizar sem começar do zero.`,
  so_redes: (l) =>
    `Vi que ${oNome(l)} tem movimento nas redes, mas procurei o site de vocês no Google e não consegui achar — e tem cliente que só fecha depois de ver um.`,
  sem_presenca: (l) =>
    `Procurei ${oNome(l)} no Google e não achei site nem página própria — hoje quem busca "${l.segmento.toLowerCase()} perto de mim" está caindo direto no concorrente.`,
  aceitavel: (l) =>
    `Vi o site ${doNome(l)} — está bem estruturado. Meu papo é outro: colocar mais gente dentro dele, com Google e tráfego pago.`,
  moderno: (l) =>
    `O site ${doNome(l)} está bonito — meu papo não é refazer nada, é trazer mais visita qualificada pra ele com Google e tráfego pago.`,
  franquia: (l) =>
    `Procurando ${oNome(l)} no Google, só achei a página da rede — uma página própria da unidade coloca vocês na frente de quem busca aqui na região.`,
  generico: (l) =>
    `Dei uma olhada na presença digital ${doNome(l)} e vi espaço claro pra trazer mais cliente pelo Google e WhatsApp.`,
}

// Em saúde o site bom não é o problema — o gargalo é marcar consulta. Pergunta em vez de
// afirmar: a auditoria pode não ter visto um agendamento escondido.
const GANCHO_SAUDE: Partial<Record<Escopo, (l: Lead) => string>> = {
  aceitavel: (l) =>
    `Entrei no site ${doNome(l)} — está bem feito. A pergunta que eu faria: hoje o paciente consegue marcar consulta sozinho, a qualquer hora, sem depender de alguém responder?`,
  moderno: (l) =>
    `O site ${doNome(l)} está muito bem feito. A pergunta que eu faria: hoje o paciente consegue marcar consulta sozinho, a qualquer hora, sem depender de alguém responder?`,
}

function abertura(l: Lead): string {
  if (semAcento(l.endereco).includes('guarulhos')) {
    return 'trabalho com sites e presença digital aqui em Guarulhos'
  }
  if (l.cat === 'Saúde') return 'trabalho com sites e agendamento online para consultórios'
  return 'trabalho com sites e presença digital para negócios de todo o Brasil'
}

function fechamento(l: Lead): string {
  const cta = 'Posso te mandar um diagnóstico rápido e gratuito do que eu mudaria? São 3 pontos, sem compromisso.'
  if (l.cat !== 'Saúde') return cta
  const nome = semAcento(l.nome)
  const quem = /^dra\b/.test(nome) ? 'pra doutora' : /^dr\b/.test(nome) ? 'pro doutor' : 'pra quem decide'
  return `${cta}\n\nSe quem cuida disso não for você, pode encaminhar ${quem} 🙂`
}

const PROPOSTA: Record<string, string> = {
  Restaurante: 'cardápio online e pedido caindo direto no seu WhatsApp, sem taxa de aplicativo',
  Alimentação: 'produtos e ofertas no ar, com pedido e encomenda pelo WhatsApp',
  Varejo: 'catálogo dos produtos com botão de comprar pelo WhatsApp',
  Automotivo: 'orçamento rápido pelo WhatsApp e presença no Google pra quem busca peça e serviço na região',
  Gráfica: 'portfólio online e orçamento chegando pelo WhatsApp em dois cliques',
  Logística: 'página com cotação e contato direto, passando confiança pra fechar contrato com empresa',
  Saúde: 'o paciente marca a consulta sozinho, pelo site ou pelo WhatsApp, a qualquer hora — com confirmação e lembrete automáticos: menos falta e a secretária livre do telefone',
  Tecnologia: 'vitrine dos serviços e captação de orçamentos por quem busca no Google',
  Construção: 'portfólio de obras e pedido de orçamento direto no WhatsApp',
  Beleza: 'agenda online com chatbot no WhatsApp que confirma e lembra a cliente — menos furo de horário — e vitrine dos serviços no Google',
  Barbearia: 'agenda online com chatbot no WhatsApp que confirma e lembra o cliente — menos cadeira vazia — sem pagar aluguel de plataforma de agendamento',
  Casa: 'portfólio dos trabalhos e orçamento pelo WhatsApp',
  Indústria: 'site institucional que passa solidez pra comprador e fornecedor',
  Serviços: 'página que transforma busca no Google em orçamento no seu WhatsApp',
  Esporte: 'página com planos e horários e chatbot no WhatsApp agendando aula experimental e matrícula',
  Educação: 'página com cursos e turmas e chatbot no WhatsApp tirando dúvida e agendando matrícula',
  Pet: 'agendamento de banho e tosa com chatbot no WhatsApp que confirma e lembra o tutor, e presença no Google',
}

const PROPOSTA_PADRAO = 'presença no Google e orçamentos chegando direto no seu WhatsApp'

export function mensagemSugerida(lead: Lead): string {
  const escopo = escopoDoLead(lead)
  const saude = lead.cat === 'Saúde'
  const gancho = (saude ? GANCHO_SAUDE[escopo] : undefined) ?? GANCHO[escopo]
  const textoGancho = saude ? gancho(lead).replace(/\bcliente\b/g, 'paciente') : gancho(lead)
  const proposta = PROPOSTA[lead.cat] ?? PROPOSTA_PADRAO
  return (
    `Oi, tudo bem? Aqui é o Deivid, da Fluxa — ${abertura(lead)}.\n\n` +
    `${textoGancho}\n\n` +
    `A ideia pra vocês: ${proposta}.\n\n` +
    fechamento(lead)
  )
}
