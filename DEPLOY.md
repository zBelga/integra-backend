# 🚀 Deploy — Sistema Íntegra

Arquitetura do deploy:

```
┌─────────────────────┐         ┌──────────────────────┐
│   VERCEL            │  HTTPS  │   RAILWAY            │
│   Frontend (React)  │ ──────► │   Backend (Express)  │
│   dist/ estático    │  CORS   │   API + SQLite       │
└─────────────────────┘         └──────────┬───────────┘
                                           │
                                           ▼
                                ┌──────────────────────┐
                                │  SUPABASE            │
                                │  Storage (documentos)│
                                └──────────────────────┘
```

---

## ⚠️ ANTES DE COMEÇAR — leia isto

### 1. Regenere o `package-lock.json`

O `package.json` mudou (scripts novos + `esbuild` movido para `dependencies`).
O Railway usa `npm ci`, que **falha** se o lock estiver dessincronizado:

```bash
npm install
```

Isso atualiza o `package-lock.json`. Commite os dois arquivos juntos.

### 2. O banco SQLite precisa de um Volume no Railway

O sistema usa **sql.js gravando num arquivo** (`database/sistema.sqlite`).
O disco do Railway é **efêmero**: sem um Volume, **todos os dados são apagados
a cada deploy ou restart** — usuários, colaboradores, admissões, tudo.

A configuração do Volume está no **Passo 2.4** abaixo. Não pule.

> Os **documentos** (PDFs/imagens) não têm esse problema — ficam no Supabase Storage.

### 3. Gere um novo JWT_SECRET para produção

Nunca reuse o segredo de desenvolvimento:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## PASSO 1 — Subir o código para o GitHub

```bash
cd C:\Users\fabri\Desktop\sistema-integra\sistema-integra

git init
git add .
git commit -m "Sistema Integra — preparado para deploy"

# Crie um repositório PRIVADO no GitHub e então:
git remote add origin https://github.com/SEU_USUARIO/sistema-integra.git
git branch -M main
git push -u origin main
```

✅ Confirme que o `.env` **não** foi enviado (o `.gitignore` já o bloqueia).
Rode `git status` — se o `.env` aparecer, pare e corrija.

---

## PASSO 2 — Backend no Railway

### 2.1 Criar o projeto

1. Acesse https://railway.app → **New Project**
2. **Deploy from GitHub repo** → selecione `sistema-integra`
3. O Railway detecta o `railway.json` e usa:
   - Build: `npm run build:backend`
   - Start: `npm run start`
   - Healthcheck: `/api/health`

### 2.2 Variáveis de ambiente

Em **Variables** → **Raw Editor**, cole:

```env
NODE_ENV=production
API_ONLY=true
JWT_SECRET=COLE_O_SEGREDO_NOVO_QUE_VOCE_GEROU
DATABASE_DIR=/data
CORS_ORIGINS=https://*.vercel.app
SUPABASE_URL=https://lovuerrdvvzehzkpjmdj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvdnVlcnJkdnZ6ZWh6a3BqbWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzU3NDgsImV4cCI6MjEwNTA1MTc0OH0.DDHC7Pq8onGlia-yNvSqRRVfH466rv7Bwk12dh-rcEE
SUPABASE_SERVICE_ROLE_KEY=COLE_A_SERVICE_ROLE_KEY
```

> **Não** defina `PORT` — o Railway injeta automaticamente.

### 2.3 Gerar o domínio público

**Settings** → **Networking** → **Generate Domain**

Você recebe algo como `sistema-integra-production.up.railway.app`.
**Guarde essa URL** — ela vai no Passo 3.

### 2.4 Criar o Volume (persistência do banco) ⚠️

1. No serviço → aba **Data** (ou **Volumes**) → **Add Volume**
2. **Mount path:** `/data`
3. Confirme. O serviço reinicia sozinho.

Isso combina com `DATABASE_DIR=/data` e faz o banco sobreviver aos deploys.

### 2.5 Testar

Abra no navegador:

```
https://SEU-APP.up.railway.app/api/health
```

Resposta esperada:

```json
{ "status": "ok", "service": "Sistema Integra API", "env": "production", "timestamp": "..." }
```

Se falhar, vá em **Deployments** → **View Logs** e veja a seção *Erros comuns* no fim deste guia.

---

## PASSO 3 — Frontend na Vercel

### 3.1 Importar o projeto

1. Acesse https://vercel.com → **Add New** → **Project**
2. Importe o repositório `sistema-integra`
3. A Vercel lê o `vercel.json` automaticamente:
   - Build Command: `npm run build:frontend`
   - Output Directory: `dist`
   - Framework Preset: deixe em **Other**

### 3.2 Variável de ambiente

Em **Environment Variables**, adicione (marque os 3 ambientes):

| Name | Value |
|---|---|
| `VITE_API_URL` | `https://SEU-APP.up.railway.app` |

> ⚠️ Sem barra `/` no final. Só esta variável — nada de chave secreta no frontend.

### 3.3 Deploy

Clique em **Deploy**. Ao terminar você recebe `https://sistema-integra.vercel.app`.

---

## PASSO 4 — Fechar o CORS

Volte no Railway → **Variables** e troque o wildcard pelo domínio real:

```env
CORS_ORIGINS=https://sistema-integra.vercel.app,https://*.vercel.app
```

O segundo valor mantém os *preview deployments* funcionando.
Salve — o Railway reinicia automaticamente.

---

## PASSO 5 — Validar tudo

| # | Teste | Esperado |
|---|---|---|
| 1 | Abrir a URL da Vercel | Tela de login carrega |
| 2 | Fazer login | Entra no sistema |
| 3 | F12 → Console | Sem erro de CORS |
| 4 | F12 → Network | Chamadas vão para `...railway.app/api/...` |
| 5 | Efetivo | Lista carrega |
| 6 | Documentos → colaborador | Perfil abre |
| 7 | Anexar um PDF | Upload conclui |
| 8 | Botão 👁 | PDF abre no modal |
| 9 | Baixar | Download funciona |
| 10 | Exportar CSV | Arquivo baixa |
| 11 | Redeploy no Railway → relogar | **Dados continuam lá** (valida o Volume) |

---

## 🔄 Deploys seguintes

```bash
git add .
git commit -m "descrição da mudança"
git push
```

Vercel e Railway fazem redeploy automático no push para `main`.

---

## 🐛 Erros comuns

### `Failed to fetch` / erro de CORS no console
- `VITE_API_URL` está errado ou com `/` no final
- O domínio da Vercel não está em `CORS_ORIGINS`
- Após mudar `VITE_API_URL`, é preciso **Redeploy** na Vercel (a variável é embutida no build)

### `npm ci` falha no Railway
Lock desatualizado. Rode local:
```bash
npm install
git add package.json package-lock.json
git commit -m "atualiza lockfile"
git push
```

### `Cannot find module 'vite'`
O `server.ts` já usa import dinâmico, mas confirme que `API_ONLY=true` e
`NODE_ENV=production` estão definidos no Railway.

### Healthcheck falhando
O `server.ts` usa `process.env.PORT`. Não sobrescreva `PORT` no Railway.

### Login funciona mas tudo dá 401
`JWT_SECRET` diferente entre deploys invalida os tokens. Limpe o localStorage
do navegador e faça login novamente.

### Dados desapareceram após deploy
O Volume não está configurado ou `DATABASE_DIR` não é `/data`. Revise o Passo 2.4.

### Upload de PDF retorna erro 413
`express.json({ limit: '15mb' })` já está configurado. Se persistir, o arquivo
passa de 10 MB — o limite do bucket no Supabase.

### Erro `Supabase não configurado`
`SUPABASE_SERVICE_ROLE_KEY` faltando ou incorreta nas variáveis do Railway.

---

## 💰 Custos

| Serviço | Plano | Limite | Custo |
|---|---|---|---|
| Vercel | Hobby | 100 GB banda/mês | Grátis |
| Railway | Trial/Hobby | $5 de crédito/mês | Grátis até o limite |
| Supabase | Free | 1 GB storage, 2 GB banda | Grátis |

O Railway é o que pode gerar cobrança — um backend pequeno costuma consumir
$3–5/mês. Ative **Usage Alerts** nas configurações da conta.

---

## 📌 Próximo passo recomendado

O SQLite com Volume funciona, mas tem limites: um único processo, sem backup
automático e sem acesso concorrente real. Como o Supabase (PostgreSQL) já está
provisionado e com as tabelas criadas, migrar o restante dos dados para lá
remove a dependência do Volume, dá backup automático e permite escalar o
backend horizontalmente. Quando quiser, é o caminho natural.
