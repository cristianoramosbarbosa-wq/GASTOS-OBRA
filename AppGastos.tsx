import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  HardHat,
  LockKeyhole,
  LogOut,
  Pencil,
  Plus,
  Search,
  Trash2,
  WalletCards,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from './data';

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

interface ExpenseForm {
  purchaseDate: string;
  paymentDate: string;
  category: Category;
  description: string;
  supplier: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  cardName: string;
  installmentMode: InstallmentMode;
  totalInstallments: number;
  phase: string;
}

const categories: Category[] = [
  'Materiais',
  'Mao de obra',
  'Projetos',
  'Acabamentos',
  'Equipamentos',
  'Itens de casa',
  'Documentacao',
  'Imprevistos',
];

const paymentMethods: PaymentMethod[] = ['Credito', 'Debito', 'Dinheiro', 'PIX'];

const categoryColors: Record<Category, string> = {
  Materiais: '#eb194b',
  'Mao de obra': '#2563eb',
  Projetos: '#7c3aed',
  Acabamentos: '#059669',
  Equipamentos: '#ea580c',
  'Itens de casa': '#0f766e',
  Documentacao: '#475569',
  Imprevistos: '#f59e0b',
};

const today = new Date().toISOString().slice(0, 10);

const emptyExpense: ExpenseForm = {
  purchaseDate: today,
  paymentDate: today,
  category: 'Materiais',
  description: '',
  supplier: '',
  totalAmount: 0,
  paymentMethod: 'PIX',
  cardName: '',
  installmentMode: 'A vista',
  totalInstallments: 1,
  phase: '',
};

const storageKey = 'obra-expenses-v2';
const defaultExpenses: Expense[] = [];

const currencyInput = (value: number) =>
  Number.isFinite(value) ? String(value) : '0';

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('pt-BR').format(date);
};

const monthKey = (value: string) => value.slice(0, 7);

const formatMonth = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};

const addMonths = (dateValue: string, months: number) => {
  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  return date.toISOString().slice(0, 10);
};

const splitAmount = (total: number, installments: number, index: number) => {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / installments);
  const remainder = cents - base * installments;
  return (base + (index < remainder ? 1 : 0)) / 100;
};

const getStoredValue = <T,>(key: string, fallback: T): T => {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
};

const loadSharedExpenses = async () => {
  const response = await fetch('/api/expenses', {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Nao foi possivel carregar os dados compartilhados.');

  const payload = (await response.json()) as { expenses?: unknown };
  return normalizeExpenses(payload.expenses ?? []);
};

const saveSharedExpenses = async (expenses: Expense[]) => {
  const response = await fetch('/api/expenses', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expenses }),
  });

  if (!response.ok) throw new Error('Nao foi possivel salvar os dados compartilhados.');
};

const loadSavedExpenses = () => {
  const previousSaved = getStoredValue<unknown>('obra-expenses', null);
  const currentSaved = getStoredValue<unknown>(storageKey, null);
  const currentExpenses = currentSaved ? normalizeExpenses(currentSaved) : [];
  const previousExpenses = previousSaved ? normalizeExpenses(previousSaved) : [];

  if (currentExpenses.length > 0) return currentExpenses;

  if (previousExpenses.length > 0) {
    const migratedExpenses = previousExpenses;
    window.localStorage.setItem(storageKey, JSON.stringify(migratedExpenses));
    return migratedExpenses;
  }

  return defaultExpenses;
};

const normalizeExpenses = (items: unknown): Expense[] => {
  if (!Array.isArray(items)) return defaultExpenses;

  return items
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item, index) => {
      const amount = Number(item.amount ?? item.totalAmount ?? 0);
      const purchaseDate = String(item.purchaseDate ?? item.date ?? today);
      const totalInstallments = Number(item.totalInstallments ?? 1);

      return {
        id: String(item.id ?? `exp-${index}`),
        groupId: String(item.groupId ?? item.id ?? `grp-${index}`),
        purchaseDate,
        paymentDate: String(item.paymentDate ?? purchaseDate),
        category: categories.includes(item.category as Category)
          ? (item.category as Category)
          : 'Materiais',
        description: String(item.description ?? ''),
        supplier: String(item.supplier ?? ''),
        amount,
        totalAmount: Number(item.totalAmount ?? amount),
        paymentMethod: paymentMethods.includes(item.paymentMethod as PaymentMethod)
          ? (item.paymentMethod as PaymentMethod)
          : 'PIX',
        cardName: String(item.cardName ?? ''),
        paid: Boolean(item.paid ?? item.paymentMethod === 'PIX'),
        installmentMode:
          item.installmentMode === 'Parcelado' || totalInstallments > 1
            ? 'Parcelado'
            : 'A vista',
        installmentNumber: Number(item.installmentNumber ?? 1),
        totalInstallments,
        phase: String(item.phase ?? ''),
      };
    });
};

const buildInstallments = (form: ExpenseForm, existingGroupId?: string) => {
  const totalInstallments =
    form.installmentMode === 'Parcelado'
      ? Math.max(2, Math.floor(form.totalInstallments || 2))
      : 1;
  const groupId = existingGroupId ?? crypto.randomUUID();

  return Array.from({ length: totalInstallments }, (_, index) => ({
    id: crypto.randomUUID(),
    groupId,
    purchaseDate: form.purchaseDate,
    paymentDate: addMonths(form.paymentDate, index),
    category: form.category,
    description: form.description.trim(),
    supplier: form.supplier.trim(),
    amount: splitAmount(form.totalAmount, totalInstallments, index),
    totalAmount: form.totalAmount,
    paymentMethod: form.paymentMethod,
    cardName: ['Credito', 'Debito'].includes(form.paymentMethod)
      ? form.cardName.trim()
      : '',
    paid: form.paymentMethod === 'PIX',
    installmentMode: form.installmentMode,
    installmentNumber: index + 1,
    totalInstallments,
    phase: form.phase.trim(),
  }));
};

const isPaid = (expense: Expense) => expense.paymentMethod === 'PIX' || expense.paid;

function AppGastos() {
  const [expenses, setExpenses] = useState<Expense[]>(loadSavedExpenses);
  const [sharedMode, setSharedMode] = useState(false);
  const [syncMessage, setSyncMessage] = useState('Dados salvos neste navegador.');
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [form, setForm] = useState<ExpenseForm>(emptyExpense);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<string | 'Todos'>('Todos');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'Todas'>('Todas');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'Todas'>('Todas');

  const persistExpenses = (nextExpenses: Expense[]) => {
    setExpenses(nextExpenses);
    window.localStorage.setItem(storageKey, JSON.stringify(nextExpenses));
    saveSharedExpenses(nextExpenses)
      .then(() => {
        setSharedMode(true);
        setSyncMessage('Dados compartilhados salvos.');
      })
      .catch(() => {
        setSyncMessage('Sem servidor compartilhado: dados salvos neste navegador.');
      });
  };

  useEffect(() => {
    fetch('/api/session', { cache: 'no-store', credentials: 'include' })
      .then((response) => (response.ok ? response.json() : { authenticated: false }))
      .then((payload) => setAuthenticated(Boolean(payload.authenticated)))
      .catch(() => setAuthenticated(false))
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return undefined;

    let ignore = false;

    const syncFromServer = () =>
      loadSharedExpenses()
      .then((sharedExpenses) => {
        if (ignore) return;

        setSharedMode(true);
        setSyncMessage('Dados compartilhados ativos.');

        if (sharedExpenses.length > 0) {
          setExpenses(sharedExpenses);
          window.localStorage.setItem(storageKey, JSON.stringify(sharedExpenses));
          return;
        }

        const localExpenses = loadSavedExpenses();
        if (localExpenses.length > 0) {
          saveSharedExpenses(localExpenses).catch(() => undefined);
        }
      })
      .catch(() => {
        if (!ignore) {
          setSharedMode(false);
          setSyncMessage('Dados salvos neste navegador.');
        }
      });

    syncFromServer();
    const interval = window.setInterval(syncFromServer, 10000);

    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, [authenticated]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');

    const response = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setAuthError('Senha incorreta ou autenticação não configurada.');
      return;
    }

    setPassword('');
    setAuthenticated(true);
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    setAuthenticated(false);
  };

  const monthOptions = useMemo(
    () =>
      Array.from(new Set(expenses.map((expense) => monthKey(expense.paymentDate))))
        .sort((a, b) => a.localeCompare(b))
        .map((month) => ({
          value: month,
          label: formatMonth(month),
        })),
    [expenses],
  );

  const scopedExpenses = useMemo(
    () =>
      monthFilter === 'Todos'
        ? expenses
        : expenses.filter((expense) => monthKey(expense.paymentDate) === monthFilter),
    [expenses, monthFilter],
  );

  const totals = useMemo(() => {
    const total = scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const paid = scopedExpenses
      .filter(isPaid)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const pending = scopedExpenses
      .filter((expense) => !isPaid(expense))
      .reduce((sum, expense) => sum + expense.amount, 0);
    const overdue = scopedExpenses
      .filter((expense) => !isPaid(expense) && expense.paymentDate < today)
      .reduce((sum, expense) => sum + expense.amount, 0);
    const future = scopedExpenses
      .filter((expense) => !isPaid(expense) && expense.paymentDate > today)
      .reduce((sum, expense) => sum + expense.amount, 0);

    return { total, paid, pending, overdue, future };
  }, [scopedExpenses]);

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return scopedExpenses
      .filter((expense) =>
        categoryFilter === 'Todas' ? true : expense.category === categoryFilter,
      )
      .filter((expense) =>
        methodFilter === 'Todas' ? true : expense.paymentMethod === methodFilter,
      )
      .filter((expense) => {
        if (!normalizedSearch) return true;
        return [
          expense.description,
          expense.supplier,
          expense.phase,
          expense.category,
          expense.paymentMethod,
          expense.cardName,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
  }, [categoryFilter, methodFilter, scopedExpenses, search]);

  const categoryData = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          value: scopedExpenses
            .filter((expense) => expense.category === category)
            .reduce((sum, expense) => sum + expense.amount, 0),
        }))
        .filter((item) => item.value > 0),
    [scopedExpenses],
  );

  const monthData = useMemo(() => {
    const grouped = scopedExpenses.reduce<Record<string, { paid: number; pending: number }>>((acc, expense) => {
      const key = monthKey(expense.paymentDate);
      acc[key] = acc[key] ?? { paid: 0, pending: 0 };
      if (isPaid(expense)) {
        acc[key].paid += expense.amount;
      } else {
        acc[key].pending += expense.amount;
      }
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({
        month,
        label: formatMonth(month),
        paid: value.paid,
        pending: value.pending,
        total: value.paid + value.pending,
      }));
  }, [scopedExpenses]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.description.trim() || !form.supplier.trim() || form.totalAmount <= 0) {
      return;
    }

    const installments = buildInstallments(form, editingGroupId ?? undefined).map((installment) => {
      const previousInstallment = expenses.find(
        (expense) =>
          expense.groupId === editingGroupId &&
          expense.installmentNumber === installment.installmentNumber,
      );

      return previousInstallment
        ? { ...installment, id: previousInstallment.id, paid: previousInstallment.paid }
        : installment;
    });

    if (editingGroupId) {
      persistExpenses([
        ...expenses.filter((expense) => expense.groupId !== editingGroupId),
        ...installments,
      ]);
      setEditingGroupId(null);
    } else {
      persistExpenses([...expenses, ...installments]);
    }

    setForm(emptyExpense);
  };

  const startEdit = (expense: Expense) => {
    setEditingGroupId(expense.groupId);
    setForm({
      purchaseDate: expense.purchaseDate,
      paymentDate: expense.paymentDate,
      category: expense.category,
      description: expense.description,
      supplier: expense.supplier,
      totalAmount: expense.totalAmount,
      paymentMethod: expense.paymentMethod,
      cardName: expense.cardName,
      installmentMode: expense.totalInstallments > 1 ? 'Parcelado' : 'A vista',
      totalInstallments: expense.totalInstallments,
      phase: expense.phase,
    });
  };

  const deleteExpenseGroup = (groupId: string) => {
    persistExpenses(expenses.filter((expense) => expense.groupId !== groupId));
    if (editingGroupId === groupId) {
      setEditingGroupId(null);
      setForm(emptyExpense);
    }
  };

  const toggleExpensePaid = (id: string) => {
    persistExpenses(
      expenses.map((expense) =>
        expense.id === id
          ? { ...expense, paid: !isPaid(expense) }
          : expense,
      ),
    );
  };

  const exportCsv = () => {
    const header = [
      'Data da compra',
      'Data de pagamento',
      'Categoria',
      'Descricao',
      'Fornecedor',
      'Etapa',
      'Forma de pagamento',
      'Cartao',
      'Status',
      'Parcela',
      'Valor da parcela',
      'Valor total',
    ];
    const rows = expenses.map((expense) => [
      expense.purchaseDate,
      expense.paymentDate,
      expense.category,
      expense.description,
      expense.supplier,
      expense.phase,
      expense.paymentMethod,
      expense.cardName,
      isPaid(expense) ? 'Pago' : 'A pagar',
      `${expense.installmentNumber}/${expense.totalInstallments}`,
      String(expense.amount).replace('.', ','),
      String(expense.totalAmount).replace('.', ','),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gastos-da-obra.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm font-bold text-zinc-600 shadow-sm">
          Verificando acesso...
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-lopes-red-soft text-lopes-red">
            <LockKeyhole size={24} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Acesso protegido</h1>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            Digite a senha para abrir o controle de gastos da obra.
          </p>

          <label className="mt-5 grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="geo-input text-sm normal-case"
              autoFocus
            />
          </label>

          {authError && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {authError}
            </p>
          )}

          <button
            type="submit"
            className="mt-5 w-full rounded-md bg-lopes-red px-4 py-3 text-sm font-black text-white transition hover:bg-lopes-red-dark"
          >
            Entrar
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-lopes-red-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-lopes-red">
                <HardHat size={14} />
                Controle de gastos da obra
              </div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                Despesas e parcelas provisionadas
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-zinc-500">
                Inclua uma compra, informe a forma de pagamento e o sistema cria automaticamente as parcelas nos meses seguintes.
              </p>
              <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${sharedMode ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {syncMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-lopes-red"
            >
              <Download size={18} />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-700 transition hover:border-lopes-red hover:text-lopes-red"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="flex flex-col justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-zinc-500">Filtro mensal</h2>
            <p className="mt-1 text-sm font-medium text-zinc-500">
              Escolha um mês para filtrar totais, gráficos e parcelas.
            </p>
          </div>
          <select
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value as string | 'Todos')}
            className="geo-input min-w-48 text-sm"
          >
            <option value="Todos">Todos os meses</option>
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={WalletCards}
            label="Total de gastos"
            value={formatCurrency(totals.total)}
            detail="Soma de todas as parcelas"
          />
          <MetricCard
            icon={CalendarDays}
            label="A pagar"
            value={formatCurrency(totals.pending)}
            detail={monthFilter === 'Todos' ? 'Parcelas em aberto' : `Em aberto em ${formatMonth(monthFilter)}`}
          />
          <MetricCard
            icon={AlertTriangle}
            label="Vencido"
            value={formatCurrency(totals.overdue)}
            detail="Parcelas com data anterior a hoje"
            warning={totals.overdue > 0}
          />
          <MetricCard
            icon={CheckCircle2}
            label="Pago"
            value={formatCurrency(totals.paid)}
            detail="PIX e parcelas marcadas como pagas"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5">
              <h2 className="text-lg font-black text-zinc-950">Pago x a pagar por mes</h2>
              <p className="text-sm font-medium text-zinc-500">Verde mostra o que ja foi pago; vermelho mostra o previsto em aberto.</p>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="paid" stackId="month" name="Pago" fill="#16a34a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" stackId="month" name="A pagar" fill="#eb194b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5">
              <h2 className="text-lg font-black text-zinc-950">Gastos por categoria</h2>
              <p className="text-sm font-medium text-zinc-500">Distribuicao das despesas lancadas.</p>
            </div>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="category" innerRadius={58} outerRadius={105} paddingAngle={3}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.category} fill={categoryColors[entry.category]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5">
              <h2 className="text-lg font-black text-zinc-950">
                {editingGroupId ? 'Editar despesa' : 'Incluir despesa'}
              </h2>
              <p className="text-sm font-medium text-zinc-500">Se for parcelado, as parcelas futuras serao criadas automaticamente.</p>
            </div>

            <div className="grid gap-3">
              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Descricao
                <input
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="geo-input text-sm normal-case"
                  placeholder="Ex.: porcelanato da cozinha"
                />
              </label>

              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Fornecedor
                <input
                  value={form.supplier}
                  onChange={(event) => setForm({ ...form, supplier: event.target.value })}
                  className="geo-input text-sm normal-case"
                  placeholder="Loja, prestador ou profissional"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Data da compra
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(event) => setForm({ ...form, purchaseDate: event.target.value })}
                    className="geo-input text-sm"
                  />
                </label>

                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Primeira data de pagamento
                  <input
                    type="date"
                    value={form.paymentDate}
                    onChange={(event) => setForm({ ...form, paymentDate: event.target.value })}
                    className="geo-input text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Valor total
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currencyInput(form.totalAmount)}
                    onChange={(event) => setForm({ ...form, totalAmount: Number(event.target.value) })}
                    className="geo-input text-sm"
                  />
                </label>

                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Categoria
                  <select
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value as Category })}
                    className="geo-input text-sm"
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Forma de pagamento
                  <select
                    value={form.paymentMethod}
                    onChange={(event) => {
                      const paymentMethod = event.target.value as PaymentMethod;
                      setForm({
                        ...form,
                        paymentMethod,
                        cardName: ['Credito', 'Debito'].includes(paymentMethod)
                          ? form.cardName
                          : '',
                      });
                    }}
                    className="geo-input text-sm"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Parcelamento
                  <select
                    value={form.installmentMode}
                    onChange={(event) => {
                      const installmentMode = event.target.value as InstallmentMode;
                      setForm({
                        ...form,
                        installmentMode,
                        totalInstallments: installmentMode === 'A vista' ? 1 : Math.max(form.totalInstallments, 2),
                      });
                    }}
                    className="geo-input text-sm"
                  >
                    <option>A vista</option>
                    <option>Parcelado</option>
                  </select>
                </label>
              </div>

              {['Credito', 'Debito'].includes(form.paymentMethod) && (
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Qual cartao?
                  <input
                    value={form.cardName}
                    onChange={(event) => setForm({ ...form, cardName: event.target.value })}
                    className="geo-input text-sm normal-case"
                    placeholder="Ex.: Nubank, Itau, Santander final 1234"
                  />
                </label>
              )}

              {form.installmentMode === 'Parcelado' && (
                <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Quantidade de parcelas
                  <input
                    type="number"
                    min="2"
                    max="48"
                    step="1"
                    value={form.totalInstallments}
                    onChange={(event) => setForm({ ...form, totalInstallments: Number(event.target.value) })}
                    className="geo-input text-sm"
                  />
                </label>
              )}

              <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                Etapa da obra
                <input
                  value={form.phase}
                  onChange={(event) => setForm({ ...form, phase: event.target.value })}
                  className="geo-input text-sm normal-case"
                  placeholder="Ex.: fundacao, estrutura, acabamento"
                />
              </label>

              <div className="rounded-md bg-zinc-50 p-3 text-sm font-semibold text-zinc-600">
                {form.installmentMode === 'Parcelado'
                  ? `${form.totalInstallments} parcelas de aproximadamente ${formatCurrency(form.totalAmount / Math.max(form.totalInstallments, 1))}`
                  : `Pagamento previsto em ${formatDate(form.paymentDate)}`}
              </div>

              <button
                type="submit"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-lopes-red px-4 py-3 text-sm font-black text-white transition hover:bg-lopes-red-dark"
              >
                <Plus size={18} />
                {editingGroupId ? 'Salvar despesa' : 'Adicionar despesa'}
              </button>

              {editingGroupId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingGroupId(null);
                    setForm(emptyExpense);
                  }}
                  className="rounded-md border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Cancelar edicao
                </button>
              )}
            </div>
          </form>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-black text-zinc-950">Parcelas provisionadas</h2>
                <p className="text-sm font-medium text-zinc-500">{filteredExpenses.length} parcelas encontradas.</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="geo-input w-full pl-9 text-sm normal-case"
                    placeholder="Buscar"
                  />
                </label>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as Category | 'Todas')}
                  className="geo-input text-sm"
                >
                  <option>Todas</option>
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>

                <select
                  value={methodFilter}
                  onChange={(event) => setMethodFilter(event.target.value as PaymentMethod | 'Todas')}
                  className="geo-input text-sm"
                >
                  <option>Todas</option>
                  {paymentMethods.map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-left text-sm">
                <thead className="border-y border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-3">Pagamento</th>
                    <th className="px-3 py-3">Despesa</th>
                    <th className="px-3 py-3">Categoria</th>
                    <th className="px-3 py-3">Forma</th>
                    <th className="px-3 py-3">Parcela</th>
                    <th className="px-3 py-3 text-right">Valor</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="align-top">
                      <td className="px-3 py-4 font-semibold text-zinc-600">
                        {formatDate(expense.paymentDate)}
                        {isPaid(expense) && (
                          <p className="mt-1 text-xs font-black text-emerald-700">Pago</p>
                        )}
                        {!isPaid(expense) && expense.paymentDate < today && (
                          <p className="mt-1 text-xs font-black text-red-600">Vencido</p>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <p className="font-black text-zinc-950">{expense.description}</p>
                        <p className="mt-1 text-xs font-medium text-zinc-500">
                          {expense.supplier} | compra em {formatDate(expense.purchaseDate)}
                          {expense.phase ? ` | ${expense.phase}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className="rounded-full px-2 py-1 text-xs font-bold text-white"
                          style={{ backgroundColor: categoryColors[expense.category] }}
                        >
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs font-black text-zinc-700">
                          <CreditCard size={13} />
                          {expense.paymentMethod}
                        </span>
                        {expense.cardName && (
                          <p className="mt-1 text-xs font-semibold text-zinc-500">{expense.cardName}</p>
                        )}
                      </td>
                      <td className="px-3 py-4 font-black text-zinc-700">
                        {expense.installmentNumber}/{expense.totalInstallments}
                      </td>
                      <td className="px-3 py-4 text-right font-black">{formatCurrency(expense.amount)}</td>
                      <td className="px-3 py-4">
                        {expense.paymentMethod === 'PIX' ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                            Pago no PIX
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleExpensePaid(expense.id)}
                            className={`rounded-md px-3 py-2 text-xs font-black transition ${
                              isPaid(expense)
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {isPaid(expense) ? 'Pago' : 'Marcar pago'}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(expense)}
                            className="rounded-md border border-zinc-200 p-2 text-zinc-600 transition hover:border-lopes-red hover:text-lopes-red"
                            aria-label="Editar despesa"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteExpenseGroup(expense.groupId)}
                            className="rounded-md border border-zinc-200 p-2 text-zinc-600 transition hover:border-red-500 hover:text-red-600"
                            aria-label="Excluir despesa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  warning = false,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${warning ? 'bg-red-50 text-red-600' : 'bg-lopes-red-soft text-lopes-red'}`}>
          <Icon size={22} />
        </div>
      </div>
      <p className="text-xs font-black uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-zinc-500">{detail}</p>
    </article>
  );
}

export default AppGastos;
