# Integracao SSO — Instrucoes para o Dev do CRM Polo

**Para:** Desenvolvedor do CRM (`crm.ippolo.com.br`)
**De:** Time License Manager
**Objetivo:** Quando o usuario clicar no botao "Acessar Sistema" do menu **Sistemas Polo** apontando para o **License Manager**, ele deve chegar la ja autenticado automaticamente, sem precisar digitar login/senha novamente.

---

## Visao Geral do que precisa ser feito

Hoje o link provavelmente esta assim (abre direto o site):

```
https://license.polo.com.br
```

Precisa mudar para que o clique no botao chame **um endpoint do proprio CRM**, que vai:

1. Pegar os dados do usuario logado na sessao do CRM
2. Gerar um token JWT assinado com os dados desse usuario
3. Redirecionar o navegador para o License Manager com esse token na URL

O License Manager ja tera o endpoint pronto para receber esse token, validar e logar o usuario automaticamente.

---

## O que o License Manager vai fazer (nao e sua responsabilidade)

So para contexto, o License Manager vai:

- Receber a requisicao em `GET https://license.polo.com.br/api/auth/sso?token=<jwt>`
- Validar a assinatura do token
- Verificar se o token nao esta expirado
- Criar uma sessao para o usuario
- Redirecionar para o dashboard ja logado

Voce so precisa se preocupar em **gerar o token e redirecionar**.

---

## O que voce precisa implementar

### Passo 1 — Instalar uma biblioteca JWT

Escolha de acordo com o stack do CRM:

| Stack | Biblioteca | Instalacao |
|-------|-----------|------------|
| PHP | `firebase/php-jwt` | `composer require firebase/php-jwt` |
| Node.js / TypeScript | `jsonwebtoken` | `npm install jsonwebtoken` |
| Python | `PyJWT` | `pip install PyJWT` |
| C# / .NET | `System.IdentityModel.Tokens.Jwt` | Ja incluido no .NET |

---

### Passo 2 — Configurar o segredo compartilhado

Adicione uma variavel de ambiente no servidor do CRM:

```
SSO_LICENSE_MANAGER_SECRET=VALOR_FORNECIDO_PELO_TIME_LICENSE_MANAGER
```

> **Importante:** Este valor sera fornecido pelo time do License Manager. Nao crie um valor por conta propria — os dois sistemas precisam ter o mesmo segredo. Nao commite esse valor no repositorio Git; use variaveis de ambiente ou um cofre de segredos.

---

### Passo 3 — Criar um endpoint no CRM para gerar o link

Crie uma rota/controller que:
- Exige que o usuario esteja autenticado no CRM (protegida pela sessao normal do CRM)
- Gera o token JWT
- Redireciona para o License Manager

**Rota sugerida:** `GET /integracoes/license-manager/acessar`

#### Implementacao em PHP:

```php
<?php
// routes/integracoes.php ou similar

use Firebase\JWT\JWT;

// Essa rota deve ser protegida pelo seu middleware de autenticacao
Route::get('/integracoes/license-manager/acessar', function () {

    // 1. Pega o usuario logado na sessao do CRM
    $usuario = auth()->user(); // Adapte para o seu sistema de auth

    // 2. Monta o payload do token
    $agora = time();
    $payload = [
        'sub'   => (string) $usuario->id,       // ID unico do usuario no CRM
        'name'  => $usuario->name,              // Nome completo
        'email' => $usuario->email,             // E-mail
        'role'  => mapearRole($usuario->role),  // Veja funcao de mapeamento abaixo
        'iss'   => 'crm.ippolo.com.br',         // Identificador do CRM (fixo)
        'aud'   => 'license-manager.polo.com.br', // Identificador do License Manager (fixo)
        'iat'   => $agora,                      // Hora de emissao
        'exp'   => $agora + 60,                 // Expira em 60 segundos (IMPORTANTE: valor baixo)
        'jti'   => uniqid('sso-', true),        // ID unico para evitar reutilizacao do token
    ];

    // 3. Assina o token com o segredo compartilhado
    $segredo = env('SSO_LICENSE_MANAGER_SECRET');
    $token = JWT::encode($payload, $segredo, 'HS256');

    // 4. Redireciona o usuario para o License Manager com o token
    $url = 'https://license.polo.com.br/api/auth/sso?token=' . urlencode($token);
    return redirect($url);

})->middleware('auth'); // Garante que so usuarios logados acessam


// Funcao para mapear os roles do CRM para os roles do License Manager
function mapearRole(string $roleCRM): string {
    $mapa = [
        'administrador' => 'admin',
        'admin'         => 'admin',
        'gerente'       => 'editor',
        'tecnico'       => 'editor',
        'comercial'     => 'viewer',
        'auditor'       => 'viewer',
        'suporte'       => 'viewer',
    ];
    return $mapa[$roleCRM] ?? 'viewer'; // Padrao: viewer
}
```

---

#### Implementacao em Node.js / Express:

```typescript
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Router } from "express";

const router = Router();

// Middleware que garante usuario autenticado no CRM (adapte para o seu sistema)
router.get("/integracoes/license-manager/acessar", requireAuth, (req, res) => {

  // 1. Pega o usuario logado na sessao do CRM
  const usuario = req.user; // Adapte para o seu sistema de auth

  const mapeamentoRoles: Record<string, string> = {
    administrador: "admin",
    admin: "admin",
    gerente: "editor",
    tecnico: "editor",
    comercial: "viewer",
    auditor: "viewer",
    suporte: "viewer",
  };

  // 2. Monta e assina o token
  const agora = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      sub: String(usuario.id),
      name: usuario.name,
      email: usuario.email,
      role: mapeamentoRoles[usuario.role] ?? "viewer",
      iss: "crm.ippolo.com.br",
      aud: "license-manager.polo.com.br",
      iat: agora,
      exp: agora + 60, // 60 segundos de validade
      jti: crypto.randomUUID(),
    },
    process.env.SSO_LICENSE_MANAGER_SECRET!,
    { algorithm: "HS256" }
  );

  // 3. Redireciona para o License Manager
  const url = `https://license.polo.com.br/api/auth/sso?token=${encodeURIComponent(token)}`;
  return res.redirect(url);
});
```

---

#### Implementacao em Python / Django:

```python
import jwt
import time
import uuid
import os
from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required

ROLE_MAP = {
    "administrador": "admin",
    "admin": "admin",
    "gerente": "editor",
    "tecnico": "editor",
    "comercial": "viewer",
    "auditor": "viewer",
    "suporte": "viewer",
}

@login_required
def acessar_license_manager(request):
    usuario = request.user
    segredo = os.environ.get("SSO_LICENSE_MANAGER_SECRET")
    agora = int(time.time())

    payload = {
        "sub": str(usuario.id),
        "name": usuario.get_full_name() or usuario.username,
        "email": usuario.email,
        "role": ROLE_MAP.get(usuario.role, "viewer"),
        "iss": "crm.ippolo.com.br",
        "aud": "license-manager.polo.com.br",
        "iat": agora,
        "exp": agora + 60,
        "jti": str(uuid.uuid4()),
    }

    token = jwt.encode(payload, segredo, algorithm="HS256")
    url = f"https://license.polo.com.br/api/auth/sso?token={token}"
    return redirect(url)
```

---

### Passo 4 — Alterar o link no menu "Sistemas Polo"

Onde hoje o botao "Acessar Sistema" do License Manager aponta diretamente para `https://license.polo.com.br`, mude para apontar para o novo endpoint interno do CRM.

**Antes:**
```html
<a href="https://license.polo.com.br" target="_blank">
  Acessar Sistema
</a>
```

**Depois:**
```html
<!-- O link agora aponta para o endpoint do CRM, que vai gerar o token e redirecionar -->
<a href="/integracoes/license-manager/acessar">
  Acessar Sistema
</a>
```

> **Nota:** Remova o `target="_blank"` ou mantenha conforme preferencia. Se mantiver, o SSO vai funcionar normalmente — o token sera validado e o usuario ficara logado na nova aba.

---

## Especificacao do Token JWT

Para referencia, aqui estao todos os campos que o token deve conter:

| Campo | Tipo | Obrigatorio | Descricao | Exemplo |
|-------|------|-------------|-----------|---------|
| `sub` | string | Sim | ID unico e **imutavel** do usuario no CRM. Use sempre o ID primario do banco — nunca username ou e-mail, pois podem mudar. O License Manager usa este campo para identificar o usuario: na primeira vez cria o registro, nas demais apenas abre uma nova sessao. Se o valor mudar, um novo usuario duplicado sera criado. | `"123"` ou `"usr_abc"` |
| `name` | string | Sim | Nome completo do usuario | `"Joao Silva"` |
| `email` | string | Recomendado | E-mail do usuario | `"joao@ippolo.com.br"` |
| `role` | string | Sim | Papel no License Manager | `"admin"`, `"editor"` ou `"viewer"` |
| `iss` | string | Sim | Emissor — dominio do CRM | `"crm.ippolo.com.br"` |
| `aud` | string | Sim | Audiencia — dominio do License Manager | `"license-manager.polo.com.br"` |
| `iat` | number | Sim | Timestamp de emissao (Unix) | `1718217600` |
| `exp` | number | Sim | Timestamp de expiracao (Unix) — maximo iat + 120s | `1718217660` |
| `jti` | string | Recomendado | ID unico do token (evita reutilizacao) | `"sso-abc123"` |

**Algoritmo de assinatura:** `HS256` (HMAC-SHA256)

---

## Roles disponiveis no License Manager

O campo `role` deve ser um dos seguintes valores (qualquer outro sera rejeitado ou tratado como `viewer`):

| Valor | Permissoes |
|-------|-----------|
| `admin` | Acesso total — ver, criar, editar, excluir tudo, ver logs de auditoria |
| `editor` | Ver e editar clientes, credenciais, licencas. Nao acessa usuarios/perfis |
| `viewer` | Somente leitura — nao pode criar ou editar nada |

---

## Fluxo Resumido

```
1. Usuario esta logado no CRM e clica em "Acessar Sistema" (License Manager)

2. Browser faz GET /integracoes/license-manager/acessar no servidor do CRM

3. Servidor do CRM:
   - Verifica que o usuario esta autenticado
   - Gera token JWT assinado (validade: 60 segundos)
   - Retorna HTTP 302 Location: https://license.polo.com.br/api/auth/sso?token=<jwt>

4. Browser segue o redirect para o License Manager

5. License Manager:
   - Valida assinatura do token
   - Verifica que nao esta expirado
   - Cria sessao para o usuario
   - Retorna HTTP 302 Location: /

6. Browser carrega o dashboard do License Manager ja autenticado
```

---

## Checklist para o Dev do CRM

- [ ] Instalar biblioteca JWT no projeto do CRM
- [ ] Solicitar o valor de `SSO_LICENSE_MANAGER_SECRET` ao time do License Manager
- [ ] Configurar `SSO_LICENSE_MANAGER_SECRET` como variavel de ambiente no servidor do CRM
- [ ] Criar endpoint protegido (ex: `GET /integracoes/license-manager/acessar`)
- [ ] Implementar a geracao do JWT com todos os campos obrigatorios
- [ ] Garantir que o token expira em no maximo 60-120 segundos
- [ ] Alterar o link do botao "Acessar Sistema" no menu Sistemas Polo
- [ ] Testar em ambiente de desenvolvimento
- [ ] Confirmar com o time do License Manager que o endpoint `/api/auth/sso` esta pronto no servidor deles
- [ ] Testar em ambiente de producao

---

## Informacoes que o Time do License Manager vai fornecer

Antes de comecar, solicite ao time do License Manager:

1. **`SSO_LICENSE_MANAGER_SECRET`** — o segredo compartilhado para assinar o token
2. **URL de producao** do License Manager (ex: `https://license.polo.com.br`) para confirmar o valor de `aud` e a URL de redirect
3. **URL de homologacao/staging** (se houver) para testes antes de subir em producao

---

## Duvidas Frequentes

**Q: O token fica exposto na URL do navegador?**
A: Sim, por isso o tempo de expiracao e de apenas 60 segundos. Apos esse tempo, o token nao pode mais ser usado. Alem disso, o sistema garante que cada token so pode ser usado uma unica vez.

**Q: O que acontece se o usuario nao existir no License Manager?**
A: O License Manager ira criar automaticamente o usuario com o perfil "Somente Leitura". O administrador do License Manager pode depois ajustar o perfil manualmente se necessario.

**Q: O que acontece se o token expirar antes do usuario ser redirecionado?**
A: O License Manager retornara um erro `401`. Isso so acontece se houver uma demora de mais de 60 segundos entre a geracao do token e o redirecionamento — o que nao deve ocorrer em condicoes normais.

**Q: Precisa abrir alguma porta ou liberar firewall?**
A: Nao. O fluxo e inteiramente via redirecionamentos HTTP no navegador do usuario. Nao ha nenhuma chamada direta de servidor para servidor nesta implementacao.

**Q: Funciona com `target="_blank"` (abre em nova aba)?**
A: Sim, funciona normalmente.

---

> **Contato:** Em caso de duvidas tecnicas, entrar em contato com o time do License Manager para alinhar os valores de `SSO_LICENSE_MANAGER_SECRET`, `iss` e `aud` antes da implementacao.
