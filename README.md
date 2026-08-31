# Fluxa Prospect

App de gestão de prospecção da Fluxa — leads de comércios locais (Vila Barros, Guarulhos),
status de canal, histórico de contato, follow-ups e funil. PWA mobile-first, sem servidor
próprio: React + Vite no front, Firebase (Firestore + Auth) como banco.

## Setup (uma vez só)

### 1. Criar o projeto no Firebase

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
   (nome livre, ex.: `fluxa-prospect`). Pode desativar o Google Analytics.
2. Não precisa de cartão — o plano Spark (gratuito) cobre isso com folga.

### 2. Autenticação

1. **Authentication → Get started → Sign-in method**: ative **Email/Password**
   (só o primeiro toggle; "Email link" pode ficar desligado).
2. **Authentication → Users → Add user**: e-mail `deivid123.leite@gmail.com` + senha forte.
3. **Authentication → Settings → User actions**: desmarque **Enable create (sign-up)**,
   para ninguém conseguir criar conta. (Mesmo se esquecer, as regras do Firestore só
   aceitam o seu e-mail.)

### 3. Banco (Firestore)

1. **Firestore Database → Create database** → modo **production** →
   região `southamerica-east1` (São Paulo).
2. Aba **Rules**: substitua tudo pelo conteúdo de
   [`firebase/firestore.rules`](firebase/firestore.rules) e clique **Publish**.
3. Não precisa criar coleções — o app cria `leads` e `contatos` na primeira importação.

### 4. Configurar o app

1. **Project settings (engrenagem) → General → Your apps → ícone `</>` (Web)**:
   registre o app (sem Firebase Hosting) e copie do bloco de config:
   `apiKey`, `authDomain`, `projectId`, `appId`.
2. Na raiz do projeto:

```bash
cp .env.example .env.local
```

e preencha os quatro valores.

### 5. Rodar

```bash
npm install
npm run dev
```

Faça login e vá em **Dados → Importar** para subir o `leads_vila_barros.json` (carga inicial —
o histórico em texto vira contatos estruturados automaticamente).

## Deploy (Vercel)

1. Suba este repositório para o GitHub (repo privado).
2. [vercel.com](https://vercel.com) → Add New Project → importe o repo. Framework: Vite.
3. Em **Environment Variables**, adicione as quatro variáveis `VITE_FIREBASE_*`.
4. Deploy. Depois, no Firebase: **Authentication → Settings → Authorized domains** →
   adicione o domínio `*.vercel.app` que a Vercel te deu.
5. No celular, abra a URL → menu do navegador → **Adicionar à tela inicial**.

## Backup

**Dados → Exportar JSON** gera o arquivo canônico (mesmo formato do original + contatos
estruturados). Commite no git de tempos em tempos — é seu seguro de portabilidade.
O CSV exportado mantém as colunas da planilha original.

## Decisões de arquitetura

- **Firebase** (decisão 2026-08-31, depois do free tier do Supabase encher): Firestore +
  Auth no plano gratuito, sem pausa por inatividade; PC e celular veem a mesma base.
- **Regras amarradas ao e-mail do Deivid**: a config pública do Firebase não dá acesso a
  nada sem a sessão dele.
- **Cache offline do Firestore ligado**: leitura funciona sem sinal; escrita espera conexão.
- **Campos de auditoria** (evidência, oportunidade, sinais etc.) preservados intocados em
  `auditoria` — o export devolve o JSON no formato original.
- **PWA** em vez de .exe/APK: mesma segurança (a porta é o login), atualização automática.
