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
  LogOut,
  Users,
  UserX,
  Building2,
  ChevronLeft,
  ChevronRight
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
import type { BrokerProfileEntry, PlantaoEntry, SalesEntry } from './googleSheetsPublic';
import { loadDashboardData } from './dataClient';

type TabType = 'geral' | 'metas' | 'visitas' | 'vendas' | 'perfil' | 'vendasPerfil' | 'plantoes' | 'produtos';
type MetaViewType = 'gerente' | 'diretoria';

const TAB_LABELS: Record<TabType, string> = {
  geral: 'Geral',
  metas: 'Metas',
  visitas: 'Presença',
  vendas: 'Vendas',
  perfil: 'Perfil',
  vendasPerfil: 'Vendas Perfil',
  plantoes: 'Plantões',
  produtos: 'Produtos',
};

const TAB_ICONS: Record<TabType, typeof LayoutDashboard> = {
  geral: LayoutDashboard,
  metas: Target,
  visitas: Users,
  vendas: BarChart3,
  perfil: UserCheck,
  vendasPerfil: PieChartIcon,
  plantoes: Calendar,
  produtos: Building2,
};

const MAIN_TABS: TabType[] = ['geral', 'metas', 'visitas', 'vendas', 'perfil', 'vendasPerfil', 'plantoes', 'produtos'];

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

const formatSex = (value: string) => {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'M') return 'Masculino';
  if (normalized === 'F') return 'Feminino';
  return normalized || 'Não informado';
};

const parseIsoDate = (value: string) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getMonthBounds = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return null;
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
};

const isBrokerActiveInMonth = (entry: BrokerProfileEntry, monthKey: string) => {
  if (entry.status === 'CANDIDATO INATIVO') return false;

  if (monthKey === 'Todos') {
    return entry.status !== 'DESCREDENCIADO' && !entry.dataDescredenciamento;
  }

  const bounds = getMonthBounds(monthKey);
  const credentialDate = parseIsoDate(entry.dataCredenciamento);
  const exitDate = parseIsoDate(entry.dataDescredenciamento);
  if (!bounds || !credentialDate) return false;

  return credentialDate <= bounds.end && (!exitDate || exitDate >= bounds.start);
};

interface RankingItem {
  name: string;
  value: number;
  detail?: string;
}

interface PlantaoRankingItem {
  name: string;
  detail: string;
  plantoes: number;
  faltas: number;
  corretores: number;
  taxaFalta: number;
}

const PODIUM_STYLES = [
  {
    order: 1,
    position: 'order-2',
    height: 'h-28 sm:h-40',
    color: 'from-amber-300 to-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    order: 2,
    position: 'order-1',
    height: 'h-24 sm:h-32',
    color: 'from-slate-300 to-slate-500',
    badge: 'bg-slate-100 text-slate-700',
  },
  {
    order: 3,
    position: 'order-3',
    height: 'h-20 sm:h-24',
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
      <div className="mb-5 flex items-start justify-between gap-4 sm:mb-8">
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

      <div className="mb-6 grid grid-cols-3 items-end gap-2 sm:mb-8 sm:gap-3">
        {topThree.map((item, index) => {
          const style = PODIUM_STYLES[index];
          return (
            <div key={item.name} className={`${style.position} flex flex-col items-center text-center`}>
              <span className={`mb-2 rounded-full px-2 py-1 text-[8px] font-black uppercase sm:px-3 sm:text-[10px] ${style.badge}`}>
                {style.order}º lugar
              </span>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-base font-black text-indigo-600 sm:mb-3 sm:h-14 sm:w-14 sm:text-xl">
                {item.name.charAt(0)}
              </div>
              <p className="max-w-full truncate text-[9px] font-black uppercase text-gray-900 sm:text-xs" title={item.name}>
                {item.name}
              </p>
              {item.detail && (
                <p className="mt-1 max-w-full truncate text-[9px] font-bold uppercase text-gray-400" title={item.detail}>
                  {item.detail}
                </p>
              )}
              <p className="mb-2 mt-1 text-[10px] font-black text-indigo-600 sm:mb-3 sm:mt-2 sm:text-sm">{formatCurrency(item.value)}</p>
              <div className={`flex w-full items-start justify-center rounded-t-3xl bg-gradient-to-b ${style.color} ${style.height} pt-4 text-white sm:pt-5`}>
                <Medal size={22} />
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

function PlantaoRankingTable({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: PlantaoRankingItem[];
}) {
  return (
    <div className="bg-white rounded-3xl lg:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 sm:p-7 border-b border-gray-100">
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">{subtitle}</p>
      </div>
      <div className="overflow-hidden">
        <table className="plantao-responsive-table w-full table-fixed text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] uppercase font-black text-gray-400 bg-gray-50/60">
              <th className="w-12 px-3 py-4 sm:w-16 sm:px-5">#</th>
              <th className="px-2 py-4 sm:px-5">Nome</th>
              <th className="hidden px-3 py-4 text-right md:table-cell">Corretores</th>
              <th className="px-6 py-4 text-right">Plantões</th>
              <th className="w-16 px-2 py-4 text-right sm:w-20 sm:px-3">Faltas</th>
              <th className="w-20 px-2 py-4 text-right sm:w-24 sm:px-3">% Falta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item, index) => (
              <tr key={item.name} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-3 py-4 sm:px-5">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-xl text-[10px] font-black sm:h-8 sm:w-8 sm:text-xs ${
                    index < 3 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className="min-w-0 px-2 py-4 sm:px-5">
                  <p className="break-words text-[10px] font-black leading-tight text-gray-900 sm:text-xs" title={item.name}>{item.name}</p>
                  <p className="mt-1 break-words text-[8px] font-bold uppercase leading-tight tracking-wider text-gray-400 sm:text-[9px]" title={item.detail}>{item.detail}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-gray-400 sm:hidden">
                    {item.plantoes.toLocaleString()} plantões · {item.corretores} corret.
                  </p>
                </td>
                <td className="hidden px-3 py-4 text-right text-sm font-black text-gray-700 md:table-cell">{item.corretores}</td>
                <td className="hidden px-3 py-4 text-right text-sm font-black text-gray-900 sm:table-cell">{item.plantoes.toLocaleString()}</td>
                <td className="px-2 py-4 text-right text-sm font-black text-red-600 sm:px-3">{item.faltas.toLocaleString()}</td>
                <td className="px-2 py-4 text-right sm:px-3">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black sm:px-3 sm:text-xs ${
                    item.taxaFalta > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {item.taxaFalta.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FaltasRankingTable({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: PlantaoRankingItem[];
}) {
  return (
    <div className="bg-white rounded-3xl lg:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 sm:p-7 border-b border-gray-100">
        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">{title}</h3>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">{subtitle}</p>
      </div>
      <div className="overflow-hidden">
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] uppercase font-black text-gray-400 bg-gray-50/60">
              <th className="px-6 py-4">#</th>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4 text-right">Faltas</th>
              <th className="px-6 py-4 text-right">Corretores</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.length ? (
              items.map((item, index) => (
                <tr key={item.name} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black ${
                      index < 3 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-gray-900">{item.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{item.detail}</p>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-black text-red-600">{item.faltas.toLocaleString()}</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-gray-700">{item.corretores}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                  Nenhuma falta encontrada no filtro atual
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
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
          <div className="mb-6 inline-flex rounded-2xl bg-white px-4 py-3 shadow-sm">
            <img src="/lopes-logo.png" alt="Lopes" className="h-10 w-auto" />
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
  const [plantaoEntries, setPlantaoEntries] = useState<PlantaoEntry[]>([]);
  const [brokerProfileEntries, setBrokerProfileEntries] = useState<BrokerProfileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
      .then(({ records, salesEntries: loadedSales, plantaoEntries: loadedPlantoes = [], brokerProfileEntries: loadedProfiles = [] }) => {
        setData(records);
        setSalesEntries(loadedSales);
        setPlantaoEntries(loadedPlantoes);
        setBrokerProfileEntries(loadedProfiles);
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

  const generalChartLevel = selectedDirector === 'Todos' ? 'Diretorias' : 'Gerentes';

  // Chart Data: Meta vs Vendas by Director or Manager
  const comparisonData = useMemo(() => {
    const aggregation: Record<string, { meta: number; venda: number }> = {};
    filteredData.forEach(item => {
      const name = selectedDirector === 'Todos' ? item.diretor : item.gerente;
      if (!aggregation[name]) aggregation[name] = { meta: 0, venda: 0 };
      aggregation[name].meta += item.metaMensal;
      aggregation[name].venda += item.vendasReais;
    });
    return Object.entries(aggregation)
      .map(([name, vals]) => ({ 
        name, 
        meta: Math.round(vals.meta), 
        venda: Math.round(vals.venda) 
      }))
      .sort((a, b) => b.venda - a.venda);
  }, [filteredData, selectedDirector]);

  const marketShareData = useMemo(
    () =>
      [...comparisonData]
        .filter((item) => item.venda > 0)
        .sort((a, b) => b.venda - a.venda)
        .slice(0, 5),
    [comparisonData],
  );

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

    filteredData
      .filter((item) => item.possuiRelatorioPresenca)
      .forEach(item => {
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
        entry.diretor.toLowerCase().includes(search) ||
        entry.incorporador.toLowerCase().includes(search) ||
        entry.empreendimento.toLowerCase().includes(search);
      return matchDirector && matchMonth && matchSearch;
    });
  }, [salesEntries, selectedDirector, selectedMonth, searchTerm]);

  const salesRankings = useMemo(() => {
    const aggregate = (
      nameSelector: (entry: SalesEntry) => string,
      detailSelector?: (entry: SalesEntry) => string,
      includeEntry: (entry: SalesEntry) => boolean = () => true,
    ) => {
      const ranking = new Map<string, RankingItem>();
      filteredSalesEntries.forEach((entry) => {
        if (!includeEntry(entry)) return;
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
        (entry) => entry.corretor !== entry.gerente,
      ),
      gerentes: aggregate(
        (entry) => entry.gerente,
        (entry) => entry.diretor,
        (entry) => entry.gerente !== entry.diretor,
      ),
      diretorias: aggregate((entry) => entry.diretor),
      incorporadores: aggregate(
        (entry) => entry.incorporador,
        () => 'Incorporador',
      ),
      empreendimentos: aggregate(
        (entry) => entry.empreendimento,
        (entry) => entry.incorporador || 'Empreendimento',
      ),
    };
  }, [filteredSalesEntries]);

  const filteredPlantaoEntries = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return plantaoEntries.filter((entry) => {
      const matchDirector =
        selectedDirector === 'Todos' || entry.diretor === selectedDirector;
      const matchMonth =
        selectedMonth === 'Todos' || entry.mesVigente === selectedMonth;
      const matchSearch =
        entry.corretor.toLowerCase().includes(search) ||
        entry.gerente.toLowerCase().includes(search) ||
        entry.diretor.toLowerCase().includes(search) ||
        entry.incorporador.toLowerCase().includes(search) ||
        entry.empreendimento.toLowerCase().includes(search) ||
        entry.turno.toLowerCase().includes(search);
      return matchDirector && matchMonth && matchSearch;
    });
  }, [plantaoEntries, selectedDirector, selectedMonth, searchTerm]);

  const plantaoStats = useMemo(() => {
    const totalPlantoes = filteredPlantaoEntries.reduce((acc, curr) => acc + curr.plantoes, 0);
    const totalFaltas = filteredPlantaoEntries.reduce((acc, curr) => acc + curr.faltas, 0);
    const corretores = new Set(filteredPlantaoEntries.map((entry) => entry.corretor).filter(Boolean));
    const gerentesComFaltas = new Set(
      filteredPlantaoEntries
        .filter((entry) => entry.faltas > 0)
        .map((entry) => entry.gerente),
    );
    const incorporadoresComFaltas = new Set(
      filteredPlantaoEntries
        .filter((entry) => entry.faltas > 0 && entry.incorporador)
        .map((entry) => entry.incorporador),
    );
    const produtosComFaltas = new Set(
      filteredPlantaoEntries
        .filter((entry) => entry.faltas > 0 && entry.empreendimento)
        .map((entry) => entry.empreendimento),
    );
    const taxaFalta = percentage(totalFaltas, totalPlantoes);

    return {
      totalPlantoes,
      totalFaltas,
      taxaFalta,
      corretores: corretores.size,
      gerentesComFaltas: gerentesComFaltas.size,
      incorporadoresComFaltas: incorporadoresComFaltas.size,
      produtosComFaltas: produtosComFaltas.size,
    };
  }, [filteredPlantaoEntries]);

  const plantaoRankings = useMemo(() => {
    const aggregate = (
      keySelector: (entry: PlantaoEntry) => string,
      detailSelector: (entry: PlantaoEntry) => string,
    ) => {
      const ranking = new Map<
        string,
        {
          name: string;
          detail: string;
          plantoes: number;
          faltas: number;
          corretores: Set<string>;
        }
      >();

      filteredPlantaoEntries.forEach((entry) => {
        const name = keySelector(entry);
        if (!name) return;
        const current =
          ranking.get(name) ?? {
            name,
            detail: detailSelector(entry),
            plantoes: 0,
            faltas: 0,
            corretores: new Set<string>(),
          };

        current.plantoes += entry.plantoes;
        current.faltas += entry.faltas;
        if (entry.corretor) current.corretores.add(entry.corretor);
        ranking.set(name, current);
      });

      return [...ranking.values()]
        .map((item): PlantaoRankingItem => ({
          name: item.name,
          detail: item.detail,
          plantoes: item.plantoes,
          faltas: item.faltas,
          corretores: item.corretores.size,
          taxaFalta: percentage(item.faltas, item.plantoes),
        }))
        .sort((a, b) => b.faltas - a.faltas || b.taxaFalta - a.taxaFalta || b.plantoes - a.plantoes);
    };

    return {
      gerentes: aggregate(
        (entry) => entry.gerente,
        (entry) => entry.diretor,
      ),
      diretorias: aggregate(
        (entry) => entry.diretor,
        () => 'Diretoria',
      ),
      corretores: aggregate(
        (entry) => entry.corretor,
        (entry) => `${entry.gerente} · ${entry.diretor}`,
      ),
      turnos: aggregate(
        (entry) => entry.turno,
        () => 'Turno',
      ),
      incorporadores: aggregate(
        (entry) => entry.incorporador,
        () => 'Incorporador',
      ),
      empreendimentos: aggregate(
        (entry) => entry.empreendimento,
        (entry) => entry.incorporador || 'Produto / Stand',
      ),
    };
  }, [filteredPlantaoEntries]);

  const plantaoDiretoriaChart = useMemo(
    () =>
      plantaoRankings.diretorias
        .filter((item) => item.plantoes > 0 || item.faltas > 0)
        .map((item) => ({
          name: item.name,
          plantoes: item.plantoes,
          faltas: item.faltas,
          taxa: item.taxaFalta,
        })),
    [plantaoRankings.diretorias],
  );

  const plantaoInsights = useMemo(() => {
    const critical = (items: PlantaoRankingItem[]) => items.find((item) => item.faltas > 0);
    const comparecimento = Math.max(0, 100 - plantaoStats.taxaFalta);

    return {
      comparecimento,
      turnoCritico: critical(plantaoRankings.turnos),
      produtoCritico: critical(plantaoRankings.empreendimentos),
      incorporadorCritico: critical(plantaoRankings.incorporadores),
      gerenteCritico: critical(plantaoRankings.gerentes),
    };
  }, [plantaoRankings, plantaoStats.taxaFalta]);

  const filteredBrokerProfiles = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return brokerProfileEntries.filter((entry) => {
      if (!isBrokerActiveInMonth(entry, selectedMonth)) return false;
      const matchDirector =
        selectedDirector === 'Todos' || entry.diretor === selectedDirector;
      const matchSearch =
        entry.corretor.toLowerCase().includes(search) ||
        entry.nome.toLowerCase().includes(search) ||
        entry.gerente.toLowerCase().includes(search) ||
        entry.diretor.toLowerCase().includes(search) ||
        entry.creciStatus.toLowerCase().includes(search) ||
        entry.creciTipo.toLowerCase().includes(search) ||
        entry.estadoCivil.toLowerCase().includes(search) ||
        entry.escolaridade.toLowerCase().includes(search);
      return matchDirector && matchSearch;
    });
  }, [brokerProfileEntries, selectedDirector, selectedMonth, searchTerm]);

  const brokerProfileStats = useMemo(() => {
    const calculateAge = (dateValue: string) => {
      if (!dateValue) return null;
      const birthDate = new Date(`${dateValue}T00:00:00`);
      if (Number.isNaN(birthDate.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
      return age >= 0 && age < 100 ? age : null;
    };

    const ageRange = (age: number | null) => {
      if (age === null) return 'Sem nascimento';
      if (age <= 25) return 'Até 25';
      if (age <= 35) return '26 a 35';
      if (age <= 45) return '36 a 45';
      if (age <= 55) return '46 a 55';
      return '56+';
    };

    const countBy = (selector: (entry: BrokerProfileEntry) => string) => {
      const map = new Map<string, number>();
      filteredBrokerProfiles.forEach((entry) => {
        const name = selector(entry) || 'Não informado';
        map.set(name, (map.get(name) ?? 0) + 1);
      });
      return [...map.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    };

    const monthFromDate = (dateValue: string) => dateValue.slice(0, 7);
    const turnoverBase = brokerProfileEntries.filter((entry) => {
      const search = searchTerm.toLowerCase();
      const matchDirector =
        selectedDirector === 'Todos' || entry.diretor === selectedDirector;
      const matchSearch =
        entry.corretor.toLowerCase().includes(search) ||
        entry.nome.toLowerCase().includes(search) ||
        entry.gerente.toLowerCase().includes(search) ||
        entry.diretor.toLowerCase().includes(search);
      return matchDirector && matchSearch;
    });
    const turnoverMonths = new Set<string>();
    turnoverBase.forEach((entry) => {
      if (entry.dataCredenciamento) turnoverMonths.add(monthFromDate(entry.dataCredenciamento));
      if (entry.dataDescredenciamento) turnoverMonths.add(monthFromDate(entry.dataDescredenciamento));
    });
    const selectedTurnoverMonths =
      selectedMonth === 'Todos'
        ? [...turnoverMonths].sort()
        : [selectedMonth];
    const turnoverData = selectedTurnoverMonths
      .map((month) => {
        const contratados = turnoverBase.filter(
          (entry) => monthFromDate(entry.dataCredenciamento) === month,
        ).length;
        const sairam = turnoverBase.filter(
          (entry) => monthFromDate(entry.dataDescredenciamento) === month,
        ).length;
        return {
          month,
          mes: formatMonthYear(month).slice(0, 3),
          contratados,
          sairam,
          saldo: contratados - sairam,
        };
      })
      .filter((item) => item.contratados || item.sairam)
      .slice(selectedMonth === 'Todos' ? -12 : 0);

    const ages = filteredBrokerProfiles
      .map((entry) => calculateAge(entry.dataNascimento))
      .filter((age): age is number => age !== null);
    const ageRanges = new Map<string, number>();
    filteredBrokerProfiles.forEach((entry) => {
      const range = ageRange(calculateAge(entry.dataNascimento));
      ageRanges.set(range, (ageRanges.get(range) ?? 0) + 1);
    });

    const creciStatus = countBy((entry) => entry.creciStatus);
    const regularCreci = creciStatus.find((item) => item.name === 'REGULAR')?.value ?? 0;

    return {
      total: filteredBrokerProfiles.length,
      idadeMedia: ages.length ? ages.reduce((acc, age) => acc + age, 0) / ages.length : 0,
      faixaPredominante:
        [...ageRanges.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Não informado',
      sexo: countBy((entry) => formatSex(entry.sexo)),
      creciRegularPct: percentage(regularCreci, filteredBrokerProfiles.length),
      creciStatus,
      creciTipo: countBy((entry) => entry.creciTipo),
      estadoCivil: countBy((entry) => entry.estadoCivil),
      escolaridade: countBy((entry) => entry.escolaridade),
      diretorias: countBy((entry) => entry.diretor).slice(0, 10),
      gerentes: countBy((entry) => entry.gerente).slice(0, 10),
      turnoverData,
      contratadosMes: turnoverData.reduce((acc, item) => acc + item.contratados, 0),
      sairamMes: turnoverData.reduce((acc, item) => acc + item.sairam, 0),
      faixasEtarias: ['Até 25', '26 a 35', '36 a 45', '46 a 55', '56+', 'Sem nascimento'].map((name) => ({
        name,
        value: ageRanges.get(name) ?? 0,
      })),
    };
  }, [brokerProfileEntries, filteredBrokerProfiles, selectedDirector, selectedMonth, searchTerm]);

  const salesByProfileStats = useMemo(() => {
    const profileByBroker = new Map(
      brokerProfileEntries.map((entry) => [entry.corretor, entry]),
    );
    const search = searchTerm.toLowerCase();
    const eligibleSales = salesEntries
      .map((sale) => ({
        sale,
        profile: profileByBroker.get(sale.corretor),
        semCorretor: sale.corretor === sale.gerente || sale.corretor === sale.diretor,
      }))
      .filter(({ sale, profile, semCorretor }) => {
        if (!profile && !semCorretor) return false;
        const matchDirector =
          selectedDirector === 'Todos' || sale.diretor === selectedDirector;
        const matchMonth =
          selectedMonth === 'Todos' || sale.mesVigente === selectedMonth;
        const matchSearch =
          sale.corretor.toLowerCase().includes(search) ||
          (profile?.nome.toLowerCase().includes(search) ?? false) ||
          sale.gerente.toLowerCase().includes(search) ||
          sale.diretor.toLowerCase().includes(search) ||
          sale.empreendimento.toLowerCase().includes(search) ||
          sale.incorporador.toLowerCase().includes(search) ||
          (profile?.creciStatus.toLowerCase().includes(search) ?? false) ||
          (profile?.creciTipo.toLowerCase().includes(search) ?? false) ||
          (profile?.estadoCivil.toLowerCase().includes(search) ?? false) ||
          (profile?.escolaridade.toLowerCase().includes(search) ?? false) ||
          (profile?.sexo.toLowerCase().includes(search) ?? false) ||
          (semCorretor && 'venda sem corretor'.includes(search));
        return matchDirector && matchMonth && matchSearch;
      });

    const calculateAge = (dateValue: string) => {
      if (!dateValue) return null;
      const birthDate = new Date(`${dateValue}T00:00:00`);
      if (Number.isNaN(birthDate.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
      return age >= 0 && age < 100 ? age : null;
    };

    const ageRange = (age: number | null) => {
      if (age === null) return 'Sem nascimento';
      if (age <= 25) return 'Até 25';
      if (age <= 35) return '26 a 35';
      if (age <= 45) return '36 a 45';
      if (age <= 55) return '46 a 55';
      return '56+';
    };

    const aggregate = (
      selector: (item: { sale: SalesEntry; profile?: BrokerProfileEntry; semCorretor: boolean }) => string,
      detailSelector?: (item: { sale: SalesEntry; profile?: BrokerProfileEntry; semCorretor: boolean }) => string,
    ) => {
      const ranking = new Map<string, RankingItem & { count: number }>();
      eligibleSales.forEach(({ sale, profile, semCorretor }) => {
        const name = selector({ sale, profile, semCorretor }) || 'Não informado';
        const current = ranking.get(name) ?? {
          name,
          value: 0,
          detail: detailSelector?.({ sale, profile, semCorretor }),
          count: 0,
        };
        current.value += sale.vgv;
        current.count += 1;
        ranking.set(name, current);
      });
      return [...ranking.values()]
        .sort((a, b) => b.value - a.value || b.count - a.count)
        .slice(0, 10);
    };

    const totalVgv = eligibleSales.reduce((acc, item) => acc + item.sale.vgv, 0);
    const vendasSemCorretor = eligibleSales.filter((item) => item.semCorretor).length;

    return {
      totalVgv,
      totalVendas: eligibleSales.length,
      corretoresComVenda: new Set(eligibleSales.filter((item) => !item.semCorretor).map((item) => item.sale.corretor)).size,
      vendasSemCorretor,
      ticketMedio: eligibleSales.length ? totalVgv / eligibleSales.length : 0,
      porSexo: aggregate(({ profile, semCorretor }) => (semCorretor ? 'Venda sem corretor' : formatSex(profile?.sexo ?? ''))),
      porFaixaEtaria: aggregate(({ profile, semCorretor }) => (semCorretor ? 'Venda sem corretor' : ageRange(calculateAge(profile?.dataNascimento ?? '')))),
      porCreciStatus: aggregate(({ profile, semCorretor }) => (semCorretor ? 'Venda sem corretor' : profile?.creciStatus ?? 'Não informado')),
      porCreciTipo: aggregate(({ profile, semCorretor }) => (semCorretor ? 'Venda sem corretor' : profile?.creciTipo ?? 'Não informado')),
      porEstadoCivil: aggregate(({ profile, semCorretor }) => (semCorretor ? 'Venda sem corretor' : profile?.estadoCivil ?? 'Não informado')),
      porEscolaridade: aggregate(({ profile, semCorretor }) => (semCorretor ? 'Venda sem corretor' : profile?.escolaridade ?? 'Não informado')),
      porDiretoria: aggregate(({ sale }) => sale.diretor),
      porGerente: aggregate(({ sale }) => sale.gerente, ({ sale }) => sale.diretor),
    };
  }, [brokerProfileEntries, salesEntries, selectedDirector, selectedMonth, searchTerm]);

  const COLORS = ['#eb194b', '#000000', '#ff9169', '#46dcaa', '#91beff', '#ffbe55', '#55e1e6'];

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
    setPlantaoEntries([]);
    setBrokerProfileEntries([]);
    setAuthStatus('unauthenticated');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-indigo-100 pb-28 md:pb-20">
      <aside
        className={`fixed left-0 top-0 z-50 hidden h-screen flex-col bg-red-700 text-white shadow-2xl shadow-red-900/20 transition-all duration-300 lg:flex ${
          isSidebarCollapsed ? 'w-20' : 'w-44'
        }`}
      >
        <div className="flex h-20 items-center justify-center border-b border-white/10 px-3">
          <div className="rounded-2xl bg-white px-3 py-2">
            <img src="/lopes-logo.png" alt="Lopes" className={isSidebarCollapsed ? 'h-7 w-auto max-w-10 object-contain' : 'h-8 w-auto max-w-28 object-contain'} />
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-2 px-3 py-5">
          {MAIN_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab];
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                title={TAB_LABELS[tab]}
                className={`group flex items-center rounded-2xl px-3 py-3 text-left transition-all ${
                  isSidebarCollapsed ? 'justify-center' : 'gap-3'
                } ${
                  activeTab === tab
                    ? 'bg-white text-red-700 shadow-lg shadow-red-950/20'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={22} className="shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="text-xs font-black uppercase tracking-tight">{TAB_LABELS[tab]}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((value) => !value)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white/20"
            title={isSidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!isSidebarCollapsed && 'Recolher'}
          </button>
        </div>
      </aside>

      {/* Top Header */}
      <header className={`sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm transition-all duration-300 ${
        isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-44'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-16 py-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="shrink-0 rounded-xl bg-white px-2.5 py-2 ring-1 ring-gray-100">
                <img src="/lopes-logo.png" alt="Lopes" className="h-7 w-auto" />
              </div>
              <h1 className="truncate text-sm font-black tracking-tighter text-gray-900 border-l border-gray-200 pl-3 uppercase sm:text-lg sm:pl-4">
                <span className="sm:hidden">BI <span className="text-indigo-600">Lopes Rio</span></span>
                <span className="hidden sm:inline">BI <span className="text-indigo-600">Lopes Rio</span></span>
              </h1>
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

      <main className={`max-w-7xl px-3 py-5 transition-all duration-300 sm:px-6 sm:py-8 lg:px-8 ${
        isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-44'
      } lg:mr-auto`}>
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
                  { label: 'VGV Intermediado', value: formatCurrency(stats.totalVendas), growth: '+12%', color: 'indigo', icon: DollarSign },
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
                      <BarChart3 className="text-indigo-600" size={24} /> VGV Realizado vs Meta por {generalChartLevel}
                    </h3>
                    <div className="overflow-x-auto pb-2">
                      <div className="grid h-[320px] min-w-[620px] grid-cols-5 items-end gap-4 sm:h-[400px] sm:gap-6">
                        {comparisonData.slice(0, 5).map((item) => {
                          const attainment = percentage(item.venda, item.meta);
                          const fillHeight = Math.min(attainment, 100);
                          return (
                            <div key={item.name} className="flex h-full flex-col items-center justify-end gap-3">
                              <div
                                className="group relative flex h-full w-full max-w-[86px] items-end overflow-hidden rounded-[28px] border-2 border-gray-200 bg-gray-50 shadow-inner"
                                title={`${item.name} | Meta: ${formatCurrency(item.meta)} | VGV: ${formatCurrency(item.venda)} | Atingimento: ${attainment.toFixed(1)}%`}
                              >
                                <div
                                  className="absolute bottom-0 left-0 right-0 rounded-t-[24px] bg-gradient-to-t from-red-700 to-red-500 transition-all duration-700"
                                  style={{ height: `${fillHeight}%` }}
                                />
                                <div className="absolute inset-x-2 top-2 rounded-full border border-white/70 bg-white/70 px-2 py-1 text-center text-[10px] font-black text-gray-900 shadow-sm">
                                  {attainment.toFixed(0)}%
                                </div>
                                {attainment > 100 && (
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white shadow-sm">
                                    +{(attainment - 100).toFixed(0)}%
                                  </div>
                                )}
                              </div>
                              <div className="text-center">
                                <p className="max-w-[110px] truncate text-[10px] font-black uppercase text-gray-700">{item.name}</p>
                                <p className="mt-1 text-[10px] font-bold text-gray-400">{formatCurrency(item.venda)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                 </div>

                 <div className="bg-white p-5 sm:p-8 rounded-3xl lg:rounded-[40px] shadow-sm border border-gray-100 flex flex-col items-center justify-center space-y-6 sm:space-y-8">
                    <h3 className="font-black text-gray-900 uppercase tracking-tighter self-start flex items-center gap-3">
                      <PieChartIcon className="text-indigo-600" size={24} /> Market Share por {generalChartLevel}
                    </h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={marketShareData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={8}
                            dataKey="venda"
                          >
                            {marketShareData.map((item, i) => <Cell key={item.name} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: '18px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                            formatter={(value) => formatCurrency(Number(value))}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full space-y-3">
                      {marketShareData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                             <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                               {i + 1}
                             </span>
                             <span className="text-[10px] font-bold text-gray-500 uppercase">{d.name}</span>
                           </div>
                           <span className="text-xs font-black text-gray-900">{percentage(d.venda, stats.totalVendas).toFixed(1)}%</span>
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
                  <div className="bg-indigo-600 px-4 py-2 rounded-2xl border border-indigo-600 text-white">
                    <span className="text-[10px] font-bold text-indigo-100 block uppercase">Atingimento</span>
                    <span className="text-sm font-black">{stats.performance.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] uppercase font-black text-gray-400 bg-white">
                      <th className="px-8 py-5">Ranking</th>
                      <th className="px-8 py-5">{metaView === 'gerente' ? 'Gerente / Diretoria' : 'Diretoria'}</th>
                      <th className="px-8 py-5 text-right">% Atingimento</th>
                      <th className="px-8 py-5">Período</th>
                      <th className="px-8 py-5 text-right">Meta</th>
                      <th className="px-8 py-5 text-right font-black text-indigo-600">Vendas Reais</th>
                      <th className="px-8 py-5 text-right">Saldo</th>
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

          {activeTab === 'perfil' && (
            <motion.div
              key="perfil"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8 lg:rounded-[40px]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">Perfil cadastral</p>
                  <h3 className="mt-2 text-2xl font-black uppercase tracking-tighter text-gray-900">
                    Perfil dos Corretores Credenciados
                  </h3>
                  <p className="mt-2 max-w-4xl text-sm font-medium text-gray-500">
                    Considera somente registros com cargo Corretor. O total usa Credenciamento e Descredenciamento para contar quem estava ativo no mês filtrado.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                {[
                  { label: 'Corretores ativos', value: brokerProfileStats.total.toLocaleString(), icon: Users, color: 'indigo' },
                  { label: 'Sexo predominante', value: brokerProfileStats.sexo[0]?.name ?? 'N/D', icon: UserCheck, color: 'blue' },
                  { label: 'Idade média', value: brokerProfileStats.idadeMedia ? `${brokerProfileStats.idadeMedia.toFixed(1)} anos` : 'N/D', icon: Calendar, color: 'emerald' },
                  { label: 'Faixa predominante', value: brokerProfileStats.faixaPredominante, icon: Target, color: 'orange' },
                  { label: 'Contratados', value: brokerProfileStats.contratadosMes.toLocaleString(), icon: UserCheck, color: 'emerald' },
                  { label: 'Saíram', value: brokerProfileStats.sairamMes.toLocaleString(), icon: UserX, color: 'orange' },
                  { label: 'CRECI regular', value: `${brokerProfileStats.creciRegularPct.toFixed(1)}%`, icon: Trophy, color: 'emerald' },
                ].map((card) => {
                  const Icon = card.icon;
                  const style = CARD_STYLES[card.color as keyof typeof CARD_STYLES];
                  return (
                    <div key={card.label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{card.label}</p>
                          <p className="mt-2 text-xl font-black text-gray-900">{card.value}</p>
                        </div>
                        <div className={`rounded-2xl p-3 ${style.icon}`}>
                          <Icon size={22} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8 lg:rounded-[40px]">
                  <h3 className="mb-8 flex items-center gap-3 font-black uppercase tracking-tighter text-gray-900">
                    <BarChart3 className="text-indigo-600" size={24} /> Faixa etária
                  </h3>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={brokerProfileStats.faixasEtarias} barCategoryGap="28%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#9CA3AF' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" name="Corretores" fill="#eb194b" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8 lg:rounded-[40px]">
                  <h3 className="mb-8 flex items-center gap-3 font-black uppercase tracking-tighter text-gray-900">
                    <PieChartIcon className="text-indigo-600" size={24} /> Status CRECI
                  </h3>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={brokerProfileStats.creciStatus} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={6}>
                            {brokerProfileStats.creciStatus.map((item, index) => (
                              <Cell key={item.name} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {brokerProfileStats.creciStatus.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                            <span className="text-xs font-black uppercase text-gray-700">{item.name}</span>
                          </div>
                          <span className="text-sm font-black text-gray-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8 lg:rounded-[40px]">
                <h3 className="mb-8 flex items-center gap-3 font-black uppercase tracking-tighter text-gray-900">
                  <ArrowUpRight className="text-indigo-600" size={24} /> Turnover de Corretores
                </h3>
                <div className="overflow-x-auto pb-2">
                  <div className="h-[320px] min-w-[680px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={brokerProfileStats.turnoverData} barGap={8} barCategoryGap="26%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#9CA3AF' }} />
                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                        <Tooltip />
                        <Bar dataKey="contratados" name="Contratados" fill="#46dcaa" radius={[10, 10, 0, 0]} />
                        <Bar dataKey="sairam" name="Saíram" fill="#eb194b" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {[
                  { title: 'Sexo', items: brokerProfileStats.sexo },
                  { title: 'Tipo de CRECI', items: brokerProfileStats.creciTipo },
                  { title: 'Estado Civil', items: brokerProfileStats.estadoCivil },
                  { title: 'Escolaridade', items: brokerProfileStats.escolaridade },
                  { title: 'Diretorias', items: brokerProfileStats.diretorias },
                  { title: 'Gerentes', items: brokerProfileStats.gerentes },
                ].map((section) => (
                  <div key={section.title} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 lg:rounded-[40px]">
                    <h3 className="mb-5 font-black uppercase tracking-tighter text-gray-900">{section.title}</h3>
                    <div className="space-y-3">
                      {section.items.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-50 text-xs font-black text-red-600">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-black uppercase text-gray-900">{item.name}</p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(percentage(item.value, brokerProfileStats.total), 100)}%` }}></div>
                            </div>
                          </div>
                          <span className="text-sm font-black text-gray-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {!filteredBrokerProfiles.length && (
                <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
                  <p className="text-sm font-bold text-gray-500">
                    Nenhum corretor credenciado encontrado para os filtros selecionados.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'plantoes' && (
            <motion.div
              key="plantoes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  {
                    label: 'Total de Plantões',
                    value: plantaoStats.totalPlantoes.toLocaleString(),
                    icon: Calendar,
                    color: 'indigo',
                  },
                  {
                    label: 'Total de Faltas',
                    value: plantaoStats.totalFaltas.toLocaleString(),
                    icon: UserX,
                    color: 'orange',
                  },
                  {
                    label: 'Taxa de Falta',
                    value: `${plantaoStats.taxaFalta.toFixed(1)}%`,
                    icon: Target,
                    color: 'emerald',
                  },
                  {
                    label: 'Corretores Escalados',
                    value: plantaoStats.corretores.toLocaleString(),
                    icon: Users,
                    color: 'blue',
                  },
                  {
                    label: 'Gerentes com Faltas',
                    value: plantaoStats.gerentesComFaltas.toLocaleString(),
                    icon: AlertCircle,
                    color: 'orange',
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  const style = CARD_STYLES[card.color as keyof typeof CARD_STYLES];
                  return (
                    <div key={card.label} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{card.label}</p>
                          <p className="mt-2 text-2xl font-black text-gray-900">{card.value}</p>
                        </div>
                        <div className={`rounded-2xl p-3 ${style.icon}`}>
                          <Icon size={22} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/*
                Base única: aba Faltas. Cada linha é uma escala; Falta 1 conta ausência e Falta 0 conta presença.
              */}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3 bg-white p-4 sm:p-8 rounded-3xl lg:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                  <h3 className="font-black text-gray-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
                    <BarChart3 className="text-indigo-600" size={24} /> Plantões x Faltas por Diretoria
                  </h3>
                  <div className="pb-2">
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={plantaoDiretoriaChart} barGap={8} barCategoryGap="24%">
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }} />
                          <Tooltip />
                          <Bar dataKey="plantoes" name="Plantões" fill="#eb194b" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="faltas" name="Faltas" fill="#000000" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-black p-6 sm:p-8 rounded-3xl lg:rounded-[40px] text-white">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200">Leitura operacional</p>
                  <h3 className="mt-2 text-2xl font-black uppercase tracking-tighter">Mapa de atenção</h3>
                  <div className="mt-8 space-y-4">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <span className="text-[10px] font-bold uppercase text-white/50">Comparecimento geral</span>
                      <p className="mt-1 text-2xl font-black">{plantaoInsights.comparecimento.toFixed(1)}%</p>
                      <p className="text-xs font-bold text-emerald-200">
                        {plantaoStats.totalPlantoes.toLocaleString()} escalas analisadas · {plantaoStats.totalFaltas.toLocaleString()} faltas
                      </p>
                    </div>

                    {plantaoStats.totalFaltas > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        <div className="rounded-2xl bg-white/10 p-4">
                          <span className="text-[10px] font-bold uppercase text-white/50">Turno que pede atenção</span>
                          <p className="mt-1 text-lg font-black">{plantaoInsights.turnoCritico?.name ?? '-'}</p>
                          <p className="text-xs font-bold text-red-200">
                            {plantaoInsights.turnoCritico?.faltas.toLocaleString() ?? '0'} faltas · {plantaoInsights.turnoCritico?.taxaFalta.toFixed(1) ?? '0.0'}%
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4">
                          <span className="text-[10px] font-bold uppercase text-white/50">Produto com mais faltas</span>
                          <p className="mt-1 break-words text-base font-black leading-tight sm:text-lg" title={plantaoInsights.produtoCritico?.name}>{plantaoInsights.produtoCritico?.name ?? '-'}</p>
                          <p className="text-xs font-bold text-red-200">
                            {plantaoInsights.produtoCritico?.faltas.toLocaleString() ?? '0'} faltas · {plantaoInsights.produtoCritico?.taxaFalta.toFixed(1) ?? '0.0'}%
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4">
                          <span className="text-[10px] font-bold uppercase text-white/50">Incorporador mais afetado</span>
                          <p className="mt-1 break-words text-base font-black leading-tight sm:text-lg" title={plantaoInsights.incorporadorCritico?.name}>{plantaoInsights.incorporadorCritico?.name ?? '-'}</p>
                          <p className="text-xs font-bold text-red-200">
                            {plantaoInsights.incorporadorCritico?.faltas.toLocaleString() ?? '0'} faltas · {plantaoInsights.incorporadorCritico?.taxaFalta.toFixed(1) ?? '0.0'}%
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl bg-white/10 p-4">
                        <span className="text-[10px] font-bold uppercase text-white/50">Status da operação</span>
                        <p className="mt-1 text-lg font-black">Escala cumprida</p>
                        <p className="text-xs font-bold text-emerald-200">Nenhuma falta registrada no filtro atual</p>
                      </div>
                    )}
                  </div>
                  <div className="hidden">
                    {plantaoStats.totalFaltas > 0 ? (
                      <>
                        <div className="rounded-2xl bg-white/10 p-4">
                          <span className="text-[10px] font-bold uppercase text-white/50">Maior volume de faltas</span>
                          <p className="mt-1 text-lg font-black">{plantaoRankings.gerentes.find((item) => item.faltas > 0)?.name ?? '-'}</p>
                          <p className="text-xs font-bold text-red-200">
                            {plantaoRankings.gerentes.find((item) => item.faltas > 0)?.faltas.toLocaleString() ?? '0'} faltas
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4">
                          <span className="text-[10px] font-bold uppercase text-white/50">Diretoria mais crítica</span>
                          <p className="mt-1 text-lg font-black">{plantaoRankings.diretorias.find((item) => item.faltas > 0)?.name ?? '-'}</p>
                          <p className="text-xs font-bold text-red-200">
                            {plantaoRankings.diretorias.find((item) => item.faltas > 0)?.taxaFalta.toFixed(1) ?? '0.0'}% de falta
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-2xl bg-white/10 p-4">
                          <span className="text-[10px] font-bold uppercase text-white/50">Operação sem faltas</span>
                          <p className="mt-1 text-lg font-black">Escala cumprida</p>
                          <p className="text-xs font-bold text-emerald-200">Nenhuma falta registrada no filtro atual</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4">
                          <span className="text-[10px] font-bold uppercase text-white/50">Status da operação</span>
                          <p className="mt-1 text-lg font-black">Tudo em ordem</p>
                          <p className="text-xs font-bold text-emerald-200">{plantaoStats.totalPlantoes.toLocaleString()} plantões acompanhados</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <PlantaoRankingTable
                  title="Gerentes"
                  subtitle="Ordenado por maior volume de faltas."
                  items={plantaoRankings.gerentes.slice(0, 15)}
                />
                <div className="grid grid-cols-1 gap-6">
                <PlantaoRankingTable
                  title="Diretoria"
                  subtitle="Plantões, faltas e taxa de falta por diretoria."
                  items={plantaoRankings.diretorias}
                />
                <PlantaoRankingTable
                  title="Turno"
                  subtitle="Manhã e tarde com escalas, faltas e taxa."
                  items={plantaoRankings.turnos.filter((item) => item.plantoes > 0)}
                />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="hidden">
                <PlantaoRankingTable
                  title="Plantões por Turno"
                  subtitle="Manhã e tarde com total de escalas, faltas e taxa."
                  items={plantaoRankings.turnos.filter((item) => item.plantoes > 0)}
                />
                <PlantaoRankingTable
                  title="Plantões por Incorporador"
                  subtitle="Escalas e faltas por incorporador."
                  items={plantaoRankings.incorporadores.filter((item) => item.plantoes > 0).slice(0, 15)}
                />
                <PlantaoRankingTable
                  title="Plantões por Produto"
                  subtitle="Produto considerado a partir da coluna Stand."
                  items={plantaoRankings.empreendimentos.filter((item) => item.plantoes > 0).slice(0, 15)}
                />
                </div>
                <PlantaoRankingTable
                  title="Incorp."
                  subtitle="Escalas, faltas e taxa por incorporador."
                  items={plantaoRankings.incorporadores.filter((item) => item.plantoes > 0).slice(0, 15)}
                />
                <PlantaoRankingTable
                  title="Produto"
                  subtitle="Escalas, faltas e taxa por produto/stand."
                  items={plantaoRankings.empreendimentos.filter((item) => item.plantoes > 0).slice(0, 15)}
                />
              </div>

              <PlantaoRankingTable
                title="Corretores"
                subtitle="Corretores com registro de falta no filtro atual."
                items={plantaoRankings.corretores.filter((item) => item.faltas > 0).slice(0, 30)}
              />
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

          {activeTab === 'vendasPerfil' && (
            <motion.div
              key="vendasPerfil"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8 lg:rounded-[40px]">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">Vendas por perfil</p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tighter text-gray-900">
                  Análise Comercial por Perfil do Corretor
                </h3>
                <p className="mt-2 max-w-4xl text-sm font-medium text-gray-500">
                  Cruza as vendas com a aba Perfil corretor, incluindo corretores descredenciados. Vendas lançadas no nome do gerente ou diretor aparecem como Venda sem corretor.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: 'VGV analisado', value: formatCurrency(salesByProfileStats.totalVgv), icon: DollarSign, color: 'indigo' },
                  { label: 'Vendas analisadas', value: salesByProfileStats.totalVendas.toLocaleString(), icon: BarChart3, color: 'blue' },
                  { label: 'Corretores com venda', value: salesByProfileStats.corretoresComVenda.toLocaleString(), icon: Users, color: 'emerald' },
                  { label: 'Vendas sem corretor', value: salesByProfileStats.vendasSemCorretor.toLocaleString(), icon: UserX, color: 'orange' },
                  { label: 'Ticket médio', value: formatCurrency(salesByProfileStats.ticketMedio), icon: Target, color: 'orange' },
                ].map((card) => {
                  const Icon = card.icon;
                  const style = CARD_STYLES[card.color as keyof typeof CARD_STYLES];
                  return (
                    <div key={card.label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{card.label}</p>
                          <p className="mt-2 text-xl font-black text-gray-900">{card.value}</p>
                        </div>
                        <div className={`rounded-2xl p-3 ${style.icon}`}>
                          <Icon size={22} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <RankingSection
                  title="VGV por Sexo"
                  subtitle="Participação de VGV por sexo informado no cadastro."
                  items={salesByProfileStats.porSexo}
                />
                <RankingSection
                  title="VGV por Faixa Etária"
                  subtitle="VGV intermediado por faixa de idade calculada pela data de nascimento."
                  items={salesByProfileStats.porFaixaEtaria}
                />
                <RankingSection
                  title="VGV por Status CRECI"
                  subtitle="VGV por regularidade do CRECI."
                  items={salesByProfileStats.porCreciStatus}
                />
                <RankingSection
                  title="VGV por Tipo de CRECI"
                  subtitle="VGV por tipo de CRECI cadastrado."
                  items={salesByProfileStats.porCreciTipo}
                />
                <RankingSection
                  title="VGV por Estado Civil"
                  subtitle="VGV intermediado por estado civil cadastrado."
                  items={salesByProfileStats.porEstadoCivil}
                />
                <RankingSection
                  title="VGV por Escolaridade"
                  subtitle="VGV intermediado por escolaridade cadastrada."
                  items={salesByProfileStats.porEscolaridade}
                />
                <RankingSection
                  title="VGV por Diretoria"
                  subtitle="Leitura de perfil consolidada por diretoria."
                  items={salesByProfileStats.porDiretoria}
                />
                <RankingSection
                  title="VGV por Gerente"
                  subtitle="Leitura de perfil consolidada por gerente."
                  items={salesByProfileStats.porGerente}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'produtos' && (
            <motion.div
              key="produtos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8 lg:rounded-[40px]">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">Produtos e parceiros</p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tighter text-gray-900">
                  Ranking de Incorporadores e Empreendimentos
                </h3>
                <p className="mt-2 max-w-3xl text-sm font-medium text-gray-500">
                  VGV acumulado por incorporador e por produto, respeitando os filtros de diretoria, mês e busca.
                </p>
              </div>

              <div className="space-y-8">
                <RankingSection
                  title="Top 10 Incorporadores"
                  subtitle="VGV acumulado por incorporador conforme os filtros selecionados."
                  items={salesRankings.incorporadores}
                />
                <RankingSection
                  title="Top 10 Empreendimentos"
                  subtitle="VGV acumulado por empreendimento/produto conforme os filtros selecionados."
                  items={salesRankings.empreendimentos}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-xl gap-1 overflow-x-auto pb-1">
          {MAIN_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab];
            return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[9px] font-black uppercase tracking-tight transition-colors ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {TAB_LABELS[tab]}
            </button>
            );
          })}
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
