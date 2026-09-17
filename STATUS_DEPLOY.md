# Sistema Íntegra — NO AR ✅

Deploy concluído em 16/09/2026

---

## URLs

| | |
|---|---|
| **Sistema (use esta)** | https://integra-frontend-kappa.vercel.app |
| API | https://api-production-6b3b5.up.railway.app |
| Health check | https://api-production-6b3b5.up.railway.app/api/health |

---

## Validação executada

Todos os testes rodaram **a partir do domínio real da Vercel**, provando que a
comunicação entre frontend e backend funciona de verdade:

| Teste | Resultado |
|---|---|
| `GET /api/health` | `{"status":"ok","env":"production"}` |
| `POST /api/auth/login` com senha errada | `401 {"error":"Credenciais inválidas."}` |
| `GET /api/documentos/colaborador/:id` sem token | `401 {"error":"Acesso não autorizado."}` |
| Erros de CORS no console | **Nenhum** |
| `VITE_API_URL` embutido no bundle | ✅ confirmado (bundle 1.428 KB) |
| `localhost:3000` no bundle | ✅ ausente |

O 401 no endpoint de documentos confirma que o **módulo novo está no ar**
e protegido por autenticação.

---

## Frontend — Vercel

| Item | Valor |
|---|---|
| Projeto | `integra-frontend` |
| Repositório | `zBelga/integra-frontend` (branch `main`) |
| Build | 26s, Ready |
| Variável | `VITE_API_URL` = URL do Railway (All Environments) |
| Deploy automático | Sim, a cada push na `main` |

Deploy hook (dispara build manualmente sem precisar de commit):
```
POST https://api.vercel.com/v1/integrations/deploy/prj_N3QtzM4NEStEU48OylUSnPfyH2kP/aJlAexFiJn
```

---

## Backend — Railway

| Item | Valor |
|---|---|
| Projeto | `sistema-integra` |
| Serviço | `api` |
| Repositório | `zBelga/integra-backend` (branch `main`) |
| Volume | `integra-database` em `/data` |
| Porta | 3000 |
| Deploy automático | Sim, a cada push na `main` |

### Variáveis
```
NODE_ENV=production
API_ONLY=true
PORT=3000
JWT_SECRET=<novo, exclusivo de producao>
DATABASE_DIR=/data
CORS_ORIGINS=https://integra-frontend-kappa.vercel.app,https://*.vercel.app
SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
```

> O `JWT_SECRET` de produção é **diferente** do local — intencional.
> Tokens do ambiente local não valem em produção e vice-versa.

---

## Falta testar (precisa de login real)

| # | Teste |
|---|---|
| 1 | Login com seu usuário |
| 2 | Efetivo → lista carrega |
| 3 | Documentos → clicar num colaborador |
| 4 | Anexar um PDF |
| 5 | Botão 👁 → PDF abre no modal |
| 6 | Baixar documento |
| 7 | Exportar CSV |
| 8 | **Redeploy no Railway → relogar → dados continuam** (valida o Volume) |

O teste 8 é o mais importante: confirma que o Volume está protegendo o banco.

---

## Deploys daqui pra frente

```bash
git add .
git commit -m "descricao"
git push origin main     # Vercel redeploya o frontend
git push backend main    # Railway redeploya o backend
```

---

## Custos

| Serviço | Plano | Custo |
|---|---|---|
| Vercel | Hobby | Grátis (100 GB banda/mês) |
| Railway | Trial/Hobby | $5 crédito/mês — backend pequeno gasta ~$3-5 |
| Supabase | Free | Grátis (1 GB storage) |

Ative **Usage Alerts** no Railway.

---

## Dívida técnica

1. **SQLite com Volume** — funciona, mas é processo único e sem backup
   automático. O Supabase (PostgreSQL) já está provisionado com as tabelas
   criadas; migrar remove a dependência do Volume e dá backup automático.
   É o próximo passo natural.

2. **Bundle de 1,43 MB** (408 KB gzip). O `exceljs` pesa a maior parte.
   Carregar sob demanda com `import()` na tela de importação de Excel
   cortaria boa parte disso.

3. **Os dois repositórios têm o código inteiro.** Funciona (cada plataforma
   lê seu próprio `.json`), mas o ideal seria separar de verdade — o build
   do Railway hoje baixa react/vite sem precisar.
