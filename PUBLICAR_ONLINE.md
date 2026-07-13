# Publicar o Controle de Gastos da Obra Online

Para acesso pela internet, publique o projeto na Vercel usando Supabase como
banco de dados compartilhado.

## 1. Criar banco no Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute o conteúdo do arquivo `supabase.sql`.

Isso cria a tabela `obra_expenses`, usada pelo sistema.

## 2. Configurar variáveis na Vercel

Adicione estas variáveis no projeto da Vercel:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_do_supabase
SUPABASE_EXPENSES_TABLE=obra_expenses
```

Use a `service_role key` apenas no ambiente da Vercel. Não coloque essa chave no
front-end.

## 3. Publicar

Depois de configurar as variáveis, publique o projeto na Vercel.

A aplicação usa `/api/expenses` para gravar e ler os dados no Supabase. Assim,
todos que acessarem o link publicado verão a mesma base de despesas.

## Uso local compartilhado

Para uso apenas na rede local:

```bash
pnpm run build
pnpm run shared
```

Nesse modo, os dados ficam no arquivo `data/gastos.json` e a sua máquina precisa
ficar ligada.
