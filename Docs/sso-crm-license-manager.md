# Autenticação Cruzada: CRM -> License Manager

## 1. Contexto

O CRM `https://crm.ippolo.com.br/` possui um menu **"Sistemas Polo"** com links externos para plataformas internas, incluindo o **License Manager**.

**Objetivo:** Ao clicar no link do License Manager a partir do CRM, o usuario deve chegar a plataforma ja autenticado, sem precisar digitar login/senha novamente.

**Restricao:** O CRM eh um sistema independente. A comunicacao entre os dois sistemas deve ser segura, confiavel e de facil manutencao.

---

## 2. Analise do Sistema Atual

O License Manager (`server/auth-service.ts` + `server/routes.ts`) utiliza hoje:

- **Sessao em memoria** (`Map<string, session>`) vinculada a um cookie `sessionId`.
- **Login tradicional** `POST /api/auth/login` com `username` + `password` (hash PBKDF2).
- **Middleware `isAuthenticated`** que verifica o cookie `sessionId` e recupera a sessao do Map.
- Duração da sessao: **24 horas**.

Precisamos adicionar um **segundo canal de entrada**: um endpoint que aceite uma credencial temporaria e confiavel gerada pelo CRM, valide essa credencial, crie uma sessao normal no Map e devolva o cookie `sessionId`.

---

## 3. Arquiteturas Possiveis

### 3.1 Opcao A — Token JWT Assinado via Query String (Recomendada)

O CRM gera um token JWT contendo os dados minimos do usuario, assina com um segredo compartilhado e anexa ao link como query parameter. O License Manager valida a assinatura, cria a sessao e redireciona para a home.

**Fluxo:**

```
Usuario logado no CRM -> clica link
CRM (backend) gera JWT assinado {sub, name, email, role, iat, exp, jti}
CRM redireciona browser -> https://license.polo.com.br/api/auth/sso?token=<jwt>
License Manager valida assinatura, exp, jti
License Manager busca/cria usuario em users_internal
License Manager cria sessao no Map + cookie sessionId
License Manager redireciona para /
```

**Vantagens:**
- Stateless: nao precisa de banco compartilhado.
- Seguro: token assinado, expiracao curta (60s), HTTPS.
- Simples no CRM: apenas gerar JWT com biblioteca padrao.
- Simples no License Manager: apenas adicionar um endpoint.

**Desvantagens:**
- Link com token fica no historico do navegador e logs (por isso expiracao curta eh **obrigatoria**).
- Segredo compartilhado deve ser protegido e rotacionado.

### 3.2 Opcao B — OAuth 2.0 / OpenID Connect

O CRM atua como Identity Provider (IdP). O License Manager inicia um fluxo de autorizacao OAuth 2.0, redireciona o usuario ao CRM, o CRM autentica e devolve um `authorization_code`, que o License Manager troca por um `access_token`.

**Vantagens:**
- Padrao de mercado (SSO enterprise).
- Tokens nao transitam pelo navegador (no fluxo com PKCE).
- Permite logout unificado (SLO).

**Desvantagens:**
- Complexidade alta: exige implementar ou configurar um servidor OAuth/OIDC no CRM.
- Requer registro de client_id e client_secret.
- Overkill para apenas dois sistemas internos.

**Veredito:** Recomendado apenas se o CRM ja tiver um servidor OAuth/OIDC rodando ou se houver plano de integrar mais de 3 sistemas no futuro.

### 3.3 Opcao C — Ticket de Uso Unico (S2S)

O CRM faz uma chamada server-to-server para o License Manager gerar um ticket UUID unico, e depois redireciona o navegador com esse ticket. O License Manager valida o ticket (consultando cache/DB), cria a sessao e invalida o ticket.

**Vantagens:**
- Ticket de uso unico (mais seguro que token na URL, pois nao pode ser reutilizado).

**Desvantagens:**
- Requer chamada S2S sincrona antes de cada redirecionamento (latencia).
- Requer mecanismo de cache/ticket store (Redis ou banco).

**Veredito:** Boa alternativa se ja tiver Redis. Ligeiramente mais complexa que a Opcao A.

---

## 4. Recomendacao

| Criterio | Opcao A (JWT URL) | Opcao B (OAuth/OIDC) | Opcao C (Ticket S2S) |
|----------|-------------------|----------------------|----------------------|
| Complexidade de implantacao | Baixa | Alta | Media |
| Seguranca | Alta (com expiracao curta) | Muito Alta | Muito Alta |
| Manutencao | Baixa | Alta | Media |
| Escalabilidade futura (N sistemas) | Media | Excelente | Media |
| Dependencia de infra extra | Nenhuma | IdP/OAuth Server | Redis/Cache |
| **Recomendacao para o cenario atual** | **Escolher** | Avaliar futuro | Alternativa viavel |

> **Decisao:** Implementar a **Opcao A — Token JWT Assinado via Query String** como solucao imediata. Se no futuro o numero de sistemas integrados crescer para 3+, avaliar migracao para OAuth 2.0 / OIDC.

---

## 5. Especificacao Tecnica da Implementacao (Opcao A)

### 5.1 Prerequisitos

1. Ambos os sistemas devem conhecer um **segredo compartilhado** (`SSO_SHARED_SECRET`).
2. O License Manager deve expor um endpoint para receber o token e estabelecer a sessao.
3. O token deve ter **expiracao curta** (`exp`, maximo 120 segundos apos `iat`).

### 5.2 Variaveis de Ambiente

```bash
# License Manager (.env)
SSO_SHARED_SECRET="chave-super-secreta-min-32-caracteres!!"
SSO_TOKEN_MAX_AGE_SECONDS=60
SSO_ALLOWED_ISSUERS="crm.ippolo.com.br"
```

O mesmo valor de `SSO_SHARED_SECRET` deve estar configurado no CRM (backend).

### 5.3 Payload do JWT (gerado pelo CRM)

```json
{
  "sub": "usuario123",
  "name": "Joao Silva",
  "email": "joao.silva@ippolo.com.br",
  "role": "admin",
  "iss": "crm.ippolo.com.br",
  "aud": "license-manager.polo.com.br",
  "iat": 1718217600,
  "exp": 1718217660,
  "jti": "uuid-unico-para-prevenir-replay"
}
```

| Claim | Descricao |
|-------|-----------|
| `sub` | Identificador unico do usuario no CRM (mapeado para `username`) |
| `name` | Nome completo do usuario |
| `email` | E-mail (opcional, recomendado) |
| `role` | Papel sugerido (`admin`, `editor`, `viewer`) |
| `iss` | Emissor (dominio do CRM) |
| `aud` | Audiencia (dominio do License Manager) |
| `iat` | Emitido em (timestamp) |
| `exp` | Expira em (timestamp — maximo 60-120s depois de `iat`) |
| `jti` | ID unico do token (prevenção de replay attack) |

### 5.4 Algoritmo de Assinatura

- **HMAC-SHA256 (`HS256`)** — suficiente e mais simples. O segredo compartilhado deve ter no minimo 32 bytes (256 bits).
- Alternativa: **RS256** (chave privada no CRM, chave publica no License Manager). Mais seguro em longo prazo, mas requer gerenciamento de par de chaves.

**Recomendacao:** Começar com `HS256`. Migrar para `RS256` apenas se houver necessidade de multiplos emissores.

### 5.5 Endpoint no License Manager

**Rota:** `GET /api/auth/sso`

**Query Parameters:**
- `token` (string, obrigatorio): JWT assinado pelo CRM.

**Comportamento:**

1. Validar presença do token. Se ausente -> `400 Bad Request`.
2. Decodificar e verificar assinatura do JWT usando `SSO_SHARED_SECRET`.
3. Verificar claims:
   - `iss` esta na lista `SSO_ALLOWED_ISSUERS`.
   - `aud` corresponde ao dominio do License Manager.
   - `exp` nao passou (rejeitar tokens expirados).
   - `sub` nao esta vazio.
4. Verificar `jti` contra uma blacklist efemera (recomendado):
   - Um `Set<string>` em memoria (ou Redis) com os JTIs usados nos ultimos 5 minutos.
   - Se o `jti` ja foi usado -> `401 Unauthorized` (prevenção de replay).
5. Mapear usuario:
   - Buscar em `users_internal` por `username = sub`.
   - Se nao existir: auto-provisionar com perfil minimo (ex: "Somente Leitura") OU rejeitar com `403`.
   - Validar se `role` e permitido.
6. Criar sessao no Map de sessoes (mesmo mecanismo do login normal).
7. Definir cookie `sessionId` com as mesmas flags do login normal (`httpOnly`, `sameSite=lax`, `secure` em producao).
8. Registrar audit log com `method: "sso"`.
9. Redirecionar para `/`.

**Exemplo de implementacao (TypeScript para o License Manager):**

```typescript
import jwt from "jsonwebtoken";
import crypto from "crypto";

const SSO_SECRET = process.env.SSO_SHARED_SECRET!;
const SSO_MAX_AGE = parseInt(process.env.SSO_TOKEN_MAX_AGE_SECONDS || "60");
const usedJtis = new Set<string>(); // Em producao, usar Redis com TTL

app.get("/api/auth/sso", async (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) return res.status(400).json({ message: "Token ausente" });

    const decoded = jwt.verify(token, SSO_SECRET, {
      algorithms: ["HS256"],
      issuer: process.env.SSO_ALLOWED_ISSUERS?.split(","),
      audience: "license-manager.polo.com.br",
      maxAge: `${SSO_MAX_AGE}s`,
    }) as jwt.JwtPayload;

    if (decoded.jti && usedJtis.has(decoded.jti)) {
      return res.status(401).json({ message: "Token ja utilizado" });
    }
    if (decoded.jti) usedJtis.add(decoded.jti);

    let user = await getUserByUsername(decoded.sub!);
    if (!user) {
      const defaultProfile = await getAllProfiles().then(p => p.find(pr => pr.name === "Somente Leitura"));
      user = await createUser({
        username: decoded.sub!,
        name: decoded.name || decoded.sub!,
        email: decoded.email || null,
        password: crypto.randomBytes(32).toString("hex"),
        profileId: defaultProfile?.id || null,
        role: ["admin", "editor", "viewer"].includes(decoded.role || "viewer") ? decoded.role : "viewer",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "Conta inativa" });
    }

    const sessionId = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + SESSION_DURATION_MS;
    sessions.set(sessionId, {
      userId: user.id,
      username: user.username,
      name: user.name,
      profileId: user.profileId,
      role: user.role || "viewer",
      expiresAt,
    });

    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      maxAge: SESSION_DURATION_MS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    await db.insert(auditLogs).values({
      userId: user.id,
      userName: user.name,
      action: "login",
      resource: "auth",
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] as string || null,
      details: JSON.stringify({ method: "sso", issuer: decoded.iss }),
    });

    return res.redirect("/");
  } catch (err) {
    console.error("SSO error:", err);
    return res.status(401).json({ message: "Token invalido ou expirado" });
  }
});
```

### 5.6 Geracao do Link no CRM

O CRM deve gerar o link dinamicamente no backend (nunca no frontend) para proteger o segredo compartilhado.

**Exemplo em Node.js (CRM):**

```typescript
import jwt from "jsonwebtoken";

const SSO_SECRET = process.env.SSO_SHARED_SECRET;

function generateLicenseManagerLink(user: { id: string; name: string; email: string; role: string }) {
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      iss: "crm.ippolo.com.br",
      aud: "license-manager.polo.com.br",
      iat: now,
      exp: now + 60,
      jti: crypto.randomUUID(),
    },
    SSO_SECRET,
    { algorithm: "HS256" }
  );
  return `https://license.polo.com.br/api/auth/sso?token=${encodeURIComponent(token)}`;
}
```

**Exemplo em PHP (CRM):**

```php
<?php
use Firebase\JWT\JWT;

$ssoSecret = getenv('SSO_SHARED_SECRET');
$now = time();

$payload = [
    "sub" => $userId,
    "name" => $userName,
    "email" => $userEmail,
    "role" => $userRole,
    "iss" => "crm.ippolo.com.br",
    "aud" => "license-manager.polo.com.br",
    "iat" => $now,
    "exp" => $now + 60,
    "jti" => uniqid("sso-", true),
];

$token = JWT::encode($payload, $ssoSecret, 'HS256');
$link = "https://license.polo.com.br/api/auth/sso?token=" . urlencode($token);
```

---

## 6. Consideracoes de Seguranca

### 6.1 Obrigatorias

1. **HTTPS em todos os passos.** O token JWT nunca pode transitar por HTTP puro.
2. **Expiracao curta.** O `exp` deve ser no maximo 60-120 segundos apos `iat`.
3. **Segredo forte.** `SSO_SHARED_SECRET` deve ter pelo menos 32 bytes de entropia (`openssl rand -base64 32`).
4. **Prevenção de replay.** Implementar verificacao de `jti` para garantir que um token so possa ser usado uma vez.
5. **Geracao server-side.** O token deve ser gerado no backend do CRM, nunca no navegador.
6. **Validacao de `iss` e `aud`.** Rejeitar tokens com emissor ou audiencia inesperados.
7. **Mapeamento de role.** O License Manager deve validar se o `role` vindo do token e um dos roles permitidos. Nunca confiar cegamente no CRM.

### 6.2 Recomendadas

1. **Lista de IPs permitidos.** O License Manager pode restringir o endpoint `/api/auth/sso` a requisicoes provenientes dos IPs publicos do servidor do CRM.
2. **Rate limiting.** Aplicar rate limiting no endpoint para evitar tentativas de forca bruta com tokens forjados.
3. **Notificacao de novo login.** Se o usuario for auto-provisionado, considerar enviar um e-mail de notificacao.
4. **Auditoria.** Todo login via SSO deve gerar um registro em `audit_logs`.

### 6.3 Riscos e Mitigacoes

| Risco | Descricao | Mitigacao |
|-------|-----------|-----------|
| Token vazado em logs | O token aparece em logs de acesso web | Expiracao curta + `jti` unico |
| Replay attack | Atacante reutiliza um token capturado | Blacklist de `jti` com TTL curto |
| Segredo vazado | Atacante descobre `SSO_SHARED_SECRET` | Rotacionar segredo periodicamente; usar RS256 no futuro |
| Role escalation | CRM envia `role: admin` para usuario comum | Validar roles no License Manager; mapear roles entre sistemas |
| Usuario inexistente | CRM envia `sub` nao cadastrado | Auto-provisionar com perfil minimo OU rejeitar |

---

## 7. Mapeamento de Usuarios e Roles

O CRM e o License Manager podem ter nomenclaturas de roles diferentes. Recomenda-se criar um mapeamento:

| Role no CRM | Role no License Manager | Perfil sugerido |
|-------------|------------------------|-----------------|
| `administrador` | `admin` | Administrador |
| `gerente` | `editor` | Gerente |
| `tecnico` | `editor` | Tecnico |
| `comercial` | `viewer` | Comercial |
| `auditor` | `viewer` | Auditor |
| `default` | `viewer` | Somente Leitura |

O endpoint SSO do License Manager deve aplicar esse mapeamento antes de criar/atualizar o usuario.

---

## 8. Checklist de Implementacao

### 8.1 No License Manager

- [ ] Adicionar `jsonwebtoken` (ou `jose`) ao `package.json`.
- [ ] Adicionar variaveis de ambiente `SSO_SHARED_SECRET`, `SSO_TOKEN_MAX_AGE_SECONDS`, `SSO_ALLOWED_ISSUERS`.
- [ ] Criar endpoint `GET /api/auth/sso` conforme especificacao.
- [ ] Implementar validacao de assinatura, claims (`iss`, `aud`, `exp`, `jti`).
- [ ] Implementar blacklist de `jti` (Set em memoria ou Redis).
- [ ] Implementar busca/criacao de usuario (`getUserByUsername` / `createUser`).
- [ ] Reutilizar logica de criacao de sessao e cookie (`sessions.set` + `res.cookie`).
- [ ] Registrar audit log com `method: "sso"`.
- [ ] Redirecionar para `/` apos sucesso.
- [ ] Testes: token valido, token expirado, token com assinatura invalida, token replay.

### 8.2 No CRM

- [ ] Adicionar biblioteca JWT ao projeto do CRM.
- [ ] Configurar `SSO_SHARED_SECRET` no ambiente do CRM (mesmo valor do License Manager).
- [ ] Modificar o link do menu "Sistemas Polo -> License Manager" para apontar para um endpoint interno do CRM.
- [ ] Implementar endpoint no CRM que gera o JWT e redireciona o usuario para o License Manager.
- [ ] Garantir que o JWT contenha todas as claims obrigatorias.
- [ ] Testar fluxo end-to-end.

---

## 9. Resumo do Fluxo

```
Usuario logado no CRM
    |
    v
CRM backend gera JWT assinado (expira em 60s)
    |
    v
Redireciona para https://license.polo.com.br/api/auth/sso?token=<jwt>
    |
    v
License Manager valida JWT (assinatura, exp, jti)
    |
    v
Busca/cria usuario em users_internal
    |
    v
Cria sessao em memoria + cookie sessionId
    |
    v
Redireciona para / (Dashboard ja autenticado)
```

---

## 10. Perguntas Frequentes

**Q: E se o usuario ja estiver logado no License Manager?**
A: O endpoint pode verificar se ja existe um cookie `sessionId` valido. Se sim, pode apenas redirecionar para `/`.

**Q: E se os sistemas estiverem em dominios diferentes?**
A: Isso e esperado (`crm.ippolo.com.br` -> `license.polo.com.br`). O cookie `sessionId` sera definido no dominio do License Manager e enviado automaticamente em todas as requisicoes subsequentes.

**Q: Como revogar acesso de um usuario?**
A: Remova ou desative o usuario em `users_internal` (status = `inactive`). A sessao no Map expira em 24h, mas para invalidacao imediata seria necessario implementar uma blacklist de sessionIds (ou migrar para Redis/store persistente).

**Q: E possivel usar RS256 em vez de HS256?**
A: Sim. No CRM, assine com a chave privada. No License Manager, valide com a chave publica. Isso elimina o risco de vazamento do segredo compartilhado.

---

> **Nota:** Esta documentacao foi elaborada em Junho de 2026 com base na arquitetura atual do License Manager (sessao em memoria + cookies). A medida que o sistema evoluir (ex: migracao para Redis ou JWT nativo), esta especificacao deve ser revisada.
