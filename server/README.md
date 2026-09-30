# Veritas Backend (local)

Receives leads from the website and forwards them via email using SMTP.

Setup

1. Instale dependências

```bash
cd server
npm install
```

2. Copie o arquivo de exemplo e configure as variáveis de ambiente

```bash
cp .env.example .env
# edite .env com suas credenciais SMTP e o destinatário
```

3. Rode em desenvolvimento

```bash
npm run dev
```

O servidor vai expor `POST /api/lead` e aceitará um campo `upload` com um arquivo opcional.
