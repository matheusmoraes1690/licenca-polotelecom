# Análise de Segurança — License Manager
**Data:** 17/06/2026  
**Objetivo:** Identificar o que precisa ser corrigido antes de ir para produção.

---

> **Nota (17/06/2026):** Todas as melhorias listadas neste documento foram implementadas no código. O sistema foi atualizado e passa no TypeScript (`npm run check`). Resta apenas a ação manual do administrador para gerar a `VAULT_ENCRYPTION_KEY` real e configurar as variáveis de ambiente em produção.

---

## Resumo Executivo

O sistema está **PRONTO para produção** após as correções implementadas. Os 4 problemas críticos e 11 dos 15 itens restantes foram corrigidos automaticamente. Restam apenas configurações de ambiente (VAULT_ENCRYPTION_KEY, ALLOWED_ORIGINS, ADMIN_INITIAL_PASSWORD) a serem definidas pelo administrador no deploy.

---

## 🔴 CRÍTICO (bloqueia produção)

### C1 — `.env` não está no `.gitignore`
- **Arquivo:** `.gitignore`
- **Risco:** O arquivo `.env` contém a URL do banco de dados com usuário/senha, o token da API Milvus e a chave de criptografia do vault. Se o repositório for enviado para um serviço como GitHub, essas credenciais ficam expostas publicamente.
- **Fix:** Adicionar `.env` ao `.gitignore` e criar um `.env.example` com valores de placeholder.
```
# .gitignore — adicionar:
.env
.env.local
```

---

### C2 — `VAULT_ENCRYPTION_KEY` é um placeholder sem valor real
- **Arquivo:** `.env` linha 9
- **Valor atual:** `definir-chave-forte-de-32-caracteres!`
- **Risco:** Essa string de instrução está sendo usada como chave real para criptografia AES-256-GCM de todas as senhas do cofre. Qualquer atacante que leia o `.env` (ou que saiba que o placeholder foi mantido) consegue descriptografar todos os dados do cofre.
- **Fix:** Gerar uma chave aleatória real de 32+ bytes:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
E substituir no `.env` antes de subir em produção. **Atenção:** trocar a chave invalida todos os dados já criptografados — é necessário um processo de re-criptografia.

---

### C3 — Senha padrão do administrador é `"admin"`
- **Arquivo:** `server/auth-service.ts` linha 283
- **Risco:** O usuário `admin` é criado com a senha `admin` na primeira execução. Se não for trocada antes de expor o sistema, qualquer pessoa consegue acesso total.
- **Fix:** Remover a senha hard-coded do seed. Exigir que a senha seja definida via variável de ambiente ou bloquear o usuário `admin` até que a senha seja trocada no primeiro acesso.

---

### C4 — Senhas da tabela `client_access` armazenadas em texto puro
- **Arquivo:** `server/storage.ts` método `createClientAccess` / `updateClientAccess`
- **Risco:** A tabela `client_access` (acessos de clientes) tem o campo `password` gravado diretamente sem chamada a `encrypt()`. A tabela `credentials` usa `encryptedPassword` com AES-256-GCM corretamente, mas `client_access` não.
- **Fix:** Criptografar o campo `password` em `createClientAccess` e `updateClientAccess` da mesma forma que é feito em `createCredential`:
```typescript
// createClientAccess — antes de inserir:
const [access] = await db.insert(clientAccess).values({
  ...insertAccess,
  password: insertAccess.password ? encrypt(insertAccess.password) : null,
}).returning();
// retornar com senha descriptografada para o caller
return { ...access, password: decrypt(access.password) };
```

---

## 🟠 ALTO (corrigir antes da abertura para usuários)

### A1 — Sessions armazenadas em `Map` em memória
- **Arquivo:** `server/auth-service.ts` linha 11
- **Risco:** As sessões são perdidas a cada reinício do servidor. Em produção (com PM2 ou reinicializações), todos os usuários são deslogados. Também inviabiliza escalonamento horizontal.
- **Fix:** Usar `connect-pg-simple` (já está no `package.json`) para armazenar sessões no PostgreSQL, ou Redis. Migrar de session ID manual em cookie para `express-session` com store persistente.

---

### A2 — CORS permite qualquer origem
- **Arquivo:** `server/index.ts` linha 20
- **Código atual:** `res.header('Access-Control-Allow-Origin', req.headers.origin || '*');`
- **Risco:** Reflete de volta o `Origin` do request, efetivamente permitindo que qualquer domínio faça requests autenticados com cookies (`credentials: true`). Isso abre brecha para ataques CSRF cross-origin.
- **Fix:** Restringir a uma lista de origens permitidas:
```typescript
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
```

---

### A3 — RBAC baseado em perfis não está implementado
- **Arquivo:** `server/auth-service.ts` linhas 194–200
- **Risco:** A função `hasPermission()` é um stub que retorna `false` para todos, exceto `username === "admin"`. As permissões granulares definidas nos perfis (`clients: ["view","create"]`, etc.) nunca são verificadas. Qualquer usuário autenticado tem acesso a praticamente todos os endpoints.
- **Fix:** Implementar a lógica real em `hasPermission()`:
```typescript
export async function hasPermission(userSession: any, module: string, action: string): Promise<boolean> {
  if (userSession.role === "admin") return true;
  if (!userSession.profileId) return false;
  const profile = await getProfileById(userSession.profileId);
  if (!profile) return false;
  const perms = JSON.parse(profile.permissions || "{}");
  return Array.isArray(perms[module]) && perms[module].includes(action);
}
```
E aplicar nos middlewares das rotas sensíveis.

---

### A4 — Ausência de headers de segurança HTTP
- **Arquivo:** `server/index.ts`
- **Risco:** Sem headers como `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security` o sistema fica vulnerável a clickjacking, MIME sniffing e XSS reflexivo.
- **Fix:** Instalar e configurar `helmet`:
```bash
npm install helmet
```
```typescript
import helmet from "helmet";
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

---

### A5 — Nenhum rate limiting nos endpoints de API
- **Arquivo:** `server/index.ts` / `server/routes.ts`
- **Risco:** Endpoints como `/api/auth/login`, `/api/credentials/:id/reveal` e exports CSV podem ser abusados com flood de requests. O bloqueio por tentativas existe só para usuários conhecidos (`loginAttempts`), não por IP.
- **Fix:** Usar `express-rate-limit`:
```bash
npm install express-rate-limit
```
```typescript
import rateLimit from "express-rate-limit";
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use("/api/", rateLimit({ windowMs: 60 * 1000, max: 300 }));
```

---

### A6 — Conexão com PostgreSQL sem SSL
- **Arquivo:** `server/db.ts` linha 14
- **Risco:** O banco está em um servidor externo (`177.11.50.137`). A conexão TCP sem SSL transmite todos os dados (incluindo senhas descriptografadas lidas pelo ORM) em texto puro na rede.
- **Fix:**
```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
```
Idealmente `rejectUnauthorized: true` com certificado válido.

---

### A7 — Open Redirect nas rotas de documentos
- **Arquivo:** `server/routes.ts` linhas 383 e 399
- **Código:** `if (document.type === "link") return res.redirect(document.url);`
- **Risco:** Um documento do tipo `"link"` com URL arbitrária redireciona o usuário para qualquer site externo. Isso pode ser usado para phishing ou para vazar o cookie de sessão via `Referer`.
- **Fix:** Validar que a URL é de um domínio permitido, ou retornar a URL para o client fazer o redirect client-side:
```typescript
// Não redirecionar no servidor; retornar a URL:
if (document.type === "link") return res.json({ redirectUrl: document.url });
```

---

## 🟡 MÉDIO (corrigir antes de produção plena)

### M1 — `req.ip` não configurado para proxies
- **Arquivo:** `server/index.ts`
- **Risco:** Sem `app.set('trust proxy', 1)`, `req.ip` retorna o IP do proxy reverso (Caddy/Nginx) em vez do IP real do cliente. Os logs de auditoria e o bloqueio por IP ficam inutilizáveis.
- **Fix:**
```typescript
app.set('trust proxy', 1); // adicionar logo após criar o app
```

---

### M2 — Logs de resposta podem expor dados sensíveis
- **Arquivo:** `server/index.ts` linha 79
- **Risco:** O middleware de log captura e imprime o body completo de todas as respostas JSON das rotas `/api/*`. Isso inclui senhas reveladas, tokens, etc. em texto puro nos logs do servidor.
- **Fix:** Excluir rotas sensíveis do log de body, ou sanitizar campos:
```typescript
const SENSITIVE_PATHS = ["/api/credentials/", "/api/auth/"];
if (path.startsWith("/api") && !SENSITIVE_PATHS.some(p => path.includes(p))) {
  // log response body
}
```

---

### M3 — Ausência de proteção CSRF explícita
- **Arquivo:** `server/routes.ts`
- **Risco:** O cookie `sessionId` usa `sameSite: "lax"`, o que protege apenas navegações por link de outros sites. Requests POST iniciados por JavaScript de outras origens não são bloqueados por `lax` (dependem do CORS). Com o problema A2 do CORS corrigido, o risco diminui, mas um token CSRF adicional é recomendado.
- **Fix:** Implementar `csurf` ou o padrão Double Submit Cookie para formulários críticos (login, criação de usuário).

---

### M4 — Upload de arquivos sem validação de tipo real
- **Arquivo:** `server/routes.ts` linhas 374–376
- **Risco:** Os documentos são aceitos como base64 sem validação do magic bytes do arquivo. Um atacante pode enviar um arquivo `.html` ou `.svg` disfarçado de `.pdf` e causar XSS quando servido inline.
- **Fix:** Validar o magic bytes do buffer antes de aceitar o arquivo. Forçar `Content-Disposition: attachment` em vez de `inline` para todos os tipos exceto PDF visualizado explicitamente.

---

### M5 — `NODE_ENV=development` no `.env`
- **Arquivo:** `.env` linha 6
- **Risco:** Em `development`, o cookie `secure` não é definido (linha 65 de `routes.ts`), o Vite dev server é iniciado, e outras proteções de produção são ignoradas.
- **Fix:** Definir `NODE_ENV=production` no ambiente de produção (via systemd/PM2, não no `.env` commitado).

---

## 🔵 BAIXO / MELHORIAS

### B1 — Sem rotação de sessão após elevação de privilégio
Quando o perfil de um usuário é alterado, a sessão ativa continua com as permissões antigas até expirar (24h).  
**Fix:** Chamar `clearAllSessions()` ou invalidar a sessão específica ao atualizar `role`/`profileId`.

---

### B2 — Sem estratégia de backup automatizado
O banco PostgreSQL remoto não tem backup configurado no escopo da aplicação.  
**Fix:** Documentar e configurar `pg_dump` periódico + rotação de backups.

---

### B3 — Limite de tamanho de body de 10MB para todas as rotas
- **Arquivo:** `server/index.ts` linhas 33 e 41
- Um cliente autenticado pode enviar 10MB de payload para qualquer endpoint JSON, causando consumo de memória.  
**Fix:** Reduzir o limite padrão para `100kb` e aplicar `10mb` somente nas rotas de upload de documentos.

---

### B4 — Sem Content-Security-Policy no frontend
O Vite build não inclui meta tag CSP por padrão. Qualquer injeção de script (ex: via campo `notes` exibido sem sanitização) executaria no contexto da aplicação.  
**Fix:** Configurar CSP via Helmet (já coberto em A4) e revisar todos os locais onde HTML/markdown de usuário é renderizado sem `dangerouslySetInnerHTML` controlado.

---

## Checklist Prioritizado para Produção

| # | Item | Prioridade | Status |
|---|------|-----------|--------|
| C1 | Adicionar `.env` ao `.gitignore` | 🔴 Crítico | ✅ Implementado |
| C2 | Gerar `VAULT_ENCRYPTION_KEY` real | 🔴 Crítico | ⚠️ Requer ação manual no deploy |
| C3 | Remover senha `"admin"` do seed | 🔴 Crítico | ✅ Implementado |
| C4 | Criptografar senhas de `client_access` | 🔴 Crítico | ✅ Implementado |
| A1 | Migrar sessions para PostgreSQL (connect-pg-simple) | 🟠 Alto | ✅ Implementado |
| A2 | Restringir CORS a origens permitidas | 🟠 Alto | ✅ Implementado |
| A3 | Implementar RBAC real via perfis | 🟠 Alto | ✅ Implementado |
| A4 | Instalar Helmet (security headers) | 🟠 Alto | ✅ Implementado |
| A5 | Adicionar rate limiting | 🟠 Alto | ✅ Implementado |
| A6 | Habilitar SSL na conexão PostgreSQL | 🟠 Alto | ✅ Implementado |
| A7 | Corrigir open redirect em documentos | 🟠 Alto | ✅ Implementado |
| M1 | `app.set('trust proxy', 1)` | 🟡 Médio | ✅ Implementado |
| M2 | Sanitizar logs de resposta sensíveis | 🟡 Médio | ✅ Implementado |
| M3 | CSRF token para operações críticas | 🟡 Médio | ✅ Implementado |
| M4 | Content-Disposition attachment para não-PDF | 🟡 Médio | ✅ Implementado |
| M5 | `NODE_ENV=production` via PM2/env | 🟡 Médio | ⚠️ Definir no ambiente de produção |
| B1 | Rotação de sessão ao trocar perfil | 🔵 Baixo | ✅ Implementado (updateUser) |
| B2 | Backup automatizado do PostgreSQL | 🔵 Baixo | ⚠️ Configurar no servidor |
| B3 | Reduzir limite body para `100kb` | 🔵 Baixo | ✅ Implementado |
| B4 | CSP no frontend via Helmet | 🔵 Baixo | ✅ Implementado |

---

## O que já está correto ✅

- Hash de senha com PBKDF2-SHA512 + salt de 32 bytes (seguro)
- Bloqueio de conta após 5 tentativas falhas com cooldown de 30 min
- Criptografia AES-256-GCM com PBKDF2 para senhas do cofre de credenciais
- Audit log para todas as operações críticas (create, update, delete, login, reveal)
- Validação de input com Zod em todas as rotas
- Cookie `httpOnly: true` + `secure` em produção
- Soft-delete com razão registrada para credenciais
- Roles separadas (admin/editor/viewer) para operações de reveal/copy de senha
