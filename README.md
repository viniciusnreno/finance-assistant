# Finance Assistant

Assistente financeiro pessoal via Telegram com dashboard web. Envie gastos por texto ou nota de voz no Telegram e acompanhe tudo em um dashboard protegido por senha.

## Como funciona

- Você manda uma mensagem no Telegram (texto ou áudio): _"gastei 45 reais no almoço"_
- O bot interpreta, categoriza e salva no Supabase
- O bot confirma o que foi registrado
- Acesse o dashboard para ver gráficos, histórico e exportar CSV

## Pré-requisitos

- Conta no [Supabase](https://supabase.com) (gratuito)
- Conta na [Vercel](https://vercel.com) (gratuito)
- Bot do Telegram criado via [@BotFather](https://t.me/BotFather)
- Chave de API de IA: [OpenAI](https://platform.openai.com) ou [Google AI Studio](https://aistudio.google.com) (Gemini)

---

## Passo a passo

### 1. Criar o banco de dados no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e cole o conteúdo de `supabase/migrations/001_create_expenses.sql`
3. Clique em **Run**
4. Anote a **Project URL** e a **service_role key** em **Settings → API**

### 2. Criar o bot do Telegram

1. Abra o Telegram e acesse [@BotFather](https://t.me/BotFather)
2. Envie `/newbot` e siga as instruções
3. Anote o **token** fornecido (formato: `123456789:ABC-DEF...`)
4. Descubra seu **Chat ID**:
   - Mande qualquer mensagem para o seu bot
   - Acesse: `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
   - Localize `"chat":{"id":` no JSON — esse número é o seu Chat ID

### 3. Obter chave de IA

**Opção A — OpenAI (paga, mínimo $5):**
- Acesse [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Crie uma chave e adicione créditos em **Billing**

**Opção B — Gemini (gratuito com limites generosos):**
- Acesse [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Clique em **Create API key**

### 4. Configurar variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Preencha `.env.local`:

```env
# Provedor de IA: openai ou gemini
AI_PROVIDER=gemini

# Modelos
AI_EXPENSE_MODEL=gemini-2.5-flash
AI_TRANSCRIPTION_MODEL=gemini-2.5-flash

# Chave do provedor escolhido
GEMINI_API_KEY=AIza...
# OPENAI_API_KEY=sk-...   ← use esta se AI_PROVIDER=openai

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABC-DEF...
TELEGRAM_WEBHOOK_SECRET=qualquer-string-aleatoria-longa
TELEGRAM_ALLOWED_CHAT_ID=5201640338

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Dashboard
DASHBOARD_PASSWORD=sua-senha-aqui
AUTH_COOKIE_SECRET=outra-string-aleatoria-longa

# Fuso horário
APP_TIMEZONE=America/Sao_Paulo
```

Para gerar strings aleatórias seguras (`TELEGRAM_WEBHOOK_SECRET` e `AUTH_COOKIE_SECRET`):

```bash
openssl rand -hex 32
```

### 5. Testar localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) → vai redirecionar para `/login`.

> O webhook do Telegram não funciona localmente sem um túnel (ex: ngrok). Para testar o fluxo completo, faça o deploy primeiro.

### 6. Deploy na Vercel

**Via CLI:**

```bash
npx vercel
```

**Via site:**
1. Acesse [vercel.com](https://vercel.com) e importe o repositório
2. Em **Settings → Environment Variables**, adicione todas as variáveis do `.env.local`
3. Clique em **Deploy**

### 7. Configurar o webhook do Telegram

Após o deploy, substitua `SEU-DOMINIO` pela URL da sua aplicação na Vercel:

```bash
curl -X POST "https://api.telegram.org/bot<SEU_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://SEU-DOMINIO.vercel.app/api/telegram",
    "secret_token": "SEU_TELEGRAM_WEBHOOK_SECRET",
    "allowed_updates": ["message"],
    "drop_pending_updates": true
  }'
```

Verifique se o webhook foi registrado:

```bash
curl "https://api.telegram.org/bot<SEU_TOKEN>/getWebhookInfo"
```

O campo `"url"` deve mostrar sua URL e `"pending_update_count"` deve ser `0`.

### 8. Testar

Mande uma mensagem para o bot:

> _gastei 35 reais no almoço hoje_

O bot deve responder confirmando o registro. Acesse `https://SEU-DOMINIO.vercel.app/dashboard` para ver o gasto no painel.

---

## Categorias suportadas

| Categoria | Exemplos |
|---|---|
| alimentacao | Restaurante, delivery, lanchonete |
| mercado | Supermercado, feira |
| transporte | Uber, ônibus, metrô, passagem |
| combustivel | Gasolina, posto |
| saude | Farmácia, médico, plano de saúde |
| educacao | Curso, livro, mensalidade escolar |
| lazer | Cinema, streaming, hobby |
| casa | Aluguel, condomínio, reforma |
| assinaturas | Netflix, Spotify, software |
| contas | Luz, água, internet, telefone |
| familia | Presentes, gastos com filhos |
| viagem | Hotel, passagem aérea, turismo |
| outros | Qualquer coisa fora das anteriores |

## Dashboard

| Rota | Descrição |
|---|---|
| `/login` | Autenticação por senha |
| `/dashboard` | Visão geral: cards, gráficos e últimos gastos |
| `/dashboard/transactions` | Histórico completo com filtros, edição e exportação CSV |

## Troca de provedor de IA

Para mudar de OpenAI para Gemini (ou vice-versa), altere apenas estas variáveis na Vercel e faça redeploy:

**Gemini:**
```env
AI_PROVIDER=gemini
AI_EXPENSE_MODEL=gemini-2.5-flash
AI_TRANSCRIPTION_MODEL=gemini-2.5-flash
GEMINI_API_KEY=AIza...
```

**OpenAI:**
```env
AI_PROVIDER=openai
AI_EXPENSE_MODEL=gpt-4o-mini
AI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
OPENAI_API_KEY=sk-...
```
