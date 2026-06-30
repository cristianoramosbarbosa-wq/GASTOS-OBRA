export interface PerformanceRecord {
  diretor: string;
  gerente: string;
  mesVigente: string;
  semana: number;
  metaMensal: number;
  vendasReais: number;
  visitas: number;
  agendamentos: number;
  possuiRelatorioPresenca?: boolean;
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);

export const formatMonthYear = (value: string) => {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
};
