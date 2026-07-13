import { isValidSession } from '../server/auth.js';

type Category =
  | 'Materiais'
  | 'Mao de obra'
  | 'Projetos'
  | 'Acabamentos'
  | 'Equipamentos'
  | 'Itens de casa'
  | 'Documentacao'
  | 'Imprevistos';

type PaymentMethod = 'Credito' | 'Debito' | 'Dinheiro' | 'PIX';
type InstallmentMode = 'A vista' | 'Parcelado';

interface Expense {
  id: string;
  groupId: string;
  purchaseDate: string;
  paymentDate: string;
  category: Category;
  description: string;
  supplier: string;
  amount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  cardName: string;
  paid: boolean;
  installmentMode: InstallmentMode;
  installmentNumber: number;
  totalInstallments: number;
  phase: string;
}

interface ExpenseRow {
  id: string;
  group_id: string;
  purchase_date: string;
  payment_date: string;
  category: Category;
  description: string;
  supplier: string;
  amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  card_name: string;
  paid: boolean;
  installment_mode: InstallmentMode;
  installment_number: number;
  total_installments: number;
  phase: string;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tableName = process.env.SUPABASE_EXPENSES_TABLE || 'obra_expenses';

const headers = {
  apikey: supabaseServiceKey || '',
  Authorization: `Bearer ${supabaseServiceKey || ''}`,
  'Content-Type': 'application/json',
};

const toExpense = (row: ExpenseRow): Expense => ({
  id: row.id,
  groupId: row.group_id,
  purchaseDate: row.purchase_date,
  paymentDate: row.payment_date,
  category: row.category,
  description: row.description,
  supplier: row.supplier,
  amount: Number(row.amount),
  totalAmount: Number(row.total_amount),
  paymentMethod: row.payment_method,
  cardName: row.card_name || '',
  paid: Boolean(row.paid),
  installmentMode: row.installment_mode,
  installmentNumber: Number(row.installment_number),
  totalInstallments: Number(row.total_installments),
  phase: row.phase || '',
});

const toRow = (expense: Expense): ExpenseRow => ({
  id: expense.id,
  group_id: expense.groupId,
  purchase_date: expense.purchaseDate,
  payment_date: expense.paymentDate,
  category: expense.category,
  description: expense.description,
  supplier: expense.supplier,
  amount: expense.amount,
  total_amount: expense.totalAmount,
  payment_method: expense.paymentMethod,
  card_name: expense.cardName || '',
  paid: Boolean(expense.paid || expense.paymentMethod === 'PIX'),
  installment_mode: expense.installmentMode,
  installment_number: expense.installmentNumber,
  total_installments: expense.totalInstallments,
  phase: expense.phase || '',
});

const json = (response: any, status: number, payload: unknown) => {
  response.setHeader('Cache-Control', 'no-store');
  return response.status(status).json(payload);
};

const assertConfigured = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel.');
  }
};

const supabaseRequest = async (path: string, init?: RequestInit) => {
  assertConfigured();

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'Erro ao acessar o Supabase.');
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export default async function handler(request: any, response: any) {
  try {
    if (!isValidSession(request.headers.cookie)) {
      return json(response, 401, { error: 'Acesso não autorizado.' });
    }

    if (request.method === 'GET') {
      const rows = (await supabaseRequest(
        `${tableName}?select=*&order=payment_date.asc,installment_number.asc`,
      )) as ExpenseRow[];

      return json(response, 200, { expenses: rows.map(toExpense) });
    }

    if (request.method === 'PUT') {
      const expenses = Array.isArray(request.body?.expenses)
        ? (request.body.expenses as Expense[])
        : [];

      await supabaseRequest(`${tableName}?id=not.is.null`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      });

      if (expenses.length > 0) {
        await supabaseRequest(tableName, {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(expenses.map(toRow)),
        });
      }

      return json(response, 200, { ok: true, expenses });
    }

    return json(response, 405, { error: 'Metodo nao permitido.' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erro ao processar despesas.';
    return json(response, 500, { error: message });
  }
}
