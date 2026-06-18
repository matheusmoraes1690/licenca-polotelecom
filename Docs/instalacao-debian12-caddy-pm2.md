# Guia de Instalação — Debian 12 com Caddy e PM2

> **Ambiente alvo:** Debian 12 (Bookworm) — servidor limpo  
> **Stack:** Node.js 20 LTS · PM2 · Caddy · PostgreSQL remoto

---

## 1. Pré-requisitos do Servidor

### 1.1 Atualizar pacotes do sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Instalar dependências base

```bash
sudo apt install -y curl git build-essential
```

---

## 2. Instalar Node.js 20 LTS

Usando o repositório oficial NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verificar instalação:

```bash
node -v   # deve retornar v20.x.x
npm -v    # deve retornar 10.x.x
```

---

## 3. Instalar PM2

```bash
sudo npm install -g pm2
```

---

## 4. Instalar Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

Verificar:

```bash
caddy version
```

---

## 5. Implantar a Aplicação

### 5.1 Criar usuário de sistema (recomendado)

```bash
sudo adduser --system --group --home /opt/license-manager licmgr
```

### 5.2 Transferir o código

**Opção A — via Git:**

```bash
sudo -u licmgr git clone <URL_DO_REPOSITORIO> /opt/license-manager
```

**Opção B — via SCP (do Windows):**

```powershell
scp -r "C:\Users\mathe\App\License-Manager" usuario@servidor:/opt/license-manager
```

Depois, no servidor:

```bash
sudo chown -R licmgr:licmgr /opt/license-manager
```

### 5.3 Instalar dependências Node

```bash
sudo -u licmgr bash -c "cd /opt/license-manager && npm install"
```

---

## 6. Configurar Variáveis de Ambiente

Criar o arquivo `.env` na raiz do projeto:

```bash
sudo -u licmgr nano /opt/license-manager/.env
```

Conteúdo mínimo para produção:

```dotenv
# Banco de dados PostgreSQL (remoto)
DATABASE_URL=postgresql://USUARIO:SENHA@HOST:5432/BANCO

# Servidor
PORT=3000
NODE_ENV=production

# Segurança — gerar com: openssl rand -base64 32
VAULT_ENCRYPTION_KEY=chave-aleatoria-forte-de-32-caracteres!!

# Integração Milvus (opcional)
MILVUS_API_BASE_URL=https://apiintegracao.milvus.com.br/api
MILVUS_API_TOKEN=SEU_TOKEN_MILVUS
```

> **Importante:** Nunca use a chave de exemplo em produção. Gere uma chave forte com:
> ```bash
> openssl rand -base64 32
> ```

Restringir permissões do `.env`:

```bash
sudo chmod 600 /opt/license-manager/.env
```

---

## 7. Build da Aplicação

```bash
sudo -u licmgr bash -c "cd /opt/license-manager && npm run build"
```

Este comando executa `script/build.ts` e gera:

```
dist/
├── index.cjs       ← servidor Express compilado (esbuild)
└── public/         ← frontend React compilado (Vite)
```

---

## 8. Aplicar Migrações do Banco de Dados

Execute o schema no banco PostgreSQL (apenas na primeira instalação ou após atualizações):

```bash
sudo -u licmgr bash -c "cd /opt/license-manager && npx drizzle-kit push"
```

---

## 9. Configurar PM2

### 9.1 Criar arquivo de ecossistema PM2

```bash
sudo -u licmgr nano /opt/license-manager/ecosystem.config.cjs
```

Conteúdo:

```js
module.exports = {
  apps: [
    {
      name: "license-manager",
      script: "dist/index.cjs",
      cwd: "/opt/license-manager",
      instances: 1,
      exec_mode: "fork",
      node_args: "--max-old-space-size=512",
      env_file: "/opt/license-manager/.env",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/license-manager/error.log",
      out_file: "/var/log/license-manager/out.log",
      restart_delay: 3000,
      max_restarts: 10,
    },
  ],
};
```

### 9.2 Criar diretório de logs

```bash
sudo mkdir -p /var/log/license-manager
sudo chown licmgr:licmgr /var/log/license-manager
```

### 9.3 Iniciar a aplicação com PM2

```bash
sudo -u licmgr bash -c "cd /opt/license-manager && pm2 start ecosystem.config.cjs"
```

Verificar status:

```bash
sudo -u licmgr pm2 status
sudo -u licmgr pm2 logs license-manager --lines 50
```

### 9.4 Configurar PM2 para iniciar no boot

```bash
# Gerar script de startup (executar como root)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u licmgr --hp /opt/license-manager

# Salvar os processos ativos
sudo -u licmgr pm2 save
```

---

## 10. Configurar Caddy (Reverse Proxy)

### 10.1 Editar o Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

**Com domínio e HTTPS automático (recomendado):**

```caddy
seu-dominio.com.br {
    reverse_proxy localhost:3000
}
```

> Caddy provisiona e renova o certificado TLS automaticamente via Let's Encrypt. Basta o domínio apontar para o IP do servidor e as portas 80 e 443 estarem abertas.

**Sem domínio (acesso por IP, sem HTTPS):**

```caddy
:80 {
    reverse_proxy localhost:3000
}
```

### 10.2 Validar e recarregar Caddy

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

### 10.3 Habilitar Caddy no boot

```bash
sudo systemctl enable caddy
sudo systemctl status caddy
```

---

## 11. Configurar Firewall (UFW)

```bash
sudo apt install -y ufw

# Permitir SSH
sudo ufw allow OpenSSH

# Permitir HTTP e HTTPS (Caddy)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Bloquear porta 3000 externamente (Caddy faz o proxy)
# A porta 3000 não precisa ser aberta — apenas localhost acessa

sudo ufw enable
sudo ufw status
```

> A porta `3000` do Node.js **não deve** ser exposta publicamente. Todo o tráfego externo passa pelo Caddy nas portas 80/443.

---

## 12. Verificação Final

| Verificação | Comando |
|-------------|---------|
| Processo Node em execução | `sudo -u licmgr pm2 status` |
| Logs da aplicação | `sudo -u licmgr pm2 logs license-manager` |
| Status do Caddy | `sudo systemctl status caddy` |
| Conectividade local | `curl -s http://localhost:3000/api/auth/user` |
| Conectividade via Caddy | `curl -s http://localhost/api/auth/user` |

Acesse o sistema no navegador em `https://seu-dominio.com.br` (ou `http://IP_DO_SERVIDOR`).

**Credenciais padrão (primeiro acesso):**
- Usuário: `admin`
- Senha: `admin`

> Altere a senha imediatamente após o primeiro login.

---

## 13. Comandos Úteis de Manutenção

```bash
# Reiniciar a aplicação
sudo -u licmgr pm2 restart license-manager

# Parar a aplicação
sudo -u licmgr pm2 stop license-manager

# Ver logs em tempo real
sudo -u licmgr pm2 logs license-manager

# Monitorar CPU/RAM
sudo -u licmgr pm2 monit

# Recarregar Caddy após editar Caddyfile
sudo systemctl reload caddy

# Atualizar a aplicação (pull + rebuild)
sudo -u licmgr git -C /opt/license-manager pull
sudo -u licmgr bash -c "cd /opt/license-manager && npm install && npm run build"
sudo -u licmgr pm2 restart license-manager
```

---

## 14. Estrutura Pós-Instalação

```
/opt/license-manager/
├── dist/
│   ├── index.cjs          ← servidor compilado (produção)
│   └── public/            ← frontend compilado (servido pelo Express)
├── .env                   ← variáveis de ambiente (chmod 600)
├── ecosystem.config.cjs   ← configuração do PM2
└── ...

/var/log/license-manager/
├── out.log                ← stdout da aplicação
└── error.log              ← stderr da aplicação

/etc/caddy/Caddyfile       ← configuração do reverse proxy
```

---

> **Nota:** Esta documentação assume PostgreSQL remoto já provisionado. O servidor Node.js (Express) serve simultaneamente a API REST e o frontend React estático na porta `3000`. O Caddy atua exclusivamente como reverse proxy com TLS.
