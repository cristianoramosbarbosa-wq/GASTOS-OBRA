import type { PerformanceRecord } from './data';

interface GvizCell {
  v?: unknown;
  f?: string;
}

interface GvizResponse {
  status?: string;
  errors?: Array<{ detailed_message?: string; message?: string }>;
  table?: {
    cols?: Array<{ id?: string; label?: string }>;
    rows?: Array<{ c?: Array<GvizCell | null> }>;
  };
}

interface SheetRow {
  [column: string]: unknown;
}

export interface SalesEntry {
  diretor: string;
  gerente: string;
  corretor: string;
  incorporador: string;
  empreendimento: string;
  mesVigente: string;
  vgv: number;
}

export interface PlantaoEntry {
  diretor: string;
  gerente: string;
  corretor: string;
  incorporador: string;
  empreendimento: string;
  turno: string;
  dataPlantao: string;
  mesVigente: string;
  plantoes: number;
  faltas: number;
  origem: 'escala';
}

export interface BrokerProfileEntry {
  empresa: string;
  bairro: string;
  cidade: string;
  estado: string;
  cargo: string;
  status: string;
  corretor: string;
  nome: string;
  sexo: string;
  gerente: string;
  diretor: string;
  creciStatus: string;
  creciTipo: string;
  estadoCivil: string;
  escolaridade: string;
  indicacao: string;
  dataNascimento: string;
  dataInicioCargo: string;
  dataCredenciamento: string;
  dataDescredenciamento: string;
}

const DEFAULT_SPREADSHEET_ID = '1RgXASkWpEhLL2cL8CSJZ9Aj7tv8aH9x0r8DrLrXmKi0';

const normalizeText = (value: unknown) =>
  String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const normalizePerson = (value: unknown) => String(value ?? '').trim().toUpperCase();

const normalizeProductName = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const parts = raw
    .split(/\s+-\s+/)
    .map((part) => part.replace(/\*/g, '').trim())
    .filter(Boolean);

  if (!parts.length) return '';
  if (normalizeText(parts[0]) === 'revenda') return 'REVENDA';

  const stopIndex = parts.findIndex((part, index) => {
    const normalized = normalizeText(part);
    const compact = normalized.replace(/[^a-z0-9]/g, '');

    if (index === 0) return false;
    if (/\b(bloco|torre|unico|unica|quadra|apto|apartamento)\b/.test(normalized)) return true;
    if (/^\d+[a-z]?$/.test(compact)) return true;
    if (/^[a-z]{0,3}\d{2,}$/.test(compact)) return true;

    return false;
  });

  const productParts = stopIndex > 0 ? parts.slice(0, stopIndex) : parts;
  const productName = productParts.join('-').toUpperCase();

  if (productName === 'RIIO BY PIERO LISSONI-LUCE') {
    return 'RIIO BY PIERO LISSONI';
  }

  return productName;
};

const parseNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/\s|R\$|m2|%/gi, '');
  const normalized =
    cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(',', '.');
  const parsed = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDate = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
    };
  }

  const raw = String(value ?? '').trim();
  const gvizDate = raw.match(/^Date\((\d{4}),(\d{1,2}),(\d{1,2})(?:,\d{1,2},\d{1,2},\d{1,2})?\)$/);
  if (gvizDate) {
    return { year: Number(gvizDate[1]), month: Number(gvizDate[2]) + 1, day: Number(gvizDate[3]) };
  }

  const date = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (!date) return null;
  const shortYear = Number(date[3]);
  return {
    year: shortYear < 100 ? 2000 + shortYear : shortYear,
    month: Number(date[2]),
    day: Number(date[1]),
  };
};

const dateKey = (value: unknown) => {
  const date = parseDate(value);
  if (!date) return '';
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
};

const monthKey = (value: unknown) => {
  const date = parseDate(value);
  return date ? `${date.year}-${String(date.month).padStart(2, '0')}` : '';
};

const weekNumber = (value: unknown, fallbackDate?: unknown) => {
  const explicitWeek = String(value ?? '').match(/(\d+)/);
  if (explicitWeek) return Number(explicitWeek[1]);
  const date = parseDate(fallbackDate);
  return date ? Math.min(Math.ceil(date.day / 7), 5) : 1;
};

const getValue = (row: SheetRow, aliases: string[]) => {
  const normalizedAliases = aliases.map(normalizeText);
  return Object.entries(row).find(([column]) =>
    normalizedAliases.includes(normalizeText(column)),
  )?.[1];
};

const parsePayload = (payload: string): GvizResponse => {
  const start = payload.indexOf('{');
  const end = payload.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('Resposta inválida do Google Sheets.');
  return JSON.parse(payload.slice(start, end + 1)) as GvizResponse;
};

async function loadSheet(sheetName: string, signal?: AbortSignal): Promise<SheetRow[]> {
  const viteSpreadsheetId =
    typeof import.meta.env !== 'undefined'
      ? import.meta.env.VITE_GOOGLE_SHEETS_ID?.trim()
      : undefined;
  const spreadsheetId =
    viteSpreadsheetId ||
    (typeof process !== 'undefined'
      ? process.env.GOOGLE_SHEETS_ID?.trim()
      : undefined) ||
    DEFAULT_SPREADSHEET_ID;
  const endpoint = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`);
  endpoint.searchParams.set('tqx', 'out:json');
  endpoint.searchParams.set('sheet', sheetName);
  endpoint.searchParams.set('_', String(Date.now()));

  const response = await fetch(endpoint, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Não foi possível acessar a aba "${sheetName}".`);

  const parsed = parsePayload(await response.text());
  if (parsed.status === 'error') {
    throw new Error(
      parsed.errors?.[0]?.detailed_message ||
        parsed.errors?.[0]?.message ||
        `Erro ao ler a aba "${sheetName}".`,
    );
  }

  const columns =
    parsed.table?.cols?.map(
      (column, index) => column.label?.trim() || column.id || `coluna_${index + 1}`,
    ) ?? [];

  return (parsed.table?.rows ?? []).map((row) =>
    Object.fromEntries(
      columns.map((column, index) => {
        const cell = row.c?.[index];
        return [column, cell?.v ?? cell?.f ?? ''];
      }),
    ),
  );
}

const recordKey = (diretor: string, gerente: string, mes: string, semana: number) =>
  `${diretor}|${gerente}|${mes}|${semana}`;

const monthlyKey = (diretor: string, gerente: string, mes: string) =>
  `${diretor}|${gerente}|${mes}`;

export async function loadPerformanceData(signal?: AbortSignal) {
  const [goals, visits, sales, faltas, brokerProfiles] = await Promise.all([
    loadSheet('Meta Mensal', signal),
    loadSheet('Visitas', signal),
    loadSheet('Vendas', signal),
    loadSheet('Faltas', signal),
    loadSheet('Perfil corretor', signal),
  ]);

  const records = new Map<string, PerformanceRecord>();
  const monthlyGoals = new Map<string, number>();
  const salesEntries: SalesEntry[] = [];
  const plantaoEntries: PlantaoEntry[] = [];
  const brokerProfileEntries: BrokerProfileEntry[] = [];
  const managerDirector = new Map<string, string>();

  const ensureRecord = (diretor: string, gerente: string, mes: string, semana: number) => {
    const key = recordKey(diretor, gerente, mes, semana);
    const existing = records.get(key);
    if (existing) return existing;

    const record: PerformanceRecord = {
      diretor,
      gerente,
      mesVigente: mes,
      semana,
      metaMensal: 0,
      vendasReais: 0,
      visitas: 0,
      agendamentos: 0,
    };
    records.set(key, record);
    return record;
  };

  goals.forEach((row) => {
    const diretor = normalizePerson(getValue(row, ['Diretor', 'Diretoria', 'A']));
    const gerente = normalizePerson(getValue(row, ['Gerente', 'B']));
    const mes = monthKey(getValue(row, ['mês vigente', 'mes vigente', 'D']));
    if (diretor && gerente && mes) {
      managerDirector.set(gerente, diretor);
      monthlyGoals.set(
        monthlyKey(diretor, gerente, mes),
        parseNumber(getValue(row, ['Meta Mensal', 'Meta', 'C'])),
      );
    }
  });

  visits.forEach((row) => {
    const diretor = normalizePerson(getValue(row, ['Diretor', 'Diretoria']));
    const gerente = normalizePerson(getValue(row, ['Gerente']));
    const date = getValue(row, ['dia', 'data']);
    const mes = monthKey(date);
    if (!diretor || !gerente || !mes) return;

    const record = ensureRecord(
      diretor,
      gerente,
      mes,
      weekNumber(getValue(row, ['semana']), date),
    );
    record.possuiRelatorioPresenca = true;
    record.visitas += parseNumber(getValue(row, ['PRESENÇA', 'presenca', 'visitas']));
    record.agendamentos += parseNumber(getValue(row, ['AGENDADAS', 'agendamentos']));
  });

  sales.forEach((row) => {
    const diretor = normalizePerson(getValue(row, ['Diretor', 'Diretoria']));
    const gerente = normalizePerson(getValue(row, ['Gerente']));
    const corretor = normalizePerson(getValue(row, ['Corretor']));
    const incorporador = normalizePerson(getValue(row, ['INCORPORADOR', 'Incorporador']));
    const empreendimento = normalizeProductName(getValue(row, ['UNIDADE', 'Empreendimento', 'Produto']));
    const date = getValue(row, ['DATA', 'dia']);
    const mes = monthKey(date);
    const vgv = parseNumber(getValue(row, ['VGV', 'Vendas']));
    if (!diretor || !gerente || !mes) return;

    if (!managerDirector.has(gerente)) managerDirector.set(gerente, diretor);
    ensureRecord(diretor, gerente, mes, weekNumber(undefined, date)).vendasReais += vgv;
    salesEntries.push({
      diretor,
      gerente,
      corretor,
      incorporador,
      empreendimento,
      mesVigente: mes,
      vgv,
    });
  });

  faltas.forEach((row) => {
    const diretor = normalizePerson(getValue(row, ['DIRETOR', 'Diretor', 'Diretoria']));
    const gerente = normalizePerson(getValue(row, ['GERENTE', 'Gerente', 'Equipe']));
    const corretor = normalizePerson(getValue(row, ['CORRETOR', 'Corretor']));
    const date = getValue(row, ['Data Plantão', 'Data PlantÃ£o', 'Data Plantao', 'DATA', 'Data', 'Dia']);
    const mes = monthKey(date);
    const falta = parseNumber(getValue(row, ['FALTA', 'Falta', 'Faltas'])) > 0 ? 1 : 0;

    if (!gerente || !corretor || !mes) return;

    plantaoEntries.push({
      diretor: diretor || managerDirector.get(gerente) || 'SEM DIRETOR',
      gerente,
      corretor,
      incorporador: normalizePerson(getValue(row, ['INCORPORADOR', 'Incorporador'])),
      empreendimento: normalizeProductName(getValue(row, ['STAND', 'Stand', 'Produto', 'Empreendimento'])),
      turno: normalizePerson(getValue(row, ['TURNO', 'Turno'])),
      dataPlantao: dateKey(date),
      mesVigente: mes,
      plantoes: 1,
      faltas: falta,
      origem: 'escala',
    });
  });

  brokerProfiles.forEach((row) => {
    const cargo = normalizePerson(getValue(row, ['Aut_DesignacaoTecnica', 'Cargo']));
    const status = normalizePerson(getValue(row, ['Aut_Status', 'STATUS', 'STATUS EMPRESA']));
    const corretor = normalizePerson(getValue(row, ['Aut_Apelido', 'APELIDO']));

    if (cargo !== 'CORRETOR') return;
    if (!corretor) return;

    brokerProfileEntries.push({
      empresa: normalizePerson(getValue(row, ['Aut_Empresa', 'EMPRESA'])),
      bairro: normalizePerson(getValue(row, ['Aut_Bairro', 'BAIRRO'])),
      cidade: normalizePerson(getValue(row, ['Aut_Cidade', 'CIDADE'])),
      estado: normalizePerson(getValue(row, ['Aut_Estado', 'ESTADO'])),
      cargo,
      status,
      corretor,
      nome: normalizePerson(getValue(row, ['Aut_Nome', 'NOME'])),
      sexo: normalizePerson(getValue(row, ['Aut_Sexo', 'Sexo', 'SEXO'])),
      gerente: normalizePerson(getValue(row, ['Aut_SuperintendenteApelido', 'GERENTE'])),
      diretor: normalizePerson(getValue(row, ['Aut_DiretorApelido', 'DIRETOR'])),
      creciStatus: normalizePerson(getValue(row, ['Aut_CreciStatus', 'Status Creci'])),
      creciTipo: normalizePerson(getValue(row, ['Aut_CreciTipo', 'CRECI TIPO', 'Recu_TpCreci'])),
      estadoCivil: normalizePerson(getValue(row, ['Estado Civil', 'Aut_EstadoCivil'])),
      escolaridade: normalizePerson(getValue(row, ['Escolaridade', 'Aut_Escolaridade'])),
      indicacao: normalizePerson(getValue(row, ['Indicação', 'Indicacao'])),
      dataNascimento: dateKey(getValue(row, ['Aut_DtNascimento', 'Data Nasc'])),
      dataInicioCargo: dateKey(getValue(row, ['Aut_UltimaDataInicioCargo'])),
      dataCredenciamento: dateKey(getValue(row, ['Credenciamento', 'Aut_UltimaDataInicioCargo'])),
      dataDescredenciamento: dateKey(getValue(row, ['Descredenciamento', 'Aut_UltimaDataDescredenciamento'])),
    });
  });

  monthlyGoals.forEach((goal, key) => {
    const [diretor, gerente, mes] = key.split('|');
    const target =
      [...records.values()]
        .filter(
          (record) =>
            record.diretor === diretor &&
            record.gerente === gerente &&
            record.mesVigente === mes,
        )
        .sort((a, b) => a.semana - b.semana)[0] ??
      ensureRecord(diretor, gerente, mes, 1);
    target.metaMensal = goal;
  });

  return {
    records: [...records.values()].sort(
      (a, b) =>
        b.mesVigente.localeCompare(a.mesVigente) ||
        a.semana - b.semana ||
        a.diretor.localeCompare(b.diretor) ||
        a.gerente.localeCompare(b.gerente),
    ),
    salesEntries,
    plantaoEntries,
    brokerProfileEntries,
  };
}
