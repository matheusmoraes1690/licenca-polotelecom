# Documentação do Sistema — License Manager

## 1. Visão Geral

O **License Manager** é uma aplicação web completa para gestão de relacionamento com clientes, licenças de software, cofre de senhas (vault) e auditoria de ações. O sistema oferece um painel administrativo centralizado com estatísticas em tempo real, controle granular de credenciais com criptografia, rastreamento de auditoria e integração com sistemas externos (Milvus).

---

## 2. Tecnologias e Stack

### 2.1 Backend
- **Runtime:** Node.js (TypeScript via `tsx`)
- **Framework:** Express 4.x
- **ORM:** Drizzle ORM (`drizzle-orm`, `drizzle-zod`)
- **Banco de Dados:** PostgreSQL (`pg` + `drizzle-orm/node-postgres`) — via `DATABASE_URL`
- **Validação:** Zod
- **Autenticação:** Sessão em memória com cookies (`cookie-parser`) + PBKDF2 para hash de senhas
- **Build:** `esbuild` via script custom (`script/build.ts`)

### 2.2 Frontend
- **Framework:** React 18 + TypeScript
- **Bundler:** Vite 7.x
- **Roteamento:** `wouter`
- **Estado/Cache:** TanStack Query (`@tanstack/react-query`)
- **Estilização:** Tailwind CSS 3.x + `tailwindcss-animate`
- **UI Components:** shadcn/ui (baseado em Radix UI)
- **Ícones:** `lucide-react`
- **Gráficos:** `recharts`
- **Formulários:** `react-hook-form` + `@hookform/resolvers` + Zod
- **Animações:** `framer-motion`

### 2.3 Compartilhado (`shared/`)
- Schemas do banco de dados (Drizzle)
- Schemas de validação Zod
- Tipos TypeScript
- Definição tipada de rotas da API

---

## 3. Arquitetura do Projeto

```
License-Manager/
├── client/                  # Aplicação React (frontend)
│   ├── src/
│   │   ├── App.tsx           # Raiz com rotas protegidas
│   │   ├── main.tsx          # Ponto de entrada
│   │   ├── pages/            # Telas do sistema
│   │   ├── components/       # Componentes reutilizáveis + UI + Layout
│   │   ├── hooks/            # Hooks customizados (TanStack Query)
│   │   └── lib/              # Utilitários (queryClient, utils)
│   └── index.html
├── server/                   # API Express (backend)
│   ├── index.ts              # Bootstrap do servidor
│   ├── routes.ts             # Registro de todas as rotas
│   ├── storage.ts            # Implementação do storage (DatabaseStorage)
│   ├── db.ts                 # Conexão Drizzle + PostgreSQL
│   ├── auth-service.ts       # Autenticação, usuários, perfis e sessões
│   ├── encryption.ts         # Criptografia AES para senhas do vault
│   ├── vite.ts               # Middleware Vite em dev
│   └── services/
│       └── milvus-service.ts # Integração com Milvus
├── shared/                   # Código compartilhado entre frontend e backend
│   ├── schema.ts             # Tabelas Drizzle + schemas Zod + tipos
│   └── routes.ts             # Contrato tipado da API
├── migrations/               # Migrações do banco (Drizzle)
├── script/
│   └── build.ts              # Script de build com esbuild
├── Docs/                     # Documentação
├── drizzle.config.ts         # Configuração do Drizzle Kit
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. Funcionalidades do Sistema

### 4.1 Autenticação e Controle de Acesso
- Tela de login com sessão baseada em cookies (`sessionId`) com duração de 24h.
- Credencial padrão para desenvolvimento: `admin` / `admin` (criada automaticamente via seed se não houver usuários).
- Sistema de **perfis** (profiles) com permissões granulares em JSON.
- **Roles:** `admin`, `editor`, `viewer`.
- Proteção contra força bruta: bloqueio automático após 5 tentativas falhas por 30 minutos.
- Controle de status de usuário: `active`, `inactive`, `blocked`.
- Rotas protegidas: redirecionamento automático para `/auth` se não autenticado.
- Middleware `requireRole` para restringir endpoints por papel.
- Alteração de senha pelo dropdown do usuário no header.

### 4.2 Dashboard (Painel)
Visão geral com cards estatísticos:
- **Total de Clientes**
- **Total de Licenças**
- **Licenças Ativas**
- **Licenças Expirando em Breve**
- **Licenças Perpétuas**
- **Total de Credenciais** (excluindo excluídas)
- **Credenciais Ativas**
- **Credenciais Inativas**
- **Eventos de Auditoria Recentes** (últimas 24h)

Inclui gráfico de barras e ações rápidas para navegação.

### 4.3 Clientes (CRUD Completo)
- Listagem de clientes com busca.
- Cadastro de novos clientes (nome, e-mail, telefone, endereço, status, documento).
- Edição e exclusão.
- Campos de integração Milvus: `milvusId`, `source`, `lastSyncAt`, `syncStatus`, `milvusUpdatedAt`.
- **Detalhes do Cliente** (`/clients/:id`):
  - Informações gerais
  - Licenças vinculadas
  - **Credenciais de Acesso** (legado: `client_access`)
  - **Documentos** (upload de arquivos ou links externos, com preview/download)
  - **Cofre de Senhas** vinculado ao cliente (`credentials`)

### 4.4 Licenças (CRUD Completo)
- Gestão de chaves de licença com status (`active`, `expired`, `suspended`).
- Relacionamentos:
  - **Fornecedor**
  - **Produto**
  - **Cliente** (vínculo opcional)
- Campos de controle de renovação:
  - `contractType`: `new`, `renewal`, `trial`, `perpetual`
  - `renewalType`: `none`, `annual`, `monthly`, `custom`
  - `expirationDate` (timestamp)
  - `alertDaysBefore` (dias de antecedência para alerta)
  - `serviceCategory` (categoria de serviço inline)
- Filtros por cliente e status.
- Visualização com detalhes enriquecidos (nomes dos relacionamentos resolvidos).
- **Exportação CSV** de licenças e clientes.

### 4.5 Cofre de Senhas (Vault)
Módulo robusto de gestão de credenciais por cliente:
- Criação de credenciais com título, URL, usuário, senha criptografada, notas criptografadas, tags e categoria.
- **Criptografia:** Senhas e notas são criptografadas com AES antes de persistir (`server/encryption.ts`).
- **Campos customizados:** Campos adicionais por credencial, com opção de criptografia.
- **Histórico:** Registro automático de alterações (`credential_history`).
- **Documentos anexos:** Arquivos ou links por credencial (`credential_documents`).
- **Soft Delete:** Exclusão lógica para a lixeira, com motivo e auditoria.
- **Restauração:** Recuperação de credenciais da lixeira.
- **Exclusão permanente:** Apenas administradores podem excluir definitivamente.
- **Revelar senha:** Endpoint protegido por role para descriptografar e exibir senha.
- Filtros por cliente, categoria, status e busca textual.

### 4.6 Auditoria
- Tela de logs de auditoria (`/audit`) acessível por administradores.
- Registro automático de todas as ações principais: create, update, delete, restore, import, sync, login.
- Dados capturados: usuário, IP, user-agent, entidade, ID da entidade, snapshot JSON dos dados anteriores.
- Filtros por entidade, entityId e limite de resultados.

### 4.7 Lixeira
- Tela (`/trash`) listando credenciais com status `deleted`.
- Permite restaurar credenciais ou excluir permanentemente (admin).

### 4.8 Cadastros Auxiliares (CRUD Completo)
Módulos de suporte:
- **Fornecedores** — dados de fornecedores de software/hardware.
- **Produtos** — catálogo de produtos com fornecedor, categoria e preço.
- **Categorias de Credencial** — classificação para o cofre de senhas.
- **Usuários e Perfis** — gestão de acesso e permissões (`/settings/users`).

### 4.9 Integração Milvus
- **Busca de clientes** no Milvus por documento, nome fantasia ou status.
- **Importação individual** de cliente do Milvus para o sistema local (com detecção de duplicidade).
- **Sincronização** de cliente existente com dados do Milvus.
- **Importação em lote** (`import-all`) com resumo de criados, atualizados, ignorados e conflitos.
- Configuração de endpoint Milvus em `/settings/milvus`.

### 4.10 Layout e UX
- Sidebar fixa com navegação (desktop) e menu mobile via Sheet.
- Menu colapsável **Cadastro** agrupando fornecedores, produtos, importação Milvus e integração Milvus.
- Header com notificações (bell), menu do usuário (Avatar + Dropdown) e alteração de senha.
- Design responsivo (mobile-first) com Tailwind CSS.
- Animações suaves de entrada e interações com Framer Motion.

---

## 5. Modelo de Dados (Schema)

### 5.1 Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `clients` | Clientes/empresas atendidas |
| `licenses` | Chaves de licença de software |
| `fornecedores` | Fornecedores de produtos/licenças |
| `produtos` | Produtos do catálogo |
| `client_access` | Credenciais de acesso legado por cliente |
| `client_documents` | Documentos e arquivos anexos por cliente |
| `users_internal` | Usuários internos do sistema |
| `profiles` | Grupos de permissões (perfis) |
| `credentials` | Credenciais do cofre de senhas (vault) |
| `credential_categories` | Categorias de credencial |
| `credential_custom_fields` | Campos customizados por credencial |
| `credential_history` | Histórico de alterações de credenciais |
| `credential_documents` | Documentos anexos a credenciais |
| `audit_logs` | Logs de auditoria de todas as ações |

### 5.2 Relacionamentos
- `licenses` → `clients`, `fornecedores`, `produtos`
- `produtos` → `fornecedores`
- `client_access` → `clients`
- `client_documents` → `clients`
- `credentials` → `clients`, `credential_categories`, `users_internal` (responsible)
- `credential_custom_fields` → `credentials`
- `credential_history` → `credentials`, `users_internal`
- `credential_documents` → `credentials`
- `audit_logs` → `users_internal`, `clients`, `credentials`
- `users_internal` → `profiles`

### 5.3 Status Padrão
- `active` / `inactive` (clientes, fornecedores, produtos)
- `active` / `expired` / `suspended` (licenças)
- `active` / `inactive` / `blocked` (usuários)
- `active` / `inactive` / `deleted` (credenciais)

---

## 6. API Backend

### 6.1 Endpoints de Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login com sessão cookie |
| POST | `/api/auth/logout` | Logout e invalidação de sessão |
| GET | `/api/auth/user` | Usuário atual da sessão |

### 6.2 Endpoints de Usuários e Perfis
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/users` | Listar usuários internos |
| POST | `/api/users` | Criar usuário (admin) |
| PUT | `/api/users/:id` | Atualizar usuário (próprio ou admin) |
| GET | `/api/profiles` | Listar perfis de permissão |
| POST | `/api/profiles` | Criar perfil (admin) |
| PUT | `/api/profiles/:id` | Atualizar perfil (admin) |
| DELETE | `/api/profiles/:id` | Excluir perfil (admin) |

### 6.3 Endpoints de Recursos Principais
Todos exigem autenticação e seguem o padrão REST:

| Recurso | Listar | Obter | Criar | Atualizar | Excluir |
|---------|--------|-------|-------|-----------|---------|
| `/api/clients` | GET | GET | POST | PUT | DELETE |
| `/api/licenses` | GET | GET | POST | PUT | DELETE |
| `/api/fornecedores` | GET | GET | POST | PUT | DELETE |
| `/api/produtos` | GET | GET | POST | PUT | DELETE |
| `/api/credential-categories` | GET | — | POST | — | — |

### 6.4 Endpoints do Vault (Credenciais)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/credentials` | Listar credenciais (com filtros) |
| GET | `/api/credentials/:id` | Obter credencial |
| POST | `/api/credentials` | Criar credencial |
| PUT | `/api/credentials/:id` | Atualizar credencial |
| DELETE | `/api/credentials/:id` | Soft delete (com `?reason`) |
| POST | `/api/credentials/:id/restore` | Restaurar credencial |
| DELETE | `/api/credentials/:id/permanent` | Excluir permanentemente (admin) |
| POST | `/api/credentials/:id/reveal` | Revelar senha (admin/editor) |
| POST | `/api/credentials/:id/copy-password` | Copiar senha (admin/editor) |
| GET | `/api/credentials/:id/custom-fields` | Campos customizados |
| GET | `/api/credentials/:id/history` | Histórico de alterações |

### 6.5 Endpoints de Documentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/clients/:clientId/documents` | Documentos do cliente |
| POST | `/api/clients/:clientId/documents` | Anexar documento/link |
| DELETE | `/api/clients/:clientId/documents/:id` | Excluir documento |
| GET | `/api/documents/:id/file` | Download/preview de arquivo |
| GET | `/api/credentials/:credentialId/documents` | Documentos da credencial |
| POST | `/api/credentials/:credentialId/documents` | Anexar documento à credencial |
| DELETE | `/api/credentials/:credentialId/documents/:id` | Excluir documento da credencial |
| GET | `/api/credential-documents/:id/file` | Download/preview de arquivo de credencial |

### 6.6 Endpoints de Auditoria e Alertas
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/audit-logs` | Logs de auditoria (admin) |
| GET | `/api/alerts` | Alertas de licenças próximas da expiração |

### 6.7 Endpoints de Exportação
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/export/licenses.csv` | Exportar licenças para CSV |
| GET | `/api/export/clients.csv` | Exportar clientes para CSV |

### 6.8 Endpoints de Integração Milvus
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/integrations/milvus/clients/search` | Buscar clientes no Milvus |
| POST | `/api/integrations/milvus/clients/import` | Importar cliente do Milvus |
| POST | `/api/integrations/milvus/clients/sync/:milvusId` | Sincronizar cliente existente |
| POST | `/api/integrations/milvus/clients/import-all` | Importação em lote (com `?dryRun`) |

### 6.9 Seed de Dados
O sistema executa automaticamente um seed na inicialização se as tabelas estiverem vazias:
- Perfis padrão: Administrador, Gerente, Técnico, Comercial, Auditor, Somente Leitura.
- Usuário padrão: `admin` / `admin` (vinculado ao perfil Administrador).

---

## 7. Scripts e Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento (Express + Vite HMR) |
| `npm run build` | Compila o backend para `dist/index.cjs` |
| `npm start` | Executa a versão de produção |
| `npm run check` | Verificação de tipos TypeScript (`tsc`) |
| `npm run db:push` | Sincroniza o schema com o banco (Drizzle Kit) |

---

## 8. Fluxo de Dados e State Management

### 8.1 Frontend
- **TanStack Query** gerencia todo o cache de dados da API.
- Cada recurso possui um hook dedicado em `client/src/hooks/` (ex: `use-clients.ts`, `use-licenses.ts`).
- Autenticação é gerenciada pelo hook `use-auth.ts`, com cache da query `/api/auth/user`.
- Formulários utilizam `react-hook-form` com resolvers Zod para validação client-side.

### 8.2 Backend
- Requisições entram pelo Express.
- `server/routes.ts` registra todos os endpoints e delega para `storage.ts`.
- `storage.ts` utiliza Drizzle ORM para executar queries SQL no PostgreSQL.
- Validação de inputs ocorre via Zod schemas importados de `@shared/schema`.
- Ações sensíveis são registradas automaticamente em `audit_logs`.

---

## 9. Regras de Negócio Importantes

1. **Autenticação obrigatória:** Todas as rotas de API (exceto login) exigem sessão válida (`isAuthenticated`).
2. **Controle de acesso por role:** Alguns endpoints exigem `admin` ou `editor` (`requireRole`).
3. **Licenças desvinculadas:** Uma licença pode existir sem estar associada a um cliente (estoque).
4. **Documentos:** Suporta arquivos (upload base64) e links externos. O endpoint `/api/documents/:id/file` serve arquivos com headers MIME apropriados.
5. **Soft delete no vault:** Credenciais excluídas vão para a lixeira (`status = 'deleted'`). Podem ser restauradas ou excluídas permanentemente por admin.
6. **Status de licença:** `expired` é contabilizado como "expirando em breve" no dashboard. Licenças com `renewalType = 'none'` são perpétuas.
7. **Criptografia:** Senhas e notas do cofre são criptografadas com AES. A chave é gerenciada pelo `server/encryption.ts`.
8. **Auditoria:** Todas as ações de create, update, delete em recursos principais geram logs automáticos.
9. **Bloqueio de conta:** Após 5 tentativas falhas de login, a conta é bloqueada por 30 minutos.

---

## 10. Segurança (Notas de Dev)

- O sistema está configurado para desenvolvimento e produção. A autenticação usa sessões em memória (considere Redis para produção).
- Senhas são hashadas com PBKDF2 (100k iterações, SHA-512, salt aleatório).
- Credenciais do vault usam criptografia AES via `server/encryption.ts`.
- Para produção, deve-se:
  - Substituir sessões em memória por Redis ou store persistente.
  - Utilizar HTTPS para cookies seguros (`secure: true` já configurado em produção).
  - Implementar rate limiting nos endpoints de auth.
  - Sanitizar uploads de documentos (validação de tipo/tamanho).
  - Revisar permissões do banco PostgreSQL.

---

## 11. Pontos de Extensão

O sistema está estruturado para facilitar evoluções:
- Novas entidades podem ser adicionadas em `shared/schema.ts` e propagadas para `storage.ts` e `routes.ts`.
- Novas páginas são adicionadas em `client/src/pages/` e registradas em `App.tsx`.
- O menu lateral em `Layout` (`client/src/components/layout.tsx`) permite adicionar novos itens de navegação facilmente.
- O contrato de API tipado em `shared/routes.ts` garante consistência entre frontend e backend.
- Novos perfis de permissão podem ser criados via API ou seed.

---

## 12. Dependências Principais

### Produção
- `express`, `drizzle-orm`, `pg`, `zod`, `drizzle-zod`
- `react`, `react-dom`, `wouter`, `@tanstack/react-query`
- `tailwindcss`, `framer-motion`, `lucide-react`, `recharts`
- Radix UI primitives (`@radix-ui/react-*`)
- `cookie-parser`, `dotenv`, `connect-pg-simple`, `express-session`
- `date-fns`, `cmdk`, `class-variance-authority`, `tailwind-merge`
- `react-hook-form`, `@hookform/resolvers`

### Desenvolvimento
- `typescript`, `vite`, `tsx`, `drizzle-kit`, `esbuild`
- `@types/express`, `@types/react`, `@types/node`
- `@vitejs/plugin-react`, `autoprefixer`, `postcss`

---

> **Nota:** Esta documentação reflete o estado atual do código-fonte em Junho de 2026. Para dúvidas sobre implementações específicas, consulte os arquivos citados nas seções anteriores.
