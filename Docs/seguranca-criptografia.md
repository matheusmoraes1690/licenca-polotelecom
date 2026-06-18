# Segurança do Sistema — License Manager

## 1. Visão Geral da Arquitetura de Segurança

O License Manager implementa múltiplas camadas de proteção, desde a camada de transporte até a persistência de dados sensíveis. A arquitetura segue o princípio de "defesa em profundidade", onde cada camada adiciona uma barreira independente contra ameaças.

```
┌─────────────────────────────────────────────────────────────┐
│  Camada de Transporte (TLS + HTTP Headers)                │
│  Helmet, CORS, Rate Limiting, HSTS, CSP                    │
├─────────────────────────────────────────────────────────────┤
│  Camada de Sessão e Autenticação                          │
│  Sessions seguras, PBKDF2, Brute-force protection           │
├─────────────────────────────────────────────────────────────┤
│  Camada de Autorização (RBAC)                              │
│  Roles (admin/editor/viewer), Permissions por módulo      │
├─────────────────────────────────────────────────────────────┤
│  Camada de Aplicação (Input Validation + CSRF)              │
│  Zod schemas, CSRF double-submit cookie                   │
├─────────────────────────────────────────────────────────────┤
│  Camada de Dados (Criptografia + ORM)                     │
│  AES-256-GCM, Drizzle ORM parametrizado                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Criptografia de Dados

### 2.1 AES-256-GCM — Cofre de Senhas (`server/encryption.ts`)

Todas as senhas e dados sensíveis do cofre de credenciais são criptografados usando **AES-256-GCM** ( Galois/Counter Mode ), um dos algoritmos simétricos mais seguros atualmente.

#### Detalhes técnicos:

| Parâmetro | Valor |
|-----------|-------|
| Algoritmo | AES-256-GCM |
| Tamanho da chave | 256 bits (32 bytes) |
| IV (nonce) | 16 bytes aleatórios por operação |
| Tag de autenticação | 128 bits (16 bytes) |
| Encoding final | Base64 |

#### Derivação de chave:

A chave de criptografia não é usada diretamente. É derivada via **PBKDF2-SHA256** a partir da `VAULT_ENCRYPTION_KEY`:

```typescript
// server/encryption.ts
const key = crypto.pbkdf2Sync(
  ENCRYPTION_KEY,
  SALT,
  100000,      // 100.000 iterações
  32,          // 32 bytes = 256 bits
  "sha256"
);
```

Isso protege contra ataques de força bruta mesmo se a senha/chave mestre for comprometida.

#### Formato do texto cifrado:

```
base64(iv:16bytes + ciphertext + authTag:16bytes)
```

A função `encrypt()` retorna uma string base64 contendo o IV, o texto cifrado e a tag GCM concatenados. A função `decrypt()` separa esses componentes e verifica a autenticidade antes de descriptografar.

#### Operações disponíveis:

- `encrypt(text)` / `decrypt(text)` — strings individuais
- `encryptObjectFields(obj, fields)` / `decryptObjectFields(obj, fields)` — criptografia seletiva de campos em objetos

#### Validação de segurança da chave:

```typescript
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 16) {
  throw new Error("VAULT_ENCRYPTION_KEY must be set and at least 16 characters");
}
```

O sistema **não inicia** se a chave não estiver configurada ou for muito curta.

---

### 2.2 Hash de Senhas de Usuário — PBKDF2-SHA512 (`server/auth-service.ts`)

Senhas dos usuários internos do sistema nunca são armazenadas em texto plano. Usamos **PBKDF2** com os seguintes parâmetros:

| Parâmetro | Valor |
|-----------|-------|
| Algoritmo | PBKDF2 |
| Função hash | SHA-512 |
| Iterações | 100.000 |
| Tamanho do salt | 32 bytes (hex) |
| Tamanho do hash | 64 bytes (hex) |
| Formato armazenado | `salt$hash` |

#### Exemplo de hash:

```
a1b2c3...f0$e5d4c3...b2a1
  ^salt^   ^hash^
```

#### Verificação com timing-safe comparison:

```typescript
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split("$");
  const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
}
```

O uso de `timingSafeEqual` impede ataques de **timing attack**, onde um atacante mede o tempo de resposta para inferir caracteres da senha.

---

### 2.3 Proteção Contra Força Bruta

O sistema monitora tentativas de login falhas por usuário:

| Configuração | Valor |
|--------------|-------|
| Tentativas máximas | 5 |
| Duração do bloqueio | 30 minutos |
| Contador resetado | após login bem-sucedido |

```typescript
const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MINUTES = 30;
```

Após 5 tentativas falhas consecutivas, o usuário é bloqueado por 30 minutos. O contador é zerado após um login bem-sucedido.

---

## 3. Gestão de Sessões

### 3.1 Configuração de Cookies

| Flag | Valor | Proteção |
|------|-------|----------|
| `httpOnly` | `true` | Impede acesso via JavaScript (XSS mitigation) |
| `sameSite` | `"lax"` | Protege contra CSRF em cross-site requests |
| `secure` | `true` em produção | Só envia cookie via HTTPS |
| `maxAge` | 24 horas | Sessão expira automaticamente |
| `name` | `"sessionId"` | Nome customizado (não o padrão `connect.sid`) |

### 3.2 Armazenamento de Sessão

Sessões são persistidas no **PostgreSQL** via `connect-pg-simple`, não em memória. Isso permite:

- Escalabilidade horizontal (múltiplas instâncias do servidor)
- Sobrevivência a reinicializações do processo
- Invalidação remota de sessões (logout forçado)

### 3.3 Segredo de Sessão

O segredo da sessão é separado da chave de criptografia do vault:

```
SESSION_SECRET → usado apenas para assinar cookies de sessão
VAULT_ENCRYPTION_KEY → usado apenas para criptografar dados do cofre
```

Ambos são obrigatórios. O sistema lança um erro se não estiverem configurados:

```typescript
secret: process.env.SESSION_SECRET || process.env.VAULT_ENCRYPTION_KEY || (() => {
  throw new Error("SESSION_SECRET ou VAULT_ENCRYPTION_KEY devem estar configurados");
})()
```

---

## 4. Autorização e Controle de Acesso (RBAC)

### 4.1 Modelo de Roles

| Role | Permissões |
|------|------------|
| `admin` | Acesso total ao sistema |
| `editor` | Criar/editar dados, sem gerenciar usuários |
| `viewer` | Apenas visualização |

### 4.2 Controle Granular por Perfil

Além das roles fixas, o sistema suporta **perfis customizados** com permissões por módulo e ação:

```typescript
// Exemplo de permissões JSON
{
  "clients": ["view", "create", "edit"],
  "credentials": ["view", "reveal"],
  "documents": ["view"]
}
```

Cada rota da API verifica as permissões necessárias antes de executar a operação:

```typescript
app.post("/api/clients", isAuthenticated, requirePermission("clients", ["create"]), ...);
```

Tentativas de acesso negado são registradas em log de auditoria.

---

## 5. Proteções de Camada HTTP

### 5.1 Helmet — Headers de Segurança

O sistema usa o middleware `helmet` para definir headers de segurança automaticamente.

#### Content Security Policy (CSP) — Produção:

```
default-src:    'self'
script-src:     'self'
style-src:      'self' 'unsafe-inline'
img-src:        'self' data:
connect-src:    'self'
font-src:       'self'
object-src:     'none'
frame-ancestors: 'none'
upgrade-insecure-requests: (ativado)
```

**`object-src: 'none'`** impede execução de plugins (Flash, PDF embeddado).
**`frame-ancestors: 'none'`** impede clickjacking via iframes.

### 5.2 CORS (Cross-Origin Resource Sharing)

CORS é restrito a origens explicitamente permitidas via `ALLOWED_ORIGINS`:

```typescript
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
```

Em produção, requisições de origens não listadas são rejeitadas com erro `Not allowed by CORS`.

### 5.3 Rate Limiting

| Limiter | Janela | Máximo | Aplica-se a |
|---------|--------|--------|-------------|
| Global | 1 minuto | 300 requisições | Todas as rotas exceto login |
| Login | 15 minutos | 20 tentativas | Apenas `/api/auth/login` |

Headers `RateLimit-Limit` e `RateLimit-Remaining` são enviados em cada resposta.

### 5.4 Trust Proxy

O `trust proxy` está configurado para aceitar apenas proxies internos:

```typescript
app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);
```

Isso impede que um atacante spoofee o IP real via headers `X-Forwarded-For`, protegendo o rate limiting baseado em IP.

---

## 6. Proteção CSRF

Todas as requisições que modificam estado (POST, PUT, DELETE, PATCH) exigem um token CSRF válido. O mecanismo usa **double-submit cookie**:

1. O token é gerado aleatoriamente (32 bytes hex) no login
2. É armazenado em um cookie **não httpOnly** (acessível pelo frontend)
3. O frontend envia o mesmo token no header `X-CSRF-Token`
4. O backend compara os dois valores

```typescript
const csrfToken = generateCsrfToken();
res.cookie("csrfToken", csrfToken, {
  httpOnly: false,   // acessível pelo JavaScript do frontend
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 24 * 60 * 60 * 1000
});
```

GET/HEAD/OPTIONS são isentos (não modificam estado).

---

## 7. Validação de Inputs (Zod)

Todo input da API passa por validação de schema **Zod** antes de tocar o banco de dados. Isso previne:

- **NoSQL/SQL injection** via campos inesperados
- **Type confusion** enviando strings onde número é esperado
- **Payloads maliciosos** com strings gigantescas
- **Enum bypass** enviando valores inválidos

### Exemplo de schema:

```typescript
export const createUserSchema = z.object({
  username: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  password: z.string().min(6),
  profileId: z.number().int().positive().optional(),
  role: z.enum(["admin", "editor", "viewer"]).optional().default("viewer"),
});
```

Rotas sem schema (users, profiles, credentials) agora validam explicitamente via `.parse()`. Erros retornam HTTP 400 com mensagem legível.

---

## 8. Upload de Arquivos e Documentos

### 8.1 Armazenamento Base64

Documentos são armazenados como **base64 no banco de dados** (não no filesystem). Isso:

- Evita path traversal attacks
- Impede execução direta de arquivos maliciosos no servidor
- Centraliza backups com o banco de dados

### 8.2 Sanitização na Entrega

Quando um arquivo é baixado, o sistema aplica múltiplas proteções:

| Proteção | Implementação |
|----------|---------------|
| Whitelist de tipos | Apenas `pdf, doc, docx, xls, xlsx, zip, txt, png, jpg, jpeg` |
| Nome sanitizado | Caracteres especiais substituídos por `_` |
| `X-Content-Type-Options: nosniff` | Impede MIME sniffing do navegador |
| Content-Disposition | `inline` para PDF, `attachment` para outros |
| Verificação de ownership | Documento pertence ao cliente/credential associado |

```typescript
const ALLOWED_FILE_TYPES = ["pdf", "doc", "docx", "xls", "xlsx", "zip", "txt", "png", "jpg", "jpeg"];

function sanitizeFileType(fileType: string | null | undefined): string {
  if (!fileType) return "bin";
  const ft = fileType.toLowerCase().trim();
  return ALLOWED_FILE_TYPES.includes(ft) ? ft : "bin";
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\- ]/g, "_").replace(/\s+/g, " ").trim();
}
```

---

## 9. SQL Injection Prevention

O sistema usa **Drizzle ORM** exclusivamente. Não há queries SQL montadas via string concatenation. Todas as queries são parametrizadas:

```typescript
// Seguro — Drizzle ORM parametriza automaticamente
await db.select().from(clients).where(eq(clients.id, id));

// Seguro — template literals do Drizzle SQL
sql`(${credentials.title} LIKE ${searchTerm})`
```

A atualização do `drizzle-orm` para `0.45.2` também corrige vulnerabilidades conhecidas de escape de identificadores SQL.

---

## 10. Logs de Auditoria

Toda ação sensível é registrada em uma tabela de audit logs:

| Campo | Descrição |
|-------|-----------|
| `userId` / `userName` | Quem executou a ação |
| `action` | create, update, delete, restore, permanent_delete |
| `resource` | Entidade afetada (client, license, credential, etc.) |
| `entityId` | ID do registro afetado |
| `clientId` | Cliente associado |
| `ipAddress` | IP de origem |
| `userAgent` | Navegador/cliente |
| `snapshot` | Estado anterior (para updates) |
| `details` | Metadados adicionais em JSON |

Isso permite rastreabilidade completa e análise forense em caso de incidente.

---

## 11. Configuração de Ambiente

### 11.1 Variáveis Obrigatórias

| Variável | Propósito | Segurança |
|----------|-----------|-----------|
| `SESSION_SECRET` | Assinatura de cookies de sessão | Mínimo 32 bytes hex |
| `VAULT_ENCRYPTION_KEY` | Chave mestre do cofre AES-256-GCM | Mínimo 16 caracteres, ideal 32+ bytes hex |
| `DATABASE_URL` | Conexão PostgreSQL | Nunca expor em código |
| `ALLOWED_ORIGINS` | Domínios permitidos para CORS | Separados por vírgula |
| `ADMIN_INITIAL_PASSWORD` | Senha inicial do primeiro admin | Deve ser trocada no primeiro acesso |

### 11.2 Geração de Segredos

```bash
# SESSION_SECRET e VAULT_ENCRYPTION_KEY (use o mesmo comando para ambos)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Exemplo de saída:
# a3f7c8e2d1b90456af8c2e1d0b9f3a7c5e4d2b1f8a3c6e9d0b5f7a1c4e8d2b3
```

### 11.3 Checklist Pré-Produção

- [ ] `.env` está no `.gitignore`
- [ ] `SESSION_SECRET` configurado com valor aleatório de 32+ bytes hex
- [ ] `VAULT_ENCRYPTION_KEY` configurado com valor aleatório de 32+ bytes hex
- [ ] `ALLOWED_ORIGINS` contém apenas os domínios reais de produção
- [ ] `NODE_ENV=production`
- [ ] HTTPS/TLS ativo (para `secure: true` nos cookies)
- [ ] Senha do admin inicial foi trocada
- [ ] Banco de dados PostgreSQL acessível apenas internamente
- [ ] Firewall bloqueia portas não necessárias

---

## 12. Resumo das Proteções por Camada

| Ameaça | Proteção | Arquivo Principal |
|--------|----------|-------------------|
| XSS | React escapa por padrão + CSP strict | `client/` (React), `server/index.ts` (Helmet) |
| SQL Injection | Drizzle ORM + queries parametrizadas | `server/storage.ts`, `server/db.ts` |
| CSRF | Double-submit cookie token | `server/routes.ts` |
| Session Hijacking | httpOnly, sameSite=lax, secure, PgSession | `server/index.ts` |
| Brute Force | Rate limiting + login attempt counter | `server/index.ts`, `server/auth-service.ts` |
| Password Cracking | PBKDF2-SHA512, 100k iterações, salt 32 bytes | `server/auth-service.ts` |
| Data Breach (vault) | AES-256-GCM com PBKDF2-derived key | `server/encryption.ts` |
| MITM | TLS + HSTS + secure cookies | Infraestrutura (Caddy/nginx) |
| Clickjacking | `X-Frame-Options` + CSP `frame-ancestors` | `server/index.ts` (Helmet) |
| MIME Sniffing | `X-Content-Type-Options: nosniff` | `server/routes.ts` |
| Path Traversal | Base64 em DB + sanitizeFileName | `server/routes.ts` |
| Information Disclosure | `.env` protegido, logs sem credenciais | `.gitignore`, `server/index.ts` |

---

**Documento gerado em:** 18/06/2026  
**Versão do sistema:** License Manager v1.0.0  
**Última atualização de segurança:** Correções de vulnerabilidades críticas aplicadas (18/06/2026)
