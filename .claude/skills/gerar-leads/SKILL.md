---
name: gerar-leads
description: Gera um lote de leads para o Fluxa Prospect pesquisando comércios de uma rua/bairro/categoria na web (diretórios + auditoria de site), no formato JSON do importador do app. Usar quando o Deivid pedir "gerar leads da rua X", "mapear comércios do bairro Y" ou "adicionar categoria Z na base".
---

# Gerar leads para o Fluxa Prospect

Produz `C:\Users\deivi\Downloads\leads_<area>.json` pronto para o app
(tela **Dados → Importar**, que já deduplica contatos e faz upsert por id).

## Entradas (perguntar se faltarem)

1. **Área**: rua/avenida + cidade, ou bairro.
2. **Categoria/recorte**: ex. "concessionárias e seminovos", "tudo automotivo", "salões de beleza".

## Procedimento

1. **Enumerar candidatos** por busca web — fontes que funcionaram bem em Guarulhos:
   `justos.com.br/concessionarias/<cidade>/<bairro>`, `guia.gru.br`, `apontador.com.br`
   (guia de ruas), `solutudo.com.br`, `descubraonline.com`, listagens do Mobiauto/
   NaPista/Chaves na Mão (para automotivo), e buscas `"<nome>" <cidade> telefone instagram`.
   NUNCA raspar o Google Maps (viola os termos e o Deivid vetou).
2. **Enriquecer cada candidato**: telefone (preferir CELULAR/WhatsApp — é o que alimenta
   o botão de WhatsApp do app; fixo vai em `notas`), Instagram, Facebook, site, CNPJ
   (econodata/cnpj.biz confirmam endereço e ano de fundação).
3. **Auditar o site** de quem tem (WebFetch): no ar? DNS resolve? SSL válido? plataforma/CMS
   (rodapé "Desenvolvido por…")? ano de copyright? endereço publicado? A auditoria vira
   `evidencia` (citar textos literais e o erro exato, ex. "ENOTFOUND", "cert *.hostgator.com.br").
4. **Montar o JSON** — array de objetos com estes campos (o importador joga os extras
   para `auditoria` automaticamente):
   `id, nome, segmento, cat, endereco, telefone, cnpj, site, estado, veredito, tier,
   score, cms, instagram, facebook, confianca, verificacao, canal_status, estagio,
   historico, problemas, oportunidade, motivo, evidencia, notas, origem`.
5. **Validar** com `npx tsx scripts/testa-importacao.ts <arquivo>` (0 descartados) e
   avisar o Deivid do caminho do arquivo para importar pelo app.

## Regras de preenchimento (não improvisar)

- **`estado`** — usar EXATAMENTE uma destas strings (alimentam o escopo da mensagem
  sugerida): `Sem presença digital` · `Só redes sociais` · `Site quebrado / domínio
  perdido` · `Site obsoleto` · `Site datado` · `Site aceitável` · `Site moderno` ·
  `Franquia (site da rede)`. Marketplace-só (Mobiauto etc.) e "cartão digital" de
  terceiro contam como `Só redes sociais` (explicar em `problemas`).
- **`veredito`**: slug quando auditado (`quebrado|obsoleto|datado|aceitavel|moderno`), senão `""`.
- **Tier/score** (régua da base): domínio morto ou SSL quebrado → `A` 90–95 ("investiu
  e perdeu"). Negócio vivo (WhatsApp/IG/marketplace ativos) sem site próprio → `B` 70–80.
  Site ok em plataforma (BNDV/AutoCerto/Boom) → `C` 55–65, pitch de tráfego, não de site.
  Só listagem de diretório, sem confirmação de vida → `C` 50 com `confianca: baixa`.
  Provavelmente extinto → `D` 25 com nota para confirmar na rua.
- **`confianca`**: `alta` só com fonte primária (site próprio/CNPJ/IG oficial);
  `media` com fontes cruzadas; `baixa` com diretório único. **`verificacao`**:
  `completa` só quando site E contato E endereço foram confirmados; senão `parcial`.
- **`canal_status`**: sempre `nao_testado` (teste de canal é do Deivid, na rua).
  **`estagio`**: `nao_contatado`. **`historico`**: `""`.
- **Ids**: cada lote usa um bloco de mil livre (base original 1–230; Otávio Braga
  2026-09-11 usou 1001–1025; próximo lote começa em 2001, e assim por diante).
  NUNCA reaproveitar ids — o import faz upsert e sobrescreveria outro lead.
- **Dedupe**: antes de fechar, conferir nome/telefone contra a base (export mais
  recente em Downloads, ou perguntar). Endereços conflitantes entre fontes: registrar
  a divergência em `problemas`/`notas`, nunca escolher em silêncio.
- **Antes de classificar como "sem site"**: testar variações de domínio
  (`<nome>.com.br`, `<nome>.com`, `loja.<nome>.com(.br)`) e procurar link de site
  nas bios de Instagram e páginas de marketplace. Registrar as tentativas negativas
  na `evidencia`. Lição de 2026-09-11: a Melo Automóveis tinha site em
  `loja.meloautomoveis.com` que a pesquisa por nome não achou — o gancho "vocês não
  têm site" saiu errado e a atendente desmontou com um link.
- **Pesquisa nunca prova ausência.** Afirmações sobre o que o lead NÃO tem só em
  primeira pessoa ("procurei e não achei"), nunca categóricas ("vocês não têm") —
  vale para `problemas`, `oportunidade` e qualquer texto que vire mensagem.
- **Nunca inventar dado.** Sem telefone achado = campo vazio + nota "levantar na
  fachada". O Deivid já queimou conversa por dado errado — na dúvida, `baixa` + nota.
- **`origem`**: `"pesquisa web <data> — lote <área>"`.
