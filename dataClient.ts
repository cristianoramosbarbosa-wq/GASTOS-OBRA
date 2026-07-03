import type { PerformanceRecord } from './data';
import type { BrokerProfileEntry, PlantaoEntry, SalesEntry } from './googleSheetsPublic';

export interface DashboardPayload {
  records: PerformanceRecord[];
  salesEntries: SalesEntry[];
  plantaoEntries: PlantaoEntry[];
  brokerProfileEntries: BrokerProfileEntry[];
}

export async function loadDashboardData(signal?: AbortSignal) {
  if (import.meta.env.DEV) {
    const { loadPerformanceData } = await import('./googleSheetsPublic');
    return loadPerformanceData(signal);
  }

  const response = await fetch('/api/data', {
    credentials: 'include',
    signal,
    cache: 'no-store',
  });
  const payload = (await response.json()) as DashboardPayload & { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || 'Não foi possível carregar os dados.');
  }

  return payload;
}
