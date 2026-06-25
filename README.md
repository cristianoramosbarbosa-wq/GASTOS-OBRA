# BI Corporate Analytics

Dashboard comercial em React e Vite, alimentado diretamente pela planilha
Google Sheets Gestão LOPES RIO.

## Executar localmente

Requisitos: Node.js 20 ou superior e pnpm.

```bash
pnpm install
pnpm dev
```

Crie um arquivo `.env` com:

```env
VITE_GOOGLE_SHEETS_ID=1RgXASkWpEhLL2cL8CSJZ9Aj7tv8aH9x0r8DrLrXmKi0
```

## Publicar na Vercel

1. Envie este projeto para um repositório privado no GitHub.
2. Acesse https://vercel.com/new e importe o repositório.
3. Confirme o framework `Vite`.
4. Em **Environment Variables**, adicione:
   - Nome: `GOOGLE_SHEETS_ID`
   - Valor: `1RgXASkWpEhLL2cL8CSJZ9Aj7tv8aH9x0r8DrLrXmKi0`
   - Nome: `APP_PASSWORD`
   - Valor: uma senha forte compartilhada com as pessoas autorizadas
   - Nome: `AUTH_SECRET`
   - Valor: um texto aleatório longo, usado para assinar as sessões
5. Clique em **Deploy**.

A configuração de build já está definida em `vercel.json`.

## Atualizações

Mudanças nos dados da planilha aparecem ao recarregar o dashboard. Mudanças no
código são publicadas automaticamente pela Vercel após um novo envio para a
branch principal do GitHub.

## Privacidade

O dashboard exige senha e mantém a sessão em cookie seguro e inacessível ao
JavaScript. A leitura da planilha em produção acontece no servidor, depois da
autenticação.

A planilha original continua acessível a qualquer pessoa que já possua o link
de compartilhamento dela. A autenticação protege o dashboard, mas não altera as
permissões configuradas diretamente no Google Sheets.
