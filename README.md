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
   - Nome: `VITE_GOOGLE_SHEETS_ID`
   - Valor: `1RgXASkWpEhLL2cL8CSJZ9Aj7tv8aH9x0r8DrLrXmKi0`
5. Clique em **Deploy**.

A configuração de build já está definida em `vercel.json`.

## Atualizações

Mudanças nos dados da planilha aparecem ao recarregar o dashboard. Mudanças no
código são publicadas automaticamente pela Vercel após um novo envio para a
branch principal do GitHub.

## Privacidade

A planilha está acessível em modo de leitura por link. Portanto, o dashboard
publicado também expõe esses indicadores a qualquer pessoa que tenha seu
endereço. Para acesso restrito, será necessário adicionar autenticação.
