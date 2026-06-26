/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Calendar, 
  Filter,
  DollarSign,
  Download,
  Search,
  MousePointerClick,
  PieChart as PieChartIcon,
  LayoutDashboard,
  Target,
  ArrowUpRight,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Trophy,
  Medal,
  LockKeyhole,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import type { PerformanceRecord } from './data';
import { formatCurrency, formatMonthYear } from './data';
import type { SalesEntry } from './googleSheetsPublic';
import { loadDashboardData } from './dataClient';

type TabType = 'geral' | 'metas' | 'visitas' | 'vendas';
type MetaViewType = 'gerente' | 'diretoria';

const TAB_LABELS: Record<TabType, string> = {
  geral: 'Geral',
  metas: 'Metas',
  visitas: 'Presença',
  vendas: 'Vendas',
};

const CARD_STYLES = {
  indigo: {
    accent: 'bg-indigo-500',
    icon: 'bg-indigo-50 text-indigo-600',
  },
  blue: {
    accent: 'bg-blue-500',
    icon: 'bg-blue-50 text-blue-600',
  },
  emerald: {
    accent: 'bg-emerald-500',
    icon: 'bg-emerald-50 text-emerald-600',
  },
  orange: {
    accent: 'bg-orange-500',
    icon: 'bg-orange-50 text-orange-600',
  },
} as const;

const percentage = (value: number, total: number) =>
  total > 0 ? (value / total) * 100 : 0;

interface RankingItem {
  name: string;
  value: number;
  detail?: string;
}

const PODIUM_STYLES = [
  {
    order: 1,
    position: 'md:order-2',
    height: 'h-40',
    color: 'from-amber-300 to-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    order: 2,
    position: 'md:order-1',
    height: 'h-32',
    color: 'from-slate-300 to-slate-500',
    badge: 'bg-slate-100 text-slate-700',
  },
  {
    order: 3,
    position: 'md:order-3',
    height: 'h-24',
    color: 'from-orange-300 to-orange-500',
    badge: 'bg-orange-100 text-orange-700',
  },
] as const;

function RankingSection({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: RankingItem[];
}) {
  const topThree = items.slice(0, 3);
  const remaining = items.slice(3, 10);

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 lg:rounded-[40px] lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h4 className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-gray-900">
            <Trophy size={20} className="text-amber-500" /> {title}
          </h4>
          <p className="mt-1 text-xs font-medium text-gray-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase text-indigo-600">
          Top {Math.min(items.length, 10)}
        </span>
      </div>

      <div className="mb-8 grid grid-cols-1 items-end gap-5 md:grid-cols-3 md:gap-3">
        {topThree.map((item, index) => {
          const style = PODIUM_STYLES[index];
          return (
            <div key={item.name} className={`${style.position} flex flex-col items-center text-center`}>
              <span className={`mb-2 rounded-full px-3 py-1 text-[10px] font-black uppercase ${style.badge}`}>
                {style.order}º lugar
              </span>
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-xl font-black text-indigo-600">
                {item.name.charAt(0)}
              </div>
              <p className="max-w-full truncate text-xs font-black uppercase text-gray-900" title={item.name}>
                {item.name}
              </p>
              {item.detail && (
                <p className="mt-1 max-w-full truncate text-[9px] font-bold uppercase text-gray-400" title={item.detail}>
                  {item.detail}
                </p>
              )}
              <p className="mb-3 mt-2 text-sm font-black text-indigo-600">{formatCurrency(item.value)}</p>
              <div className={`flex w-full items-start justify-center rounded-t-3xl bg-gradient-to-b ${style.color} ${style.height} pt-5 text-white`}>
                <Medal size={26} />
              </div>
            </div>
          );
        })}
      </div>

      {remaining.length > 0 && (
        <div className="divide-y divide-gray-100 rounded-3xl border border-gray-100">
          {remaining.map((item, index) => (
            <div key={item.name} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs font-black text-gray-500">
                {index + 4}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black uppercase text-gray-900">{item.name}</p>
                {item.detail && <p className="truncate text-[9px] font-bold uppercase text-gray-400">{item.detail}</p>}
              </div>
              <span className="text-xs font-black text-gray-900">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Não foi possível entrar.');
      }

      setPassword('');
      onAuthenticated();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : 'Não foi possível entrar.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4">
      <div className="w-full max-w-md overflow-hidden rounded-[36px] border border-gray-100 bg-white shadow-xl shadow-indigo-100/50">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-8 py-10 text-white">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <LockKeyhole size={26} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-200">
            Área restrita
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tighter">
            BI Lopes Rio
          </h1>
          <p className="mt-3 text-sm font-medium text-indigo-100">
            Entre com a senha autorizada para acessar os indicadores comerciais.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-8">
          <div>
            <label
              htmlFor="access-password"
              className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-500"
            >
              Senha de acesso
            </label>
            <input
              id="access-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite a senha"
              required
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <RefreshCw size={17} className="animate-spin" /> : <LockKeyhole size={17} />}
            {isSubmitting ? 'Validando...' : 'Acessar dashboard'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function App() {
  const [authStatus, setAuthStatus] = useState<
    'checking' | 'authenticated' | 'unauthenticated'
  >(import.meta.env.DEV ? 'authenticated' : 'checking');
  const [data, setData] = useState<PerformanceRecord[]>([]);
  const [salesEntries, setSalesEntries] = useState<SalesEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [selectedDirector, setSelectedDirector] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [metaView, setMetaView] = useState<MetaViewType>('gerente');

  useEffect(() => {
    if (import.meta.env.DEV) return;

    fetch('/api/session', { credentials: 'include' })
      .then((response) => response.json())
      .then((payload: { authenticated?: boolean }) =>
        setAuthStatus(payload.authenticated ? 'authenticated' : 'unauthenticated'),
      )
      .catch(() => setAuthStatus('unauthenticated'));
  }, []);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;

    const controller = new AbortController();

    setIsLoading(true);
    setLoadError('');

    loadDashboardData(controller.signal)
      .then(({ records, salesEntries: loadedSales }) => {
        setData(records);
        setSalesEntries(loadedSales);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLoadError(error instanceof Error ? error.message : 'Erro ao carregar a planilha.');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [reloadKey, authStatus]);

  const directors = useMemo(
    () => [...new Set(data.map((item) => item.diretor))].sort(),
    [data],
  );

  const months = useMemo(
    () => [...new Set(data.map((item) => item.mesVigente))].filter(Boolean).sort().reverse(),
    [data],
  );

  // Filtering logic
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchDirector = selectedDirector === 'Todos' || item.diretor === selectedDirector;
      const matchMonth = selectedMonth === 'Todos' || item.mesVigente === selectedMonth;
      const matchSearch = item.gerente.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.diretor.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDirector && matchMonth && matchSearch;
    });
  }, [data, selectedDirector, selectedMonth, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const totalMeta = filteredData.reduce((acc, curr) => acc + curr.metaMensal, 0);
    const totalVendas = filteredData.reduce((acc, curr) => acc + curr.vendasReais, 0);
    const totalVisitas = filteredData.reduce((acc, curr) => acc + curr.visitas, 0);
    const totalAgendamentos = filteredData.reduce((acc, curr) => acc + curr.agendamentos, 0);
    const performance = percentage(totalVendas, totalMeta);

    return { totalMeta, totalVendas, totalVisitas, totalAgendamentos, performance };
  }, [filteredData]);

  // Chart Data: Meta vs Vendas by Director
  const comparisonData = useMemo(() => {
    const aggregation: Record<string, { meta: number; venda: number }> = {};
    filteredData.forEach(item => {
      if (!aggregation[item.diretor]) aggregation[item.diretor] = { meta: 0, venda: 0 };
      aggregation[item.diretor].meta += item.metaMensal;
      aggregation[item.diretor].venda += item.vendasReais;
    });
    return Object.entries(aggregation)
      .map(([name, vals]) => ({ 
        name, 
        meta: Math.round(vals.meta), 
        venda: Math.round(vals.venda) 
      }))
      .sort((a, b) => b.meta - a.meta);
  }, [filteredData]);

  // Chart Data: Visits by month and week
  const weeklyTrendData = useMemo(() => {
    const weeks = new Map<
      string,
      {
        mesVigente: string;
        semana: number;
        label: string;
        visitas: number;
        agendamentos: number;
      }
    >();

    filteredData.forEach(item => {
      const key = `${item.mesVigente}|${item.semana}`;
      const existing =
        weeks.get(key) ?? {
          mesVigente: item.mesVigente,
          semana: item.semana,
          label: `${formatMonthYear(item.mesVigente).slice(0, 3)} S${item.semana}`,
          visitas: 0,
          agendamentos: 0,
        };

      existing.visitas += item.visitas;
      existing.agendamentos += item.agendamentos;
      weeks.set(key, existing);
    });

    return [...weeks.values()].sort(
      (a, b) =>
        a.mesVigente.localeCompare(b.mesVigente) ||
        a.semana - b.semana,
    );
  }, [filteredData]);

  const metasData = useMemo(() => {
    const aggregation = new Map<
      string,
      {
        name: string;
        detail: string;
        meta: number;
        vendas: number;
        periodo: string;
      }
    >();

    filteredData.forEach((item) => {
      const isDirectorView = metaView === 'diretoria';
      const key = isDirectorView ? item.diretor : `${item.gerente}|${item.diretor}`;
      const current =
        aggregation.get(key) ?? {
          name: isDirectorView ? item.diretor : item.gerente,
          detail: isDirectorView ? 'Diretoria' : item.diretor,
          meta: 0,
          vendas: 0,
          periodo:
            selectedMonth === 'Todos'
              ? 'Todos os meses'
              : formatMonthYear(selectedMonth),
        };

      current.meta += item.metaMensal;
      current.vendas += item.vendasReais;
      aggregation.set(key, current);
    });

    return [...aggregation.values()]
      .map((item) => ({
        ...item,
        atingimento: percentage(item.vendas, item.meta),
        saldo: item.vendas - item.meta,
      }))
      .sort(
        (a, b) =>
          b.atingimento - a.atingimento ||
          b.vendas - a.vendas ||
          b.meta - a.meta,
      );
  }, [filteredData, metaView, selectedMonth]);

  const filteredSalesEntries = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return salesEntries.filter((entry) => {
      const matchDirector =
        selectedDirector === 'Todos' || entry.diretor === selectedDirector;
      const matchMonth =
        selectedMonth === 'Todos' || entry.mesVigente === selectedMonth;
      const matchSearch =
        entry.corretor.toLowerCase().includes(search) ||
        entry.gerente.toLowerCase().includes(search) ||
        entry.diretor.toLowerCase().includes(search);
      return matchDirector && matchMonth && matchSearch;
    });
  }, [salesEntries, selectedDirector, selectedMonth, searchTerm]);

  const salesRankings = useMemo(() => {
    const aggregate = (
      nameSelector: (entry: SalesEntry) => string,
      detailSelector?: (entry: SalesEntry) => string,
    ) => {
      const ranking = new Map<string, RankingItem>();
      filteredSalesEntries.forEach((entry) => {
        const name = nameSelector(entry);
        if (!name) return;
        const current = ranking.get(name) ?? {
          name,
          value: 0,
          detail: detailSelector?.(entry),
        };
        current.value += entry.vgv;
        ranking.set(name, current);
      });
      return [...ranking.values()].sort((a, b) => b.value - a.value).slice(0, 10);
    };

    return {
      corretores: aggregate(
        (entry) => entry.corretor,
        (entry) => `${entry.gerente} · ${entry.diretor}`,
      ),
      gerentes: aggregate(
        (entry) => entry.gerente,
        (entry) => entry.diretor,
      ),
      diretorias: aggregate((entry) => entry.diretor),
    };
  }, [filteredSalesEntries]);

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (authStatus === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] text-indigo-600">
        <RefreshCw size={28} className="animate-spin" />
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <LoginScreen onAuthenticated={() => setAuthStatus('authenticated')} />;
  }

  const handleLogout = async () => {
    await fetch('/api/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setData([]);
    setSalesEntries([]);
    setAuthStatus('unauthenticated');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-indigo-100 pb-28 md:pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-16 py-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="shrink-0 bg-indigo-600 p-2 rounded-xl text-white">
                <TrendingUp size={22} />
              </div>
              <h1 className="truncate text-sm font-black tracking-tighter text-gray-900 border-l border-gray-200 pl-3 uppercase sm:text-lg sm:pl-4">
                <span className="sm:hidden">BI <span className="text-indigo-600">Lopes Rio</span></span>
                <span className="hidden sm:inline">BI Corporate <span className="text-indigo-600">Analytics</span></span>
              </h1>
            </div>
            
            <div className="hidden lg:flex items-center gap-2 bg-gray-50 p-1 rounded-full border border-gray-100">
              {(['geral', 'metas', 'visitas', 'vendas'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === tab 
                      ? 'bg-white text-indigo-600 shadow-sm border border-gray-100' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Atingimento</span>
                <span className="text-xs font-black text-emerald-600">{stats.performance.toFixed(1)}%</span>
              </div>
              <button className="hidden sm:block p-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
                <Download size={18} />
              </button>
              {!import.meta.env.DEV && (
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sair"
                  className="p-2 bg-gray-100 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        {isLoading && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm font-bold text-indigo-700">
            <RefreshCw size={18} className="animate-spin" />
            Atualizando dados do Google Sheets...
          </div>
        )}

        {loadError && (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-black">Não foi possível carregar o Google Sheets.</p>
                <p className="mt-1 text-xs font-medium">{loadError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-red-700"
            >
              <RefreshCw size={14} /> Tentar novamente
            </button>
          </div>
        )}

        {/* Filters Panel */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 mb-6 sm:mb-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end"
        >
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Filter size={10} /> Diretoria
            </label>
            <select 
              value={selectedDirector} 
              onChange={(e) => setSelectedDirector(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-medium"
            >
              <option value="Todos">Todas Diretorias</option>
              {directors.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Calendar size={10} /> Mês Referência
            </label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-medium"
            >
              <option value="Todos">Todos os Meses</option>
              {months.map(m => <option key={m} value={m}>{formatMonthYear(m)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Search size={10} /> Buscar Gerente
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Ex: MARCOS PINTO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-100 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
          </div>
        </motion.div>

        {/* Content by Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'geral' && (
            <motion.div 
              key="geral"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[
                  { label: 'Receita Total', value: formatCurrency(stats.totalVendas), growth: '+12%', color: 'indigo', icon: DollarSign },
                  { label: 'Presenças na Sede', value: stats.totalVisitas.toLocaleString(), growth: 'Corretores', color: 'blue', icon: UserCheck },
                  { label: 'Agendadas com Clientes', value: stats.totalAgendamentos.toLocaleString(), growth: 'Gerentes', color: 'emerald', icon: MousePointerClick },
                  { label: 'Performance', value: `${stats.performance.toFixed(1)}%`, growth: 'On Track', color: 'orange', icon: Target },
                ].map((card) => (
                  <div key={card.label} className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-2 h-full ${CARD_STYLES[card.color as keyof typeof CARD_STYLES].accent}`}></div>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2.5 rounded-xl ${CARD_STYLES[card.color as keyof typeof CARD_STYLES].icon}`}>
                        <card.icon size={20} />
                      </div>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{card.growth}</span>
                    </div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{card.label}</h4>
                    <p className="text-2xl font-black text-gray-900">{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Main Visualizations for General Tab */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-8">
                 <div className="lg:col-span-2 bg-white p-4 sm:p-8 rounded-3xl lg:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                    <h3 className="font-black text-gray-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                      <BarChart3 className="text-indigo-600" size={24} /> Tendência de Vendas vs Meta
                    </h3>
                    <div className="overflow-x-auto pb-2">
                      <div className="h-[300px] min-w-[520px] sm:h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData.slice(0, 5)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v) => `R$${v/1000000}M`} />
                          <Tooltip 
                            cursor={{ fill: '#F9FAFB' }}
                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                          <Bar dataKey="meta" name="Meta" fill="#E5E7EB" radius={[8, 8, 0, 0]} barSize={32} />
                          <Bar dataKey="venda" name="Venda" fill="#6366F1" radius={[8, 8, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                      </div>
                    </div>
                 </div>

                 <div className="bg-white p-5 sm:p-8 rounded-3xl lg:rounded-[40px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-6 sm:space-y-8">
                    <h3 className="font-black text-gray-900 uppercase tracking-tighter self-start flex items-center gap-3">
                      <PieChartIcon className="text-indigo-600" size={24} /> Market Share
                    </h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={comparisonData.slice(0, 5)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={8}
                            dataKey="venda"
                          >
                            {comparisonData.slice(0, 5).map((item, i) => <Cell key={item.name} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full space-y-3">
                      {comparisonData.slice(0, 4).map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                             <span className="text-[10px] font-bold text-gray-500 uppercase">{d.name}</span>
                           </div>
                           <span className="text-xs font-black text-gray-900">{percentage(d.venda, stats.totalVendas).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'metas' && (
            <motion.div 
              key="metas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl lg:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-5 sm:p-8 border-b border-gray-100 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-gray-50/30">
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Atingimento de Metas</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase mt-1">
                    Ranking do maior para o menor percentual de atingimento
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex rounded-2xl border border-gray-200 bg-white p-1">
                    {(['gerente', 'diretoria'] as MetaViewType[]).map((view) => (
                      <button
                        key={view}
                        type="button"
                        onClick={() => setMetaView(view)}
                        className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                          metaView === view
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        Por {view === 'gerente' ? 'Gerente' : 'Diretoria'}
                      </button>
                    ))}
                  </div>
                  <div className="bg-white px-4 py-2 rounded-2xl border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Meta Consolidada</span>
                    <span className="text-sm font-black">{formatCurrency(stats.totalMeta)}</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] uppercase font-black text-gray-400 bg-white">
                      <th className="px-8 py-5">Ranking</th>
                      <th className="px-8 py-5">{metaView === 'gerente' ? 'Gerente / Diretoria' : 'Diretoria'}</th>
                      <th className="px-8 py-5">Período</th>
                      <th className="px-8 py-5 text-right">Meta</th>
                      <th className="px-8 py-5 text-right font-black text-indigo-600">Vendas Reais</th>
                      <th className="px-8 py-5 text-right">Saldo</th>
                      <th className="px-8 py-5 text-right">% Atingimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {metasData.map((meta, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                            i < 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                               {metaView === 'gerente' ? <UserCheck size={18} /> : <Target size={18} />}
                            </div>
                            <div>
                               <p className="text-sm font-black text-gray-900">{meta.name}</p>
                               <p className="text-[10px] font-bold text-indigo-400 uppercase">{meta.detail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-gray-500 uppercase">{meta.periodo}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="text-xs font-mono text-gray-400">{formatCurrency(meta.meta)}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className="text-sm font-black text-gray-900">{formatCurrency(meta.vendas)}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <span className={`text-xs font-black ${meta.saldo >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {formatCurrency(meta.saldo)}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-sm font-black text-indigo-600">{meta.atingimento.toFixed(1)}%</span>
                            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full ${meta.atingimento >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                style={{ width: `${Math.min(meta.atingimento, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'visitas' && (
            <motion.div 
              key="visitas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 sm:gap-8">
                <div className="bg-indigo-600 p-5 sm:p-8 rounded-3xl lg:rounded-[40px] text-white space-y-6">
                   <div>
                     <h3 className="text-2xl font-black uppercase tracking-tighter">Presença e Agendadas</h3>
                     <p className="text-xs font-bold opacity-70 uppercase">Atividade semanal da equipe</p>
                   </div>
                   <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold uppercase block opacity-60">Agendadas com possíveis clientes</span>
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-black">{stats.totalAgendamentos}</span>
                          <BarChart3 size={20} />
                        </div>
                      </div>
                      <div className="w-full bg-indigo-500/50 h-1.5 rounded-full">
                        <div
                          className="bg-white h-full rounded-full"
                          style={{ width: `${Math.min(percentage(stats.totalAgendamentos, Math.max(stats.totalVisitas, stats.totalAgendamentos)), 100)}%` }}
                        ></div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase block opacity-60">Corretores presentes na sede</span>
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-black">{stats.totalVisitas}</span>
                          <UserCheck size={20} />
                        </div>
                      </div>
                      <div className="w-full bg-indigo-500/50 h-1.5 rounded-full relative overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${Math.min(percentage(stats.totalVisitas, Math.max(stats.totalVisitas, stats.totalAgendamentos)), 100)}%` }}
                        ></div>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-indigo-500">
                     <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Agendadas por presença</p>
                     <p className="text-3xl font-black">{percentage(stats.totalAgendamentos, stats.totalVisitas).toFixed(1)}%</p>
                   </div>
                </div>

                <div className="lg:col-span-3 bg-white p-4 sm:p-8 rounded-3xl lg:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                  <h3 className="font-black text-gray-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                    <ArrowUpRight className="text-indigo-600" size={24} /> Presença e Agendadas por Mês/Semana
                  </h3>
                  <div className="overflow-x-auto pb-2">
                    <div className="h-[300px] min-w-[640px] sm:h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyTrendData} barGap={6} barCategoryGap="28%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} />
                        <Tooltip />
                        <Bar dataKey="visitas" name="Corretores na sede" fill="#10b981" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="agendamentos" name="Agendadas com clientes" fill="#6366f1" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'vendas' && (
            <motion.div 
              key="vendas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="bg-white p-5 sm:p-8 rounded-3xl lg:rounded-[40px] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                 <div className="flex-1 space-y-4">
                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Performance Comercial</h3>
                    <p className="text-sm text-gray-500 font-medium">
                      Valores acumulados no período, diretoria, gerente e mês selecionados nos filtros.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                       <div className="p-4 bg-gray-50 rounded-3xl">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Vendas Reais</span>
                          <span className="text-lg font-black text-gray-900">{formatCurrency(stats.totalVendas)}</span>
                       </div>
                       <div className="p-4 bg-gray-50 rounded-3xl">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">
                            {stats.totalVendas > stats.totalMeta ? 'Acima da meta' : 'Saldo para a meta'}
                          </span>
                          <span className={`text-lg font-black ${stats.totalVendas > stats.totalMeta ? 'text-emerald-600' : 'text-red-500'}`}>
                            {formatCurrency(Math.abs(stats.totalMeta - stats.totalVendas))}
                          </span>
                       </div>
                    </div>
                 </div>
                 <div className="w-full md:w-64 h-64 relative">
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                       <span className="text-4xl font-black text-indigo-600">{stats.performance.toFixed(1)}%</span>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Meta Realizada</span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                            data={[
                              { name: 'Feito', value: Math.min(stats.performance, 100) },
                              { name: 'Restante', value: Math.max(100 - stats.performance, 0) }
                            ]}
                            innerRadius={70}
                            outerRadius={90}
                            startAngle={90}
                            endAngle={450}
                            dataKey="value"
                          >
                             <Cell fill="#6366F1" />
                             <Cell fill="#F3F4F6" />
                          </Pie>
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="space-y-8">
                <RankingSection
                  title="Top 10 Corretores"
                  subtitle="VGV acumulado por corretor conforme os filtros selecionados."
                  items={salesRankings.corretores}
                />
                <RankingSection
                  title="Top 10 Gerentes"
                  subtitle="VGV acumulado das vendas vinculadas a cada gerente."
                  items={salesRankings.gerentes}
                />
                <RankingSection
                  title="Ranking de Diretorias"
                  subtitle="VGV acumulado de todos os gerentes e corretores da diretoria."
                  items={salesRankings.diretorias}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {(['geral', 'metas', 'visitas', 'vendas'] as TabType[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-1 py-2.5 text-[10px] font-black uppercase tracking-wide transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </nav>

      {/* Floating Bottom Info (Internal Mobile Friendly Footer) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 py-3 px-6 z-40 hidden md:flex items-center justify-between">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
               <span className="text-[10px] font-black text-gray-500 uppercase">Sistema Online</span>
            </div>
            <div className="h-4 w-px bg-gray-200"></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base: {filteredData.length} Registros Processados</span>
         </div>
         <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase">
            <LayoutDashboard size={12} /> BI Intelligence v2.5.1
         </div>
      </div>
    </div>
  );
}
