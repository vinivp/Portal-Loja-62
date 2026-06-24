import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Cake,
  Calculator,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  ExternalLink,
  FileText,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  NotebookPen,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserCog,
  Utensils,
  X,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  isFirebaseAuthEnabled,
  isFirebaseConfigured,
  savePortalState,
  savePortalStatePatch,
  signInFirebaseUser,
  signOutFirebaseUser,
  subscribeFirebaseAuth,
  subscribePortalState,
} from "./firebase";
import "./App.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type Permission = "Admin" | "Lider" | "Usuário";
type RoleName = "Desenvolvedor" | "Gerente" | "Lider" | "Colaborador";
type PageKey =
  | "dashboard"
  | "cartazista"
  | "vacations"
  | "birthdays"
  | "menu"
  | "calculators"
  | "apex"
  | "scale"
  | "admin-vacations"
  | "admin-birthdays"
  | "admin-menu"
  | "admin-users";

type PortalUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  roleName: RoleName;
  permission: Permission;
  sector: string;
  shift: "Manhã" | "Tarde" | "Noite";
  loginEnabled: boolean;
};

type MonthlyBoard<T> = {
  id: string;
  year: number;
  month: number;
  title: string;
  notes: string;
  entries: T[];
};

type VacationEntry = {
  id: string;
  person: string;
  sector: string;
  startDate: string;
  endDate: string;
  returnDate: string;
  status: "Programado" | "Em férias" | "Retornou";
  notes: string;
};

type BirthdayEntry = {
  id: string;
  person: string;
  sector: string;
  birthday: string;
  message: string;
};

type MenuDay = {
  id: string;
  date: string;
  title: string;
  items: string[];
  notes: string;
  source: "manual" | "pdf";
};

type MenuMonth = {
  id: string;
  year: number;
  month: number;
  title: string;
  notes: string;
  days: MenuDay[];
};

type PortalData = {
  users: PortalUser[];
  vacations: MonthlyBoard<VacationEntry>[];
  birthdays: MonthlyBoard<BirthdayEntry>[];
  menus: MenuMonth[];
  cartazistaNotes: Record<string, string>;
};

type SyncStatus = {
  mode: "local" | "connecting" | "firebase" | "error";
  label: string;
  detail: string;
};

type StateUpdate<T> = T | ((current: T) => T);

type VacationForm = {
  person: string;
  sector: string;
  startDate: string;
  endDate: string;
  returnDate: string;
  status: VacationEntry["status"];
  notes: string;
};

type BirthdayForm = {
  person: string;
  sector: string;
  birthday: string;
  message: string;
};

type MenuDayForm = {
  date: string;
  title: string;
  itemsText: string;
  notes: string;
};

type PosterOrder = {
  id: string;
  code: string;
  price: string;
  size: string;
  offer: boolean;
  dePrice: string;
  savePrice: string;
  cardPrice: string;
  packRule: string;
};

type ScheduleRow = {
  day: number;
  date: string;
  weekday: string;
  morning: string[];
  afternoon: string[];
  night: string[];
  off: string[];
  warning?: string;
};

const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const initialUsers: PortalUser[] = [
  {
    id: "u-desenvolvedor",
    name: "Desenvolvedor Loja 62",
    email: "desenvolvedor@loja62.com",
    password: "1234",
    roleName: "Desenvolvedor",
    permission: "Admin",
    sector: "Desenvolvimento",
    shift: "Manhã",
    loginEnabled: true,
  },
  {
    id: "u-gerente",
    name: "Gerente Loja 62",
    email: "gerente@loja62.com",
    password: "1234",
    roleName: "Gerente",
    permission: "Admin",
    sector: "Gestão",
    shift: "Manhã",
    loginEnabled: true,
  },
  {
    id: "u-lider",
    name: "Líder Operacional",
    email: "lider@loja62.com",
    password: "1234",
    roleName: "Lider",
    permission: "Lider",
    sector: "Operação",
    shift: "Tarde",
    loginEnabled: true,
  },
  {
    id: "u-colaborador",
    name: "Colaborador Loja 62",
    email: "colaborador@loja62.com",
    password: "1234",
    roleName: "Colaborador",
    permission: "Usuário",
    sector: "Mercearia",
    shift: "Tarde",
    loginEnabled: true,
  },
  {
    id: "u-caixa",
    name: "Ana Paula",
    email: "ana.paula@loja62.com",
    password: "1234",
    roleName: "Colaborador",
    permission: "Usuário",
    sector: "Caixa",
    shift: "Manhã",
    loginEnabled: false,
  },
  {
    id: "u-padaria",
    name: "Bruno Souza",
    email: "bruno.souza@loja62.com",
    password: "1234",
    roleName: "Colaborador",
    permission: "Usuário",
    sector: "Padaria",
    shift: "Noite",
    loginEnabled: false,
  },
  {
    id: "u-flv",
    name: "Carla Mendes",
    email: "carla.mendes@loja62.com",
    password: "1234",
    roleName: "Colaborador",
    permission: "Usuário",
    sector: "FLV",
    shift: "Manhã",
    loginEnabled: false,
  },
  {
    id: "u-aougue",
    name: "Diego Lima",
    email: "diego.lima@loja62.com",
    password: "1234",
    roleName: "Colaborador",
    permission: "Usuário",
    sector: "Açougue",
    shift: "Tarde",
    loginEnabled: false,
  },
];

const initialVacations: MonthlyBoard<VacationEntry>[] = [
  {
    id: "vac-2026-06",
    year: 2026,
    month: 5,
    title: "Férias de Junho",
    notes: "Acompanhar retornos no primeiro dia útil.",
    entries: [
      {
        id: "vac-1",
        person: "Ana Paula",
        sector: "Caixa",
        startDate: "2026-06-03",
        endDate: "2026-06-17",
        returnDate: "2026-06-18",
        status: "Em férias",
        notes: "Cobertura pelo turno da manhã.",
      },
      {
        id: "vac-2",
        person: "Diego Lima",
        sector: "Açougue",
        startDate: "2026-06-20",
        endDate: "2026-07-04",
        returnDate: "2026-07-05",
        status: "Programado",
        notes: "Revezar apoio do setor de frios.",
      },
    ],
  },
  {
    id: "vac-2026-07",
    year: 2026,
    month: 6,
    title: "Férias de Julho",
    notes: "Planejamento inicial sujeito a troca.",
    entries: [
      {
        id: "vac-3",
        person: "Bruno Souza",
        sector: "Padaria",
        startDate: "2026-07-08",
        endDate: "2026-07-22",
        returnDate: "2026-07-23",
        status: "Programado",
        notes: "Treinar cobertura antes da saída.",
      },
    ],
  },
];

const initialBirthdays: MonthlyBoard<BirthdayEntry>[] = [
  {
    id: "birth-2026-06",
    year: 2026,
    month: 5,
    title: "Aniversariantes de Junho",
    notes: "Enviar comunicado no mural.",
    entries: [
      {
        id: "birth-1",
        person: "Carla Mendes",
        sector: "FLV",
        birthday: "2026-06-12",
        message: "Parabéns pelo dia!",
      },
      {
        id: "birth-2",
        person: "Líder Operacional",
        sector: "Operação",
        birthday: "2026-06-26",
        message: "Celebrar no café da tarde.",
      },
    ],
  },
];

const initialMenus: MenuMonth[] = [
  {
    id: "menu-2026-06",
    year: 2026,
    month: 5,
    title: "Cardápio Junho",
    notes: "Cardápio base para demonstração.",
    days: [
      {
        id: "menu-day-1",
        date: "2026-06-15",
        title: "Segunda-feira",
        items: ["Arroz e feijão", "Frango assado", "Salada de alface", "Suco de laranja"],
        notes: "Opção leve disponível.",
        source: "manual",
      },
      {
        id: "menu-day-2",
        date: "2026-06-16",
        title: "Terça-feira",
        items: ["Macarrão alho e óleo", "Carne de panela", "Legumes refogados"],
        notes: "",
        source: "manual",
      },
    ],
  },
];

const initialPortalData: PortalData = {
  users: initialUsers,
  vacations: initialVacations,
  birthdays: initialBirthdays,
  menus: initialMenus,
  cartazistaNotes: {},
};

const emptyVacationForm: VacationForm = {
  person: "",
  sector: "",
  startDate: "",
  endDate: "",
  returnDate: "",
  status: "Programado",
  notes: "",
};

const emptyBirthdayForm: BirthdayForm = {
  person: "",
  sector: "",
  birthday: "",
  message: "",
};

const emptyMenuDayForm: MenuDayForm = {
  date: "",
  title: "",
  itemsText: "",
  notes: "",
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(value: string) {
  if (!value) return "Não informado";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function toISODate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toMinutes(time: string) {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setPersistentState = (value: T | ((current: T) => T)) => {
    setState((current) => {
      const next = typeof value === "function" ? (value as (current: T) => T)(current) : value;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };

  return [state, setPersistentState] as const;
}

const PORTAL_DATA_KEY = "portal-loja62-data";

function readJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

const generalLoginEmails = new Set(
  initialUsers.filter((user) => user.loginEnabled).map((user) => user.email),
);

function normalizePortalUsers(users: PortalUser[] | undefined) {
  const source = users ?? [];
  const loginUsers = initialUsers
    .filter((user) => user.loginEnabled)
    .map((template) => {
      const current = source.find((user) => user.email === template.email);
      return { ...current, ...template, loginEnabled: true };
    });
  const operationalUsers = source
    .filter(
      (user) =>
        !generalLoginEmails.has(user.email) &&
        user.email !== "rh@loja62.com",
    )
    .map((user) => ({
      ...user,
      roleName: user.roleName === ("RH" as RoleName) ? "Colaborador" : user.roleName,
      loginEnabled: false,
    }));

  return [...loginUsers, ...operationalUsers];
}

function normalizePortalData(data: Partial<PortalData> | null | undefined): PortalData {
  return {
    users: normalizePortalUsers(data?.users?.length ? data.users : initialPortalData.users),
    vacations: data?.vacations ?? initialPortalData.vacations,
    birthdays: data?.birthdays ?? initialPortalData.birthdays,
    menus: data?.menus ?? initialPortalData.menus,
    cartazistaNotes: data?.cartazistaNotes ?? initialPortalData.cartazistaNotes,
  };
}

function stableStringify(value: unknown) {
  return JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;

    return Object.keys(item as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = (item as Record<string, unknown>)[key];
        return sorted;
      }, {});
  });
}

function readLocalPortalData(): PortalData {
  const savedData = readJson<PortalData | null>(PORTAL_DATA_KEY, null);
  if (savedData) return normalizePortalData(savedData);

  return normalizePortalData({
    users: readJson("portal-loja62-users", initialUsers),
    vacations: readJson("portal-loja62-vacations", initialVacations),
    birthdays: readJson("portal-loja62-birthdays", initialBirthdays),
    menus: readJson("portal-loja62-menus", initialMenus),
  });
}

function persistLocalPortalData(data: PortalData) {
  localStorage.setItem(PORTAL_DATA_KEY, JSON.stringify(data));
}

function usePortalData(firebaseSessionKey: string | null) {
  const activeSessionKey = isFirebaseAuthEnabled ? firebaseSessionKey : "local";
  const canUseFirebase = !isFirebaseAuthEnabled || Boolean(firebaseSessionKey);
  const [data, setData] = useState<PortalData>(() => readLocalPortalData());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    isFirebaseConfigured
      ? canUseFirebase
        ? {
          mode: "connecting",
          label: "Conectando Firebase",
          detail: "Tentando sincronizar com Firestore.",
        }
        : {
            mode: "connecting",
            label: "Aguardando login",
            detail: "Entre com um usuário do Firebase para sincronizar o Firestore.",
          }
      : {
          mode: "local",
          label: "Modo local",
          detail: "Configure o Firebase para sincronizar entre dispositivos.",
        },
  );
  const [syncedSessionKey, setSyncedSessionKey] = useState<string | null>(
    isFirebaseConfigured ? null : activeSessionKey,
  );
  const [failedSessionKey, setFailedSessionKey] = useState<string | null>(null);
  const latestDataRef = useRef(data);
  const migrationAttemptedRef = useRef(false);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (!isFirebaseConfigured || !canUseFirebase) return undefined;
    const subscriptionKey = activeSessionKey ?? "local";

    return subscribePortalState<PortalData>(
      (remoteData) => {
        if (remoteData) {
          const normalized = normalizePortalData(remoteData);
          persistLocalPortalData(normalized);
          setData(normalized);
          if (
            !migrationAttemptedRef.current &&
            stableStringify(normalized) !== stableStringify(remoteData)
          ) {
            migrationAttemptedRef.current = true;
            savePortalState(normalized).catch(() => undefined);
          }
          setSyncStatus({
            mode: "firebase",
            label: "Firebase conectado",
            detail: "Dados sincronizados com Firestore.",
          });
          setSyncedSessionKey(subscriptionKey);
          setFailedSessionKey(null);
          return;
        }

        savePortalState(latestDataRef.current)
          .then(() => {
            setSyncedSessionKey(subscriptionKey);
            setFailedSessionKey(null);
            setSyncStatus({
              mode: "firebase",
              label: "Firebase conectado",
              detail: "Documento inicial criado no Firestore.",
            });
          })
          .catch((error) => {
            setFailedSessionKey(subscriptionKey);
            setSyncStatus({
              mode: "error",
              label: "Erro no Firebase",
              detail: error.message,
            });
          });
      },
      (error) => {
        setFailedSessionKey(subscriptionKey);
        setSyncStatus({
          mode: "error",
          label: "Erro no Firebase",
          detail: error.message,
        });
      },
    );
  }, [activeSessionKey, canUseFirebase]);

  const setPortalData = (value: PortalData | ((current: PortalData) => PortalData)) => {
    setData((current) => {
      const next = typeof value === "function" ? (value as (current: PortalData) => PortalData)(current) : value;
      persistLocalPortalData(next);
      latestDataRef.current = next;

      if (isFirebaseConfigured && canUseFirebase) {
        // Save only changed sections so an older tab cannot replace unrelated data.
        const changedState: Partial<PortalData> = {};
        if (next.users !== current.users) changedState.users = next.users;
        if (next.vacations !== current.vacations) changedState.vacations = next.vacations;
        if (next.birthdays !== current.birthdays) changedState.birthdays = next.birthdays;
        if (next.menus !== current.menus) changedState.menus = next.menus;
        if (next.cartazistaNotes !== current.cartazistaNotes) {
          changedState.cartazistaNotes = next.cartazistaNotes;
        }

        if (Object.keys(changedState).length > 0) {
          savePortalStatePatch<PortalData>(changedState).catch((error) =>
            setSyncStatus({
              mode: "error",
              label: "Erro ao salvar",
              detail: error.message,
            }),
          );
        }
      }

      return next;
    });
  };

  const remoteReady =
    !isFirebaseConfigured ||
    (activeSessionKey !== null && syncedSessionKey === activeSessionKey);
  const syncError =
    activeSessionKey !== null && failedSessionKey === activeSessionKey
      ? syncStatus.detail
      : "";

  return { data, setPortalData, syncStatus, remoteReady, syncError };
}

function resolveStateUpdate<T>(value: StateUpdate<T>, current: T) {
  return typeof value === "function" ? (value as (current: T) => T)(current) : value;
}

function useFirebaseSession() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(!isFirebaseAuthEnabled);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!isFirebaseAuthEnabled) return undefined;
    return subscribeFirebaseAuth((firebaseUser) => {
      setEmail(firebaseUser?.email?.toLowerCase() ?? null);
      setRevision((current) => current + 1);
      setReady(true);
    });
  }, []);

  return { email, ready, revision };
}

function sortBoards<T>(boards: MonthlyBoard<T>[]) {
  return [...boards].sort((a, b) => b.year - a.year || b.month - a.month);
}

function hasLeaderAccess(user: PortalUser) {
  return user.permission === "Admin" || user.permission === "Lider";
}

function hasAdminAccess(user: PortalUser) {
  return user.permission === "Admin";
}

function fieldLabel(permission: Permission) {
  if (permission === "Admin") return "Acesso total";
  if (permission === "Lider") return "Portal dos líderes";
  return "Consulta";
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function parseObjections(raw: string) {
  const objections = new Map<string, Set<number>>();
  raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [namePart, daysPart = ""] = line.split(":");
      const name = namePart.trim().toLowerCase();
      const days = daysPart
        .split(/[,\s]+/)
        .map((item) => Number(item.replace(/\D/g, "")))
        .filter((item) => item >= 1 && item <= 31);
      if (name && days.length) objections.set(name, new Set(days));
    });
  return objections;
}

function allocateShift(
  pool: PortalUser[],
  count: number,
  totals: Map<string, number>,
  preferredShift: PortalUser["shift"],
) {
  const sorted = [...pool].sort((a, b) => {
    const preferredA = a.shift === preferredShift ? -1 : 0;
    const preferredB = b.shift === preferredShift ? -1 : 0;
    return preferredA - preferredB || (totals.get(a.id) ?? 0) - (totals.get(b.id) ?? 0);
  });
  return sorted.slice(0, count);
}

function generateSchedule(
  people: PortalUser[],
  year: number,
  month: number,
  minimums: { morning: number; afternoon: number; night: number },
  objectionsRaw: string,
) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totals = new Map(people.map((person) => [person.id, 0]));
  const objections = parseObjections(objectionsRaw);
  const rows: ScheduleRow[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day, 12);
    const available = people.filter((person, index) => {
      const plannedOff = (day + index) % 7 === 6 || (day + index) % 7 === 0;
      const personalObjection = objections.get(person.name.toLowerCase())?.has(day);
      return !plannedOff && !personalObjection;
    });

    let remaining = [...available];
    const morning = allocateShift(remaining, minimums.morning, totals, "Manhã");
    remaining = remaining.filter((person) => !morning.includes(person));
    const afternoon = allocateShift(remaining, minimums.afternoon, totals, "Tarde");
    remaining = remaining.filter((person) => !afternoon.includes(person));
    const night = allocateShift(remaining, minimums.night, totals, "Noite");
    const working = [...morning, ...afternoon, ...night];

    working.forEach((person) => totals.set(person.id, (totals.get(person.id) ?? 0) + 1));

    const warning =
      morning.length < minimums.morning ||
      afternoon.length < minimums.afternoon ||
      night.length < minimums.night
        ? "Cobertura abaixo do mínimo em pelo menos um período."
        : undefined;

    rows.push({
      day,
      date: toISODate(year, month, day),
      weekday: weekdays[date.getDay()],
      morning: morning.map((person) => person.name),
      afternoon: afternoon.map((person) => person.name),
      night: night.map((person) => person.name),
      off: people
        .filter((person) => !working.includes(person))
        .map((person) => person.name),
      warning,
    });
  }

  return rows;
}

function parseMenuTextToDays(text: string, year: number, month: number) {
  const normalized = text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  type ParsedMenuDay = { day: number; title: string; items: string[] };
  const found: ParsedMenuDay[] = [];
  let currentIndex = -1;

  const startNewDay = (day: number, title: string): ParsedMenuDay => {
    const next = { day, title, items: [] };
    found.push(next);
    currentIndex = found.length - 1;
    return next;
  };

  for (const line of normalized) {
    const dateMatch = line.match(/(?:^|\s)(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/);
    const simpleDayMatch = line.match(/^(\d{1,2})\s*[-:]?\s*(.*)$/);
    const weekdayMatch = line.match(
      /(segunda|terça|ter[cç]a|quarta|quinta|sexta|sábado|sabado|domingo)(?:-feira)?/i,
    );

    if (dateMatch) {
      const day = Number(dateMatch[1]);
      const detectedMonth = Number(dateMatch[2]) - 1;
      if (detectedMonth === month && day >= 1 && day <= 31) {
        const activeDay = startNewDay(day, weekdayMatch?.[0] ?? `Dia ${day}`);
        const remainder = line.replace(dateMatch[0], "").trim();
        if (remainder) activeDay.items.push(remainder);
        continue;
      }
    }

    if (simpleDayMatch && Number(simpleDayMatch[1]) >= 1 && Number(simpleDayMatch[1]) <= 31) {
      const day = Number(simpleDayMatch[1]);
      const title = weekdayMatch?.[0] ?? `Dia ${day}`;
      const activeDay = startNewDay(day, title);
      if (simpleDayMatch[2]) activeDay.items.push(simpleDayMatch[2]);
      continue;
    }

    const activeDay = currentIndex >= 0 ? found[currentIndex] : undefined;
    if (weekdayMatch && activeDay && activeDay.items.length === 0) {
      activeDay.title = weekdayMatch[0];
    } else if (activeDay) {
      activeDay.items.push(line);
    }
  }

  return found.filter((day) => day.items.length).map((day) => ({
    id: makeId("pdf-menu"),
    date: toISODate(year, month, day.day),
    title: day.title,
    items: day.items.slice(0, 8),
    notes: "Importado automaticamente de PDF. Revise antes de divulgar.",
    source: "pdf" as const,
  }));
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "green" | "red" | "yellow";
}) {
  return (
    <div className={`stat-card ${tone ?? ""}`}>
      <span className="stat-icon">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        <span className="section-kicker">{icon}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function PortalSyncScreen({ error }: { error: string }) {
  return (
    <main className="portal-sync-screen" aria-live="polite">
      <div>
        <img src="/imagem/LogoApp.png" alt="Portal Loja 62" />
        {!error && <span className="sync-loader" aria-hidden="true" />}
        <h1>{error ? "Não foi possível sincronizar" : "Atualizando o portal"}</h1>
        <p>{error || "Buscando as informações mais recentes da Loja 62."}</p>
        {error && (
          <button className="primary-button" type="button" onClick={() => window.location.reload()}>
            <RotateCcw size={17} /> Tentar novamente
          </button>
        )}
      </div>
    </main>
  );
}

function LoginScreen({
  users,
  onLogin,
  firebaseAuthEnabled,
}: {
  users: PortalUser[];
  onLogin: (credentials: { email: string; password: string; user: PortalUser }) => Promise<void> | void;
  firebaseAuthEnabled: boolean;
}) {
  const [email, setEmail] = useState("gerente@loja62.com");
  const [password, setPassword] = useState(firebaseAuthEnabled ? "" : "1234");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loginUsers = users.filter((user) => user.loginEnabled);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const found = loginUsers.find((user) => user.email.toLowerCase() === normalizedEmail);
    if (!found) {
      setError("E-mail não cadastrado nas permissões do portal.");
      return;
    }
    if (!firebaseAuthEnabled && found.password !== password) {
      setError("Usuário ou senha inválidos. Use uma conta cadastrada no portal.");
      return;
    }

    setIsSubmitting(true);
    try {
      setError("");
      await onLogin({ email: normalizedEmail, password, user: found });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Não foi possível autenticar no Firebase.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-visual">
        <img src="/imagem/LogoApp.png" alt="Portal Loja 62" />
        <div>
          <h1>Portal Loja 62</h1>
          <p>Férias, aniversariantes, cardápio, calculadoras, líderes e admin em um só lugar.</p>
        </div>
      </div>
      <form className="login-panel" onSubmit={submit}>
        <span className="section-kicker">
          <KeyRound size={18} /> Acesso do portal
        </span>
        <h2>Entrar</h2>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label>
          Senha
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button" type="submit">
          <ShieldCheck size={18} /> {isSubmitting ? "Validando..." : "Acessar portal"}
        </button>
        <div className="quick-users">
          <span>Perfis de acesso</span>
          {loginUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                setEmail(user.email);
                setPassword(firebaseAuthEnabled ? "" : user.password);
              }}
            >
              {user.roleName}
            </button>
          ))}
        </div>
      </form>
    </main>
  );
}

function PortalShell({
  user,
  activePage,
  setActivePage,
  onLogout,
  syncStatus,
  children,
}: {
  user: PortalUser;
  activePage: PageKey;
  setActivePage: (page: PageKey) => void;
  onLogout: () => void;
  syncStatus: SyncStatus;
  children: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const desktopQuery = window.matchMedia("(min-width: 881px)");
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    desktopQuery.addEventListener("change", closeOnDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      desktopQuery.removeEventListener("change", closeOnDesktop);
    };
  }, [mobileMenuOpen]);

  const generalItems: { key: PageKey; label: string; icon: ReactNode }[] = [
    { key: "dashboard", label: "Início", icon: <LayoutDashboard size={18} /> },
    { key: "cartazista", label: "Portal do Cartazista", icon: <Palette size={18} /> },
    { key: "vacations", label: "Férias Mensais", icon: <CalendarRange size={18} /> },
    { key: "birthdays", label: "Aniversariantes", icon: <Cake size={18} /> },
    { key: "menu", label: "Cardápio", icon: <Utensils size={18} /> },
    { key: "calculators", label: "Calculadoras", icon: <Calculator size={18} /> },
  ];
  const leaderItems: { key: PageKey; label: string; icon: ReactNode }[] = [
    { key: "apex", label: "Apex", icon: <ExternalLink size={18} /> },
    { key: "scale", label: "Escala 5x2", icon: <ClipboardList size={18} /> },
  ];
  const adminItems: { key: PageKey; label: string; icon: ReactNode }[] = [
    { key: "admin-vacations", label: "Admin Férias", icon: <CalendarDays size={18} /> },
    { key: "admin-birthdays", label: "Admin Aniversários", icon: <Cake size={18} /> },
    { key: "admin-menu", label: "Admin Cardápio", icon: <Utensils size={18} /> },
    { key: "admin-users", label: "Usuários", icon: <UserCog size={18} /> },
  ];

  function NavButton({ item }: { item: { key: PageKey; label: string; icon: ReactNode } }) {
    return (
      <button
        className={activePage === item.key ? "nav-button active" : "nav-button"}
        onClick={() => {
          setActivePage(item.key);
          setMobileMenuOpen(false);
        }}
        type="button"
      >
        {item.icon}
        {item.label}
      </button>
    );
  }

  return (
    <div className="portal-shell">
      <button
        aria-label="Fechar menu"
        className={mobileMenuOpen ? "sidebar-backdrop open" : "sidebar-backdrop"}
        onClick={() => setMobileMenuOpen(false)}
        type="button"
      />
      <aside className={mobileMenuOpen ? "sidebar open" : "sidebar"}>
        <div className="sidebar-header">
          <button
            className="brand"
            onClick={() => {
              setActivePage("dashboard");
              setMobileMenuOpen(false);
            }}
            type="button"
          >
            <img src="/imagem/LogoApp.png" alt="" />
            <div>
              <strong>Portal Loja 62</strong>
              <span>{fieldLabel(user.permission)}</span>
            </div>
          </button>
          <button
            aria-label="Fechar menu"
            className="sidebar-close-button"
            onClick={() => setMobileMenuOpen(false)}
            title="Fechar menu"
            type="button"
          >
            <X size={20} />
          </button>
        </div>

        <nav>
          <span className="nav-title">Geral</span>
          {generalItems.map((item) => (
            <NavButton key={item.key} item={item} />
          ))}

          {hasLeaderAccess(user) && (
            <>
              <span className="nav-title">Líderes</span>
              {leaderItems.map((item) => (
                <NavButton key={item.key} item={item} />
              ))}
            </>
          )}

          {hasAdminAccess(user) && (
            <>
              <span className="nav-title">Admin</span>
              {adminItems.map((item) => (
                <NavButton key={item.key} item={item} />
              ))}
              <div className={`sidebar-sync-status ${syncStatus.mode}`} title={syncStatus.detail}>
                <Database size={17} />
                <span>
                  <strong>Status do sistema</strong>
                  {syncStatus.label}
                </span>
              </div>
            </>
          )}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <img className="topbar-logo" src="/imagem/LogoApp.png" alt="" />
            <span>Loja 62</span>
          </div>
          <div className="user-chip">
            <span>
              <strong>{user.name}</strong>
              {user.roleName} · {user.permission}
            </span>
            <button
              aria-expanded={mobileMenuOpen}
              aria-label="Abrir menu"
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen(true)}
              title="Abrir menu"
              type="button"
            >
              <MenuIcon size={21} />
            </button>
            <button type="button" onClick={onLogout} title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

function Dashboard({
  user,
  vacations,
  birthdays,
  menus,
  setActivePage,
}: {
  user: PortalUser;
  vacations: MonthlyBoard<VacationEntry>[];
  birthdays: MonthlyBoard<BirthdayEntry>[];
  menus: MenuMonth[];
  setActivePage: (page: PageKey) => void;
}) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const activeVacationCount = vacations
    .flatMap((board) => board.entries)
    .filter((entry) => entry.status === "Em férias").length;
  const monthBirthdayCount =
    birthdays.find((board) => board.month === currentMonth && board.year === currentYear)?.entries.length ?? 0;
  const monthMenuCount =
    menus.find((board) => board.month === currentMonth && board.year === currentYear)?.days.length ?? 0;

  const shortcuts: { page: PageKey; icon: ReactNode; title: string; text: string; permission?: Permission }[] = [
    {
      page: "vacations",
      icon: <CalendarRange />,
      title: "Férias mensais",
      text: "Veja saídas, retornos e observações por mês.",
    },
    {
      page: "birthdays",
      icon: <Cake />,
      title: "Aniversariantes",
      text: "Consulte quem comemora aniversário no mês.",
    },
    {
      page: "menu",
      icon: <Utensils />,
      title: "Cardápio",
      text: "Acompanhe o cardápio diário e meses importados.",
    },
    {
      page: "scale",
      icon: <ClipboardList />,
      title: "Escala 5x2",
      text: "Gere uma escala mensal com mínimos por período.",
      permission: "Lider",
    },
  ];

  return (
    <>
      <SectionHeader
        icon={<Home size={18} />}
        title={`Olá, ${user.name.split(" ")[0]}`}
        subtitle="Aqui está o resumo operacional do Portal Loja 62."
      />
      <div className="stats-grid">
        <StatCard icon={<CalendarRange size={22} />} label="pessoas em férias agora" value={`${activeVacationCount}`} />
        <StatCard icon={<Cake size={22} />} label="aniversários neste mês" value={`${monthBirthdayCount}`} tone="yellow" />
        <StatCard icon={<Utensils size={22} />} label="dias de cardápio no mês" value={`${monthMenuCount}`} tone="green" />
        <StatCard icon={<ShieldCheck size={22} />} label="nível de permissão" value={user.permission} tone="red" />
      </div>

      <section className="dashboard-grid">
        {shortcuts
          .filter((shortcut) => !shortcut.permission || hasLeaderAccess(user))
          .map((shortcut) => (
            <button key={shortcut.page} className="shortcut-card" type="button" onClick={() => setActivePage(shortcut.page)}>
              <span>{shortcut.icon}</span>
              <strong>{shortcut.title}</strong>
              <p>{shortcut.text}</p>
            </button>
          ))}
      </section>
    </>
  );
}

function BoardFilters({
  year,
  month,
  setYear,
  setMonth,
}: {
  year: number;
  month: number | "all";
  setYear: (value: number) => void;
  setMonth: (value: number | "all") => void;
}) {
  return (
    <div className="filters-bar">
      <label>
        Ano
        <input type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
      </label>
      <label>
        Mês
        <select
          value={month}
          onChange={(event) => setMonth(event.target.value === "all" ? "all" : Number(event.target.value))}
        >
          <option value="all">Todos</option>
          {months.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function VacationPage({
  boards,
  setBoards,
  editable,
}: {
  boards: MonthlyBoard<VacationEntry>[];
  setBoards: (value: MonthlyBoard<VacationEntry>[] | ((current: MonthlyBoard<VacationEntry>[]) => MonthlyBoard<VacationEntry>[])) => void;
  editable: boolean;
}) {
  const [year, setYear] = useState(getCurrentYear());
  const [month, setMonth] = useState<number | "all">("all");
  const [boardForm, setBoardForm] = useState({ year: getCurrentYear(), month: new Date().getMonth(), title: "", notes: "" });
  const [selectedBoardId, setSelectedBoardId] = useState(boards[0]?.id ?? "");
  const [vacationForm, setVacationForm] = useState<VacationForm>(emptyVacationForm);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);

  const filteredBoards = sortBoards(boards).filter((board) => board.year === year && (month === "all" || board.month === month));
  const selectedBoard = boards.find((board) => board.id === selectedBoardId) ?? boards[0];

  function saveBoard(event: FormEvent) {
    event.preventDefault();
    const title = boardForm.title.trim() || `${months[boardForm.month]} ${boardForm.year}`;
    if (editingBoardId) {
      setBoards((current) =>
        current.map((board) =>
          board.id === editingBoardId
            ? { ...board, year: boardForm.year, month: boardForm.month, title, notes: boardForm.notes }
            : board,
        ),
      );
      setEditingBoardId(null);
    } else {
      const id = makeId("vac-board");
      setBoards((current) => [...current, { id, year: boardForm.year, month: boardForm.month, title, notes: boardForm.notes, entries: [] }]);
      setSelectedBoardId(id);
    }
    setBoardForm({ year: getCurrentYear(), month: new Date().getMonth(), title: "", notes: "" });
  }

  function deleteBoard(id: string) {
    setBoards((current) => current.filter((board) => board.id !== id));
    if (selectedBoardId === id) setSelectedBoardId("");
  }

  function saveVacationEntry(event: FormEvent) {
    event.preventDefault();
    if (!selectedBoard) return;
    const payload: VacationEntry = {
      id: editingEntryId ?? makeId("vac-entry"),
      ...vacationForm,
      person: vacationForm.person.trim(),
      sector: vacationForm.sector.trim(),
      notes: vacationForm.notes.trim(),
    };
    if (!payload.person || !payload.startDate || !payload.endDate || !payload.returnDate) return;
    setBoards((current) =>
      current.map((board) => {
        if (board.id !== selectedBoard.id) return board;
        const entries = editingEntryId
          ? board.entries.map((entry) => (entry.id === editingEntryId ? payload : entry))
          : [...board.entries, payload];
        return { ...board, entries };
      }),
    );
    setVacationForm(emptyVacationForm);
    setEditingEntryId(null);
  }

  function editEntry(boardId: string, entry: VacationEntry) {
    setSelectedBoardId(boardId);
    setVacationForm({
      person: entry.person,
      sector: entry.sector,
      startDate: entry.startDate,
      endDate: entry.endDate,
      returnDate: entry.returnDate,
      status: entry.status,
      notes: entry.notes,
    });
    setEditingEntryId(entry.id);
  }

  function removeEntry(boardId: string, entryId: string) {
    setBoards((current) =>
      current.map((board) => (board.id === boardId ? { ...board, entries: board.entries.filter((entry) => entry.id !== entryId) } : board)),
    );
  }

  return (
    <>
      <SectionHeader
        icon={<CalendarRange size={18} />}
        title={editable ? "Admin Férias" : "Férias Mensais"}
        subtitle="Controle mês a mês quem saiu, quando saiu e quando volta."
      />
      <BoardFilters year={year} month={month} setYear={setYear} setMonth={setMonth} />

      {editable && (
        <div className="admin-layout">
          <form className="form-panel" onSubmit={saveBoard}>
            <h2>{editingBoardId ? "Editar box do mês" : "Criar box do mês"}</h2>
            <div className="form-grid">
              <label>
                Ano
                <input type="number" value={boardForm.year} onChange={(event) => setBoardForm({ ...boardForm, year: Number(event.target.value) })} />
              </label>
              <label>
                Mês
                <select value={boardForm.month} onChange={(event) => setBoardForm({ ...boardForm, month: Number(event.target.value) })}>
                  {months.map((name, index) => (
                    <option key={name} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Título do box
              <input value={boardForm.title} onChange={(event) => setBoardForm({ ...boardForm, title: event.target.value })} placeholder="Ex: Férias de Agosto" />
            </label>
            <label>
              Observações
              <textarea value={boardForm.notes} onChange={(event) => setBoardForm({ ...boardForm, notes: event.target.value })} />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                <Save size={17} /> Salvar box
              </button>
              {editingBoardId && (
                <button className="ghost-button" type="button" onClick={() => setEditingBoardId(null)}>
                  <X size={17} /> Cancelar
                </button>
              )}
            </div>
          </form>

          <form className="form-panel" onSubmit={saveVacationEntry}>
            <h2>{editingEntryId ? "Editar linha" : "Adicionar pessoa"}</h2>
            <label>
              Box do mês
              <select value={selectedBoard?.id ?? ""} onChange={(event) => setSelectedBoardId(event.target.value)}>
                {sortBoards(boards).map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.title} · {months[board.month]}/{board.year}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Nome
                <input value={vacationForm.person} onChange={(event) => setVacationForm({ ...vacationForm, person: event.target.value })} required />
              </label>
              <label>
                Setor
                <input value={vacationForm.sector} onChange={(event) => setVacationForm({ ...vacationForm, sector: event.target.value })} />
              </label>
            </div>
            <div className="form-grid three">
              <label>
                Saiu
                <input type="date" value={vacationForm.startDate} onChange={(event) => setVacationForm({ ...vacationForm, startDate: event.target.value })} required />
              </label>
              <label>
                Até
                <input type="date" value={vacationForm.endDate} onChange={(event) => setVacationForm({ ...vacationForm, endDate: event.target.value })} required />
              </label>
              <label>
                Volta
                <input type="date" value={vacationForm.returnDate} onChange={(event) => setVacationForm({ ...vacationForm, returnDate: event.target.value })} required />
              </label>
            </div>
            <label>
              Status
              <select value={vacationForm.status} onChange={(event) => setVacationForm({ ...vacationForm, status: event.target.value as VacationEntry["status"] })}>
                <option>Programado</option>
                <option>Em férias</option>
                <option>Retornou</option>
              </select>
            </label>
            <label>
              Observação
              <textarea value={vacationForm.notes} onChange={(event) => setVacationForm({ ...vacationForm, notes: event.target.value })} />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                <Plus size={17} /> {editingEntryId ? "Salvar alteração" : "Adicionar"}
              </button>
              {editingEntryId && (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingEntryId(null);
                    setVacationForm(emptyVacationForm);
                  }}
                >
                  <X size={17} /> Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="board-grid">
        {filteredBoards.length === 0 && <EmptyState text="Nenhum box lançado para o filtro escolhido." />}
        {filteredBoards.map((board) => (
          <section className="month-board" key={board.id}>
            <div className="month-board-header">
              <div>
                <span>{months[board.month]} · {board.year}</span>
                <h2>{board.title}</h2>
                {board.notes && <p>{board.notes}</p>}
              </div>
              {editable && (
                <div className="icon-actions">
                  <button
                    type="button"
                    title="Editar box"
                    onClick={() => {
                      setEditingBoardId(board.id);
                      setBoardForm({ year: board.year, month: board.month, title: board.title, notes: board.notes });
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button type="button" title="Excluir box" onClick={() => deleteBoard(board.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Setor</th>
                    <th>Saiu</th>
                    <th>Volta</th>
                    <th>Status</th>
                    {editable && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {board.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <strong>{entry.person}</strong>
                        {entry.notes && <small>{entry.notes}</small>}
                      </td>
                      <td>{entry.sector || "-"}</td>
                      <td>{formatDate(entry.startDate)} até {formatDate(entry.endDate)}</td>
                      <td>{formatDate(entry.returnDate)}</td>
                      <td>
                        <span className={`status-pill ${entry.status === "Em férias" ? "red" : entry.status === "Retornou" ? "green" : ""}`}>{entry.status}</span>
                      </td>
                      {editable && (
                        <td>
                          <div className="icon-actions">
                            <button type="button" onClick={() => editEntry(board.id, entry)} title="Editar">
                              <Pencil size={15} />
                            </button>
                            <button type="button" onClick={() => removeEntry(board.id, entry.id)} title="Excluir">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {board.entries.length === 0 && (
                    <tr>
                      <td colSpan={editable ? 6 : 5}>Nenhuma linha lançada neste box.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function BirthdayPage({
  boards,
  setBoards,
  editable,
}: {
  boards: MonthlyBoard<BirthdayEntry>[];
  setBoards: (value: MonthlyBoard<BirthdayEntry>[] | ((current: MonthlyBoard<BirthdayEntry>[]) => MonthlyBoard<BirthdayEntry>[])) => void;
  editable: boolean;
}) {
  const [year, setYear] = useState(getCurrentYear());
  const [month, setMonth] = useState<number | "all">("all");
  const [boardForm, setBoardForm] = useState({ year: getCurrentYear(), month: new Date().getMonth(), title: "", notes: "" });
  const [selectedBoardId, setSelectedBoardId] = useState(boards[0]?.id ?? "");
  const [birthdayForm, setBirthdayForm] = useState<BirthdayForm>(emptyBirthdayForm);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);

  const filteredBoards = sortBoards(boards).filter((board) => board.year === year && (month === "all" || board.month === month));
  const selectedBoard = boards.find((board) => board.id === selectedBoardId) ?? boards[0];

  function saveBoard(event: FormEvent) {
    event.preventDefault();
    const title = boardForm.title.trim() || `Aniversariantes de ${months[boardForm.month]}`;
    if (editingBoardId) {
      setBoards((current) =>
        current.map((board) =>
          board.id === editingBoardId ? { ...board, year: boardForm.year, month: boardForm.month, title, notes: boardForm.notes } : board,
        ),
      );
      setEditingBoardId(null);
    } else {
      const id = makeId("birth-board");
      setBoards((current) => [...current, { id, year: boardForm.year, month: boardForm.month, title, notes: boardForm.notes, entries: [] }]);
      setSelectedBoardId(id);
    }
    setBoardForm({ year: getCurrentYear(), month: new Date().getMonth(), title: "", notes: "" });
  }

  function saveBirthdayEntry(event: FormEvent) {
    event.preventDefault();
    if (!selectedBoard) return;
    const payload: BirthdayEntry = {
      id: editingEntryId ?? makeId("birth-entry"),
      ...birthdayForm,
      person: birthdayForm.person.trim(),
      sector: birthdayForm.sector.trim(),
      message: birthdayForm.message.trim(),
    };
    if (!payload.person || !payload.birthday) return;
    setBoards((current) =>
      current.map((board) => {
        if (board.id !== selectedBoard.id) return board;
        const entries = editingEntryId
          ? board.entries.map((entry) => (entry.id === editingEntryId ? payload : entry))
          : [...board.entries, payload];
        return { ...board, entries };
      }),
    );
    setBirthdayForm(emptyBirthdayForm);
    setEditingEntryId(null);
  }

  function editEntry(boardId: string, entry: BirthdayEntry) {
    setSelectedBoardId(boardId);
    setBirthdayForm({ person: entry.person, sector: entry.sector, birthday: entry.birthday, message: entry.message });
    setEditingEntryId(entry.id);
  }

  return (
    <>
      <SectionHeader
        icon={<Cake size={18} />}
        title={editable ? "Admin Aniversariantes" : "Aniversariantes Mensais"}
        subtitle="Boxes mensais com aniversariantes e mensagens da loja."
      />
      <BoardFilters year={year} month={month} setYear={setYear} setMonth={setMonth} />

      {editable && (
        <div className="admin-layout">
          <form className="form-panel" onSubmit={saveBoard}>
            <h2>{editingBoardId ? "Editar box" : "Criar box do mês"}</h2>
            <div className="form-grid">
              <label>
                Ano
                <input type="number" value={boardForm.year} onChange={(event) => setBoardForm({ ...boardForm, year: Number(event.target.value) })} />
              </label>
              <label>
                Mês
                <select value={boardForm.month} onChange={(event) => setBoardForm({ ...boardForm, month: Number(event.target.value) })}>
                  {months.map((name, index) => (
                    <option key={name} value={index}>{name}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Título
              <input value={boardForm.title} onChange={(event) => setBoardForm({ ...boardForm, title: event.target.value })} />
            </label>
            <label>
              Observações
              <textarea value={boardForm.notes} onChange={(event) => setBoardForm({ ...boardForm, notes: event.target.value })} />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                <Save size={17} /> Salvar box
              </button>
              {editingBoardId && (
                <button className="ghost-button" type="button" onClick={() => setEditingBoardId(null)}>
                  <X size={17} /> Cancelar
                </button>
              )}
            </div>
          </form>

          <form className="form-panel" onSubmit={saveBirthdayEntry}>
            <h2>{editingEntryId ? "Editar aniversariante" : "Adicionar aniversariante"}</h2>
            <label>
              Box do mês
              <select value={selectedBoard?.id ?? ""} onChange={(event) => setSelectedBoardId(event.target.value)}>
                {sortBoards(boards).map((board) => (
                  <option key={board.id} value={board.id}>{board.title} · {months[board.month]}/{board.year}</option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Nome
                <input value={birthdayForm.person} onChange={(event) => setBirthdayForm({ ...birthdayForm, person: event.target.value })} required />
              </label>
              <label>
                Setor
                <input value={birthdayForm.sector} onChange={(event) => setBirthdayForm({ ...birthdayForm, sector: event.target.value })} />
              </label>
            </div>
            <label>
              Data
              <input type="date" value={birthdayForm.birthday} onChange={(event) => setBirthdayForm({ ...birthdayForm, birthday: event.target.value })} required />
            </label>
            <label>
              Mensagem
              <textarea value={birthdayForm.message} onChange={(event) => setBirthdayForm({ ...birthdayForm, message: event.target.value })} />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                <Plus size={17} /> {editingEntryId ? "Salvar alteração" : "Adicionar"}
              </button>
              {editingEntryId && (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingEntryId(null);
                    setBirthdayForm(emptyBirthdayForm);
                  }}
                >
                  <X size={17} /> Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="board-grid">
        {filteredBoards.length === 0 && <EmptyState text="Nenhum box de aniversariantes encontrado." />}
        {filteredBoards.map((board) => (
          <section className="month-board birthday-board" key={board.id}>
            <div className="month-board-header">
              <div>
                <span>{months[board.month]} · {board.year}</span>
                <h2>{board.title}</h2>
                {board.notes && <p>{board.notes}</p>}
              </div>
              {editable && (
                <div className="icon-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBoardId(board.id);
                      setBoardForm({ year: board.year, month: board.month, title: board.title, notes: board.notes });
                    }}
                    title="Editar box"
                  >
                    <Pencil size={16} />
                  </button>
                  <button type="button" onClick={() => setBoards((current) => current.filter((item) => item.id !== board.id))} title="Excluir box">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="birthday-list">
              {board.entries
                .slice()
                .sort((a, b) => a.birthday.localeCompare(b.birthday))
                .map((entry) => (
                  <article className="birthday-item" key={entry.id}>
                    <div className="date-badge">
                      <strong>{new Date(`${entry.birthday}T12:00:00`).getDate()}</strong>
                      <span>{months[new Date(`${entry.birthday}T12:00:00`).getMonth()].slice(0, 3)}</span>
                    </div>
                    <div>
                      <h3>{entry.person}</h3>
                      <p>{entry.sector || "Setor não informado"}</p>
                      {entry.message && <small>{entry.message}</small>}
                    </div>
                    {editable && (
                      <div className="icon-actions">
                        <button type="button" onClick={() => editEntry(board.id, entry)} title="Editar">
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setBoards((current) =>
                              current.map((item) => (item.id === board.id ? { ...item, entries: item.entries.filter((row) => row.id !== entry.id) } : item)),
                            )
                          }
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              {board.entries.length === 0 && <EmptyState text="Nenhum aniversariante lançado neste box." />}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function MenuPage({
  menus,
  setMenus,
  editable,
}: {
  menus: MenuMonth[];
  setMenus: (value: MenuMonth[] | ((current: MenuMonth[]) => MenuMonth[])) => void;
  editable: boolean;
}) {
  const [year, setYear] = useState(getCurrentYear());
  const [month, setMonth] = useState<number | "all">("all");
  const [monthForm, setMonthForm] = useState({ year: getCurrentYear(), month: new Date().getMonth(), title: "", notes: "" });
  const [selectedMonthId, setSelectedMonthId] = useState(menus[0]?.id ?? "");
  const [dayForm, setDayForm] = useState<MenuDayForm>(emptyMenuDayForm);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState("");
  const [pdfText, setPdfText] = useState("");

  const filteredMenus = [...menus].sort((a, b) => b.year - a.year || b.month - a.month).filter((board) => board.year === year && (month === "all" || board.month === month));
  const selectedMenu = menus.find((board) => board.id === selectedMonthId) ?? menus[0];

  function saveMonth(event: FormEvent) {
    event.preventDefault();
    const id = makeId("menu-month");
    setMenus((current) => [
      ...current,
      {
        id,
        year: monthForm.year,
        month: monthForm.month,
        title: monthForm.title.trim() || `Cardápio ${months[monthForm.month]} ${monthForm.year}`,
        notes: monthForm.notes,
        days: [],
      },
    ]);
    setSelectedMonthId(id);
    setMonthForm({ year: getCurrentYear(), month: new Date().getMonth(), title: "", notes: "" });
  }

  function saveDay(event: FormEvent) {
    event.preventDefault();
    if (!selectedMenu || !dayForm.date) return;
    const payload: MenuDay = {
      id: editingDayId ?? makeId("menu-day"),
      date: dayForm.date,
      title: dayForm.title.trim() || new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(new Date(`${dayForm.date}T12:00:00`)),
      items: dayForm.itemsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      notes: dayForm.notes.trim(),
      source: "manual",
    };
    setMenus((current) =>
      current.map((board) => {
        if (board.id !== selectedMenu.id) return board;
        const days = editingDayId ? board.days.map((day) => (day.id === editingDayId ? payload : day)) : [...board.days, payload];
        return { ...board, days };
      }),
    );
    setDayForm(emptyMenuDayForm);
    setEditingDayId(null);
  }

  async function importPdf(file: File | undefined) {
    if (!file || !selectedMenu) return;
    setPdfStatus("Lendo PDF...");
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join("\n");
        pages.push(pageText);
      }
      const extracted = pages.join("\n");
      const importedDays = parseMenuTextToDays(extracted, selectedMenu.year, selectedMenu.month);
      setPdfText(extracted.slice(0, 2200));
      if (importedDays.length === 0) {
        setPdfStatus("PDF lido, mas não encontrei dias automaticamente. Use o texto extraído como referência para lançar manualmente.");
        return;
      }
      setMenus((current) =>
        current.map((board) => (board.id === selectedMenu.id ? { ...board, days: [...board.days, ...importedDays] } : board)),
      );
      setPdfStatus(`${importedDays.length} dia(s) importado(s) para ${selectedMenu.title}. Revise os boxes gerados.`);
    } catch (error) {
      setPdfStatus(`Não foi possível ler o PDF: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    }
  }

  return (
    <>
      <SectionHeader
        icon={<Utensils size={18} />}
        title={editable ? "Admin Cardápio" : "Cardápio"}
        subtitle="Cardápio diário por mês e ano, com importação automática de PDF."
      />
      <BoardFilters year={year} month={month} setYear={setYear} setMonth={setMonth} />

      {editable && (
        <div className="admin-layout">
          <form className="form-panel" onSubmit={saveMonth}>
            <h2>Criar mês de cardápio</h2>
            <div className="form-grid">
              <label>
                Ano
                <input type="number" value={monthForm.year} onChange={(event) => setMonthForm({ ...monthForm, year: Number(event.target.value) })} />
              </label>
              <label>
                Mês
                <select value={monthForm.month} onChange={(event) => setMonthForm({ ...monthForm, month: Number(event.target.value) })}>
                  {months.map((name, index) => (
                    <option key={name} value={index}>{name}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Título
              <input value={monthForm.title} onChange={(event) => setMonthForm({ ...monthForm, title: event.target.value })} />
            </label>
            <label>
              Observações
              <textarea value={monthForm.notes} onChange={(event) => setMonthForm({ ...monthForm, notes: event.target.value })} />
            </label>
            <button className="primary-button" type="submit">
              <Plus size={17} /> Criar mês
            </button>
          </form>

          <form className="form-panel" onSubmit={saveDay}>
            <h2>{editingDayId ? "Editar dia" : "Adicionar dia"}</h2>
            <label>
              Mês
              <select value={selectedMenu?.id ?? ""} onChange={(event) => setSelectedMonthId(event.target.value)}>
                {[...menus].sort((a, b) => b.year - a.year || b.month - a.month).map((board) => (
                  <option key={board.id} value={board.id}>{board.title} · {months[board.month]}/{board.year}</option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Data
                <input type="date" value={dayForm.date} onChange={(event) => setDayForm({ ...dayForm, date: event.target.value })} required />
              </label>
              <label>
                Título
                <input value={dayForm.title} onChange={(event) => setDayForm({ ...dayForm, title: event.target.value })} placeholder="Ex: Segunda-feira" />
              </label>
            </div>
            <label>
              Itens do cardápio
              <textarea value={dayForm.itemsText} onChange={(event) => setDayForm({ ...dayForm, itemsText: event.target.value })} placeholder={"Um item por linha\nArroz e feijão\nFrango assado"} />
            </label>
            <label>
              Observações
              <textarea value={dayForm.notes} onChange={(event) => setDayForm({ ...dayForm, notes: event.target.value })} />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                <Save size={17} /> Salvar dia
              </button>
              {editingDayId && (
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setEditingDayId(null);
                    setDayForm(emptyMenuDayForm);
                  }}
                >
                  <X size={17} /> Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="form-panel">
            <h2>Importar PDF com IA</h2>
            <p className="muted">Selecione um PDF mensal. O portal lê o texto e cria boxes de cada dia encontrado.</p>
            <label className="file-input">
              <Upload size={18} />
              Escolher PDF
              <input type="file" accept="application/pdf" onChange={(event) => importPdf(event.target.files?.[0])} />
            </label>
            {pdfStatus && <div className="notice">{pdfStatus}</div>}
            {pdfText && (
              <details>
                <summary>Texto extraído</summary>
                <pre>{pdfText}</pre>
              </details>
            )}
          </div>
        </div>
      )}

      <div className="board-grid menu-grid">
        {filteredMenus.length === 0 && <EmptyState text="Nenhum mês de cardápio encontrado." />}
        {filteredMenus.map((board) => (
          <section className="month-board" key={board.id}>
            <div className="month-board-header">
              <div>
                <span>{months[board.month]} · {board.year}</span>
                <h2>{board.title}</h2>
                {board.notes && <p>{board.notes}</p>}
              </div>
              {editable && (
                <div className="icon-actions">
                  <button type="button" onClick={() => setMenus((current) => current.filter((item) => item.id !== board.id))} title="Excluir mês">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="menu-days">
              {[...board.days]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((day) => (
                  <article className="menu-day" key={day.id}>
                    <header>
                      <div>
                        <strong>{formatDate(day.date)}</strong>
                        <span>{day.title}</span>
                      </div>
                      <span className={`status-pill ${day.source === "pdf" ? "yellow" : ""}`}>{day.source === "pdf" ? "PDF" : "Manual"}</span>
                    </header>
                    <ul>
                      {day.items.map((item) => (
                        <li key={`${day.id}-${item}`}>{item}</li>
                      ))}
                    </ul>
                    {day.notes && <p>{day.notes}</p>}
                    {editable && (
                      <div className="icon-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMonthId(board.id);
                            setEditingDayId(day.id);
                            setDayForm({ date: day.date, title: day.title, itemsText: day.items.join("\n"), notes: day.notes });
                          }}
                          title="Editar dia"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setMenus((current) =>
                              current.map((item) => (item.id === board.id ? { ...item, days: item.days.filter((row) => row.id !== day.id) } : item)),
                            )
                          }
                          title="Excluir dia"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              {board.days.length === 0 && <EmptyState text="Nenhum dia lançado neste mês." />}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function maskCurrency(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return (Number(digits) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PosterOrderTool() {
  const [orders, setOrders] = useState<PosterOrder[]>([]);
  const [form, setForm] = useState<Omit<PosterOrder, "id">>({
    code: "",
    price: "",
    size: "A4",
    offer: false,
    dePrice: "",
    savePrice: "",
    cardPrice: "",
    packRule: "",
  });

  function addOrder(event: FormEvent) {
    event.preventDefault();
    if (!form.code.trim() || !form.price.trim()) return;
    setOrders((current) => [...current, { id: makeId("poster"), ...form }]);
    setForm((current) => ({
      ...current,
      code: "",
      price: "",
      dePrice: "",
      savePrice: "",
      cardPrice: "",
      packRule: "",
    }));
  }

  function orderConditions(order: PosterOrder) {
    const conditions = [order.offer ? "OFERTA" : "NORMAL"];
    if (order.dePrice) conditions.push(`De: R$ ${order.dePrice}`);
    if (order.savePrice) conditions.push(`Saveganhe: R$ ${order.savePrice}`);
    if (order.cardPrice) conditions.push(`Cartão: R$ ${order.cardPrice}`);
    if (order.packRule) conditions.push(`Pack: ${order.packRule}`);
    return conditions;
  }

  function generateOrdersPdf() {
    if (!orders.length) return;
    const doc = new jsPDF();
    doc.setFillColor(9, 33, 61);
    doc.rect(0, 0, 210, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text("RELAÇÃO DE PEDIDOS DE CARTAZES - LOJA 62", 105, 19, { align: "center" });
    autoTable(doc, {
      startY: 36,
      head: [["Código", "Tamanho", "Preço base", "Informações adicionais"]],
      body: orders.map((order) => [
        order.code,
        order.size,
        `R$ ${order.price}`,
        orderConditions(order).join("\n"),
      ]),
      headStyles: { fillColor: [179, 32, 43] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 3: { cellWidth: 80 } },
    });
    doc.save(`Pedidos_Cartazes_L62_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="cartazista-workspace">
      <form className="form-panel" onSubmit={addOrder}>
        <h2>Novo pedido de cartaz</h2>
        <div className="form-grid three">
          <label>
            Código redutor
            <input
              inputMode="numeric"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, "") })}
              placeholder="00000"
              required
            />
          </label>
          <label>
            Preço cheio
            <input
              inputMode="decimal"
              value={form.price}
              onChange={(event) => setForm({ ...form, price: maskCurrency(event.target.value) })}
              placeholder="0,00"
              required
            />
          </label>
          <label>
            Tamanho
            <select value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })}>
              {['A6', 'A5', 'A4', 'A3', 'Faixa', 'Faixa Reduzida', 'P.A.S.', 'P.A.S.H.'].map((size) => (
                <option key={size}>{size}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="poster-options">
          <label className="check-control">
            <input type="checkbox" checked={form.offer} onChange={(event) => setForm({ ...form, offer: event.target.checked })} />
            Em oferta
          </label>
          <label>
            Preço DE
            <input value={form.dePrice} onChange={(event) => setForm({ ...form, dePrice: maskCurrency(event.target.value) })} placeholder="Opcional" />
          </label>
          <label>
            Saveganhe
            <input value={form.savePrice} onChange={(event) => setForm({ ...form, savePrice: maskCurrency(event.target.value) })} placeholder="Opcional" />
          </label>
          <label>
            Cartão
            <input value={form.cardPrice} onChange={(event) => setForm({ ...form, cardPrice: maskCurrency(event.target.value) })} placeholder="Opcional" />
          </label>
          <label>
            Regra Pack
            <input value={form.packRule} onChange={(event) => setForm({ ...form, packRule: event.target.value })} placeholder="Ex: Leve 3, pague 2" />
          </label>
        </div>
        <button className="primary-button" type="submit">
          <Plus size={17} /> Adicionar à lista
        </button>
      </form>

      <section className="month-board">
        <div className="month-board-header">
          <div>
            <span>Pedido de Cartaz</span>
            <h2>Itens para o CPD</h2>
            <p>{orders.length} item(ns) preparado(s).</p>
          </div>
          <button className="primary-button" type="button" onClick={generateOrdersPdf} disabled={!orders.length}>
            <FileText size={17} /> Gerar PDF
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Tamanho</th>
                <th>Preço</th>
                <th>Condições</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><strong>{order.code}</strong></td>
                  <td>{order.size}</td>
                  <td>R$ {order.price}</td>
                  <td>{orderConditions(order).join(" · ")}</td>
                  <td>
                    <div className="icon-actions">
                      <button type="button" title="Excluir" onClick={() => setOrders((current) => current.filter((item) => item.id !== order.id))}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!orders.length && (
                <tr><td colSpan={5}>Adicione itens para preparar o pedido.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CartazistaNotes({ note, onSave }: { note: string; onSave: (note: string) => void }) {
  const [draft, setDraft] = useState(note);
  const [saved, setSaved] = useState(false);

  return (
    <section className="form-panel cartazista-notes">
      <h2>Minhas anotações</h2>
      <textarea
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setSaved(false);
        }}
        placeholder="Digite suas anotações do dia..."
      />
      <div className="form-actions">
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            onSave(draft);
            setSaved(true);
          }}
        >
          <Save size={17} /> Salvar anotações
        </button>
        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            setDraft("");
            onSave("");
            setSaved(true);
          }}
        >
          <Trash2 size={17} /> Limpar
        </button>
        {saved && <span className="saved-note">Salvo no portal.</span>}
      </div>
    </section>
  );
}

function CartazistaPage({
  setActivePage,
  note,
  onSaveNote,
}: {
  setActivePage: (page: PageKey) => void;
  note: string;
  onSaveNote: (note: string) => void;
}) {
  const [tab, setTab] = useState<"tools" | "orders" | "notes">("tools");
  const externalTools = [
    { title: "Smarket", href: "https://savegnago.smarketsolutions.com.br/login", icon: <Palette size={21} /> },
    { title: "Apex", href: "https://apex.savegnago.com.br/apex/f?p=107:login::::::", icon: <ExternalLink size={21} /> },
    { title: "Portal Savegnago", href: "https://portal.savegnago.com.br", icon: <Home size={21} /> },
    { title: "DTFaceum", href: "https://dtfaceum.com/gruposavegnago", icon: <UserCog size={21} /> },
    { title: "Adobe", href: "https://www.adobe.com/home", icon: <FileText size={21} /> },
    { title: "Portal do Colaborador", href: "https://portaldocolaborador.savegnago.com.br/portal/01/ISPortalColaborador", icon: <ExternalLink size={21} /> },
  ];

  return (
    <>
      <SectionHeader
        icon={<Palette size={18} />}
        title="Portal do Cartazista"
        subtitle="Ferramentas de cartazeamento integradas ao Portal Loja 62."
      />
      <div className="segmented cartazista-tabs">
        <button className={tab === "tools" ? "active" : ""} type="button" onClick={() => setTab("tools")}>Ferramentas</button>
        <button className={tab === "orders" ? "active" : ""} type="button" onClick={() => setTab("orders")}>Pedido de Cartaz</button>
        <button className={tab === "notes" ? "active" : ""} type="button" onClick={() => setTab("notes")}>Anotações</button>
      </div>

      {tab === "tools" && (
        <section className="cartazista-tools-grid">
          <button className="cartazista-tool" type="button" onClick={() => setTab("orders")}>
            <ClipboardList size={23} />
            <strong>Pedido de Cartaz</strong>
            <span>Montar lista e gerar PDF.</span>
          </button>
          <button className="cartazista-tool" type="button" onClick={() => setActivePage("calculators")}>
            <Calculator size={23} />
            <strong>Calculadora de Ponto</strong>
            <span>Jornadas 7h20 e 8h48.</span>
          </button>
          <button className="cartazista-tool" type="button" onClick={() => setTab("notes")}>
            <NotebookPen size={23} />
            <strong>Bloco de Anotações</strong>
            <span>Anotações salvas no portal.</span>
          </button>
          {externalTools.map((tool) => (
            <a className="cartazista-tool" href={tool.href} key={tool.title} target="_blank" rel="noreferrer">
              {tool.icon}
              <strong>{tool.title}</strong>
              <span>Abrir sistema oficial.</span>
            </a>
          ))}
        </section>
      )}
      {tab === "orders" && <PosterOrderTool />}
      {tab === "notes" && <CartazistaNotes note={note} onSave={onSaveNote} />}

      <a className="source-reference" href="https://github.com/vinivp/Portal-do-Cartazista" target="_blank" rel="noreferrer">
        <ExternalLink size={15} /> Projeto original Portal do Cartazista
      </a>
    </>
  );
}

function CalculatorsPage() {
  const [mode, setMode] = useState<"7h20" | "8h48">("8h48");
  const targetMinutes = mode === "7h20" ? 440 : 528;

  return (
    <>
      <SectionHeader
        icon={<Calculator size={18} />}
        title="Calculadoras de Ponto"
        subtitle="Calcule saída, retorno do almoço e descanso mínimo nas jornadas de 7h20 ou 8h48."
      />
      <div className="segmented">
        <button className={mode === "7h20" ? "active" : ""} type="button" onClick={() => setMode("7h20")}>
          7h20m
        </button>
        <button className={mode === "8h48" ? "active" : ""} type="button" onClick={() => setMode("8h48")}>
          8h48m
        </button>
      </div>
      <PointCalculator key={mode} targetMinutes={targetMinutes} title={`Calculadora ${mode}`} />
    </>
  );
}

function PointCalculator({ targetMinutes, title }: { targetMinutes: number; title: string }) {
  const [entry, setEntry] = useState("08:00");
  const [lunchOut, setLunchOut] = useState("12:00");
  const [lunchMinutes, setLunchMinutes] = useState(70);

  const result = useMemo<
    | { kind: "error"; message: string }
    | { kind: "ok"; lunchReturn: string; finalOut: string; nextAllowed: string; worked: string }
    | null
  >(() => {
    const entryMinutes = toMinutes(entry);
    const lunchOutMinutes = toMinutes(lunchOut);
    const workedBeforeLunch = lunchOutMinutes - entryMinutes;
    if (!entry || !lunchOut) return null;
    if (workedBeforeLunch < 120) return { kind: "error", message: "Bloqueado: almoço antes de 2h de trabalho." };
    if (workedBeforeLunch > 360) return { kind: "error", message: "Bloqueado: máximo de 6h antes do almoço excedido." };
    const lunchReturn = lunchOutMinutes + lunchMinutes;
    const remaining = targetMinutes - workedBeforeLunch;
    const finalOut = lunchReturn + remaining;
    const nextAllowed = finalOut + 660;
    return {
      kind: "ok",
      lunchReturn: fromMinutes(lunchReturn),
      finalOut: fromMinutes(finalOut),
      nextAllowed: fromMinutes(nextAllowed),
      worked: `${Math.floor(targetMinutes / 60)}h${String(targetMinutes % 60).padStart(2, "0")}m`,
    };
  }, [entry, lunchOut, lunchMinutes, targetMinutes]);

  return (
    <section className="calculator-panel">
      <form className="form-panel">
        <h2>{title}</h2>
        <div className="form-grid three">
          <label>
            Entrada
            <input type="time" value={entry} onChange={(event) => setEntry(event.target.value)} />
          </label>
          <label>
            Saída almoço
            <input type="time" value={lunchOut} onChange={(event) => setLunchOut(event.target.value)} />
          </label>
          <label>
            Tempo de almoço
            <select value={lunchMinutes} onChange={(event) => setLunchMinutes(Number(event.target.value))}>
              <option value={60}>1h00</option>
              <option value={70}>1h10</option>
              <option value={80}>1h20</option>
              <option value={90}>1h30</option>
            </select>
          </label>
        </div>
      </form>
      <div className="result-panel">
        {result?.kind === "error" ? (
          <div className="danger-box">
            <AlertTriangle size={20} />
            {result.message}
          </div>
        ) : result?.kind === "ok" ? (
          <>
            <div className="success-box">
              <CheckCircle2 size={20} /> Horários dentro das normas
            </div>
            <div className="result-grid">
              <StatCard icon={<Clock />} label="retorno do almoço" value={result.lunchReturn} tone="green" />
              <StatCard icon={<Clock />} label="hora de ir embora" value={result.finalOut} tone="red" />
              <StatCard icon={<RotateCcw />} label="próximo turno permitido" value={result.nextAllowed} tone="yellow" />
              <StatCard icon={<BriefcaseBusiness />} label="jornada calculada" value={result.worked} />
            </div>
          </>
        ) : (
          <EmptyState text="Preencha os horários para calcular." />
        )}
      </div>
    </section>
  );
}

function ApexPage() {
  return (
    <>
      <SectionHeader icon={<ExternalLink size={18} />} title="Apex" subtitle="Atalho do portal dos líderes para o sistema oficial." />
      <section className="external-panel">
        <img src="/imagem/Logo_Nome.png" alt="" />
        <div>
          <h2>Acessar Apex Savegnago</h2>
          <p>O botão abre o endereço oficial em uma nova aba do navegador.</p>
        </div>
        <a className="primary-button" href="https://apex.savegnago.com.br/apex/f?p=107:login::::::" target="_blank" rel="noreferrer">
          <ExternalLink size={18} /> Abrir Apex
        </a>
      </section>
    </>
  );
}

function ScaleGeneratorPage({ users }: { users: PortalUser[] }) {
  const candidates = users.filter((user) => user.roleName === "Colaborador" || user.roleName === "Lider");
  const [year, setYear] = useState(getCurrentYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [quantity, setQuantity] = useState(Math.min(6, candidates.length));
  const [minimums, setMinimums] = useState({ morning: 2, afternoon: 2, night: 1 });
  const [objections, setObjections] = useState("Ana Paula: 10, 11\nBruno Souza: 3, 18");
  const [rows, setRows] = useState<ScheduleRow[]>([]);

  const selectedPeople = candidates.slice(0, quantity);

  function generate(event: FormEvent) {
    event.preventDefault();
    setRows(generateSchedule(selectedPeople, year, month, minimums, objections));
  }

  return (
    <>
      <SectionHeader
        icon={<ClipboardList size={18} />}
        title="Gerador de Escala 5x2"
        subtitle="Monte uma escala mensal com colaboradores, mínimos por período e objeções por dia."
      />
      <form className="form-panel scale-form" onSubmit={generate}>
        <div className="form-grid three">
          <label>
            Mês
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {months.map((name, index) => (
                <option key={name} value={index}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Ano
            <input type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
          </label>
          <label>
            Quantidade de colaboradores
            <input min={1} max={candidates.length} type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          </label>
        </div>
        <div className="form-grid three">
          <label>
            Mínimo manhã
            <input type="number" min={0} value={minimums.morning} onChange={(event) => setMinimums({ ...minimums, morning: Number(event.target.value) })} />
          </label>
          <label>
            Mínimo tarde
            <input type="number" min={0} value={minimums.afternoon} onChange={(event) => setMinimums({ ...minimums, afternoon: Number(event.target.value) })} />
          </label>
          <label>
            Mínimo noite
            <input type="number" min={0} value={minimums.night} onChange={(event) => setMinimums({ ...minimums, night: Number(event.target.value) })} />
          </label>
        </div>
        <label>
          Objeções
          <textarea value={objections} onChange={(event) => setObjections(event.target.value)} placeholder="Nome: 5, 12, 27" />
        </label>
        <div className="selected-people">
          {selectedPeople.map((person) => (
            <span key={person.id}>{person.name} · {person.shift}</span>
          ))}
        </div>
        <button className="primary-button" type="submit">
          <ClipboardList size={17} /> Gerar escala
        </button>
      </form>

      {rows.length > 0 && (
        <section className="month-board">
          <div className="month-board-header">
            <div>
              <span>{months[month]} · {year}</span>
              <h2>Escala mensal 5x2</h2>
              <p>{selectedPeople.length} colaboradores considerados.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Manhã</th>
                  <th>Tarde</th>
                  <th>Noite</th>
                  <th>Folga</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date}>
                    <td><strong>{row.day}</strong> {row.weekday}</td>
                    <td>{row.morning.join(", ") || "-"}</td>
                    <td>{row.afternoon.join(", ") || "-"}</td>
                    <td>{row.night.join(", ") || "-"}</td>
                    <td>{row.off.join(", ") || "-"}</td>
                    <td>{row.warning ? <span className="status-pill red">{row.warning}</span> : <span className="status-pill green">Coberto</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function UsersAdminPage({
  users,
  setUsers,
}: {
  users: PortalUser[];
  setUsers: (value: PortalUser[] | ((current: PortalUser[]) => PortalUser[])) => void;
}) {
  const [form, setForm] = useState<Omit<PortalUser, "id">>({
    name: "",
    email: "",
    password: "1234",
    roleName: "Colaborador",
    permission: "Usuário",
    sector: "",
    shift: "Tarde",
    loginEnabled: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredUsers = users.filter((user) => `${user.name} ${user.email} ${user.sector}`.toLowerCase().includes(query.toLowerCase()));

  function saveUser(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    if (editingId) {
      setUsers((current) => current.map((user) => (user.id === editingId ? { id: editingId, ...form } : user)));
      setEditingId(null);
    } else {
      setUsers((current) => [...current, { id: makeId("user"), ...form }]);
    }
    setForm({ name: "", email: "", password: "1234", roleName: "Colaborador", permission: "Usuário", sector: "", shift: "Tarde", loginEnabled: false });
  }

  return (
    <>
      <SectionHeader icon={<UserCog size={18} />} title="Admin Usuários" subtitle="Gerencie os quatro acessos gerais e os colaboradores internos." />
      <div className="admin-layout">
        <form className="form-panel" onSubmit={saveUser}>
          <h2>{editingId ? "Editar usuário" : "Adicionar usuário"}</h2>
          <div className="form-grid">
            <label>
              Nome
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
          </div>
          <div className="form-grid three">
            <label>
              Cargo
              <select value={form.roleName} onChange={(event) => setForm({ ...form, roleName: event.target.value as RoleName })}>
                <option>Desenvolvedor</option>
                <option>Gerente</option>
                <option>Lider</option>
                <option>Colaborador</option>
              </select>
            </label>
            <label>
              Permissão
              <select value={form.permission} onChange={(event) => setForm({ ...form, permission: event.target.value as Permission })}>
                <option>Admin</option>
                <option>Lider</option>
                <option>Usuário</option>
              </select>
            </label>
            <label>
              Turno
              <select value={form.shift} onChange={(event) => setForm({ ...form, shift: event.target.value as PortalUser["shift"] })}>
                <option>Manhã</option>
                <option>Tarde</option>
                <option>Noite</option>
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>
              Setor
              <input value={form.sector} onChange={(event) => setForm({ ...form, sector: event.target.value })} />
            </label>
            <label>
              Tipo de cadastro
              <input value={form.loginEnabled ? "Login geral" : "Colaborador interno"} readOnly />
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              <Save size={17} /> Salvar usuário
            </button>
            {editingId && (
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm({ name: "", email: "", password: "1234", roleName: "Colaborador", permission: "Usuário", sector: "", shift: "Tarde", loginEnabled: false });
                }}
              >
                <X size={17} /> Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="filters-bar">
        <label>
          Buscar
          <span className="input-with-icon">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, email ou setor" />
          </span>
        </label>
      </div>

      <section className="month-board">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Permissão</th>
                <th>Setor</th>
                <th>Turno</th>
                <th>Login</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <small>{user.email}</small>
                  </td>
                  <td>{user.roleName}</td>
                  <td><span className={`status-pill ${user.permission === "Admin" ? "red" : user.permission === "Lider" ? "yellow" : "green"}`}>{user.permission}</span></td>
                  <td>{user.sector || "-"}</td>
                  <td>{user.shift}</td>
                  <td><span className={`status-pill ${user.loginEnabled ? "green" : ""}`}>{user.loginEnabled ? "Geral" : "Interno"}</span></td>
                  <td>
                    <div className="icon-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(user.id);
                          setForm({
                            name: user.name,
                            email: user.email,
                            password: user.password,
                            roleName: user.roleName,
                            permission: user.permission,
                            sector: user.sector,
                            shift: user.shift,
                            loginEnabled: user.loginEnabled,
                          });
                        }}
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button type="button" onClick={() => setUsers((current) => current.filter((item) => item.id !== user.id))} title="Excluir">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function App() {
  const firebaseSession = useFirebaseSession();
  const firebaseDataSession = firebaseSession.email
    ? `${firebaseSession.email}:${firebaseSession.revision}`
    : null;
  const { data, setPortalData, syncStatus, remoteReady, syncError } = usePortalData(firebaseDataSession);
  const { users, vacations, birthdays, menus, cartazistaNotes } = data;
  const [currentUser, setCurrentUser] = usePersistentState<PortalUser | null>("portal-loja62-current-user", null);
  const [activePage, setActivePage] = useState<PageKey>("dashboard");

  const setUsers = (value: StateUpdate<PortalUser[]>) =>
    setPortalData((current) => ({
      ...current,
      users: resolveStateUpdate(value, current.users),
    }));

  const setVacations = (value: StateUpdate<MonthlyBoard<VacationEntry>[]>) =>
    setPortalData((current) => ({
      ...current,
      vacations: resolveStateUpdate(value, current.vacations),
    }));

  const setBirthdays = (value: StateUpdate<MonthlyBoard<BirthdayEntry>[]>) =>
    setPortalData((current) => ({
      ...current,
      birthdays: resolveStateUpdate(value, current.birthdays),
    }));

  const setMenus = (value: StateUpdate<MenuMonth[]>) =>
    setPortalData((current) => ({
      ...current,
      menus: resolveStateUpdate(value, current.menus),
    }));

  const setCartazistaNote = (userId: string, note: string) =>
    setPortalData((current) => ({
      ...current,
      cartazistaNotes: { ...current.cartazistaNotes, [userId]: note },
    }));

  const user = isFirebaseAuthEnabled
    ? users.find((item) => item.loginEnabled && item.email.toLowerCase() === firebaseSession.email) ?? null
    : currentUser
      ? users.find(
          (item) =>
            item.loginEnabled &&
            (item.id === currentUser.id ||
              item.email.toLowerCase() === currentUser.email.toLowerCase()),
        ) ?? null
      : null;

  if (!user) {
    return (
      <LoginScreen
        users={users}
        firebaseAuthEnabled={isFirebaseAuthEnabled}
        onLogin={async ({ email, password, user: matchedUser }) => {
          if (isFirebaseAuthEnabled) {
            await signInFirebaseUser(email, password);
          }
          setCurrentUser(matchedUser);
        }}
      />
    );
  }

  if (!remoteReady) {
    return <PortalSyncScreen error={syncError} />;
  }

  const guardedSetPage = (page: PageKey) => {
    const leaderPage = page === "apex" || page === "scale";
    const adminPage = page.startsWith("admin-");
    if (leaderPage && !hasLeaderAccess(user)) return;
    if (adminPage && !hasAdminAccess(user)) return;
    setActivePage(page);
  };

  const pages: Record<PageKey, ReactNode> = {
    dashboard: <Dashboard user={user} vacations={vacations} birthdays={birthdays} menus={menus} setActivePage={guardedSetPage} />,
    cartazista: (
      <CartazistaPage
        setActivePage={guardedSetPage}
        note={cartazistaNotes[user.id] ?? ""}
        onSaveNote={(note) => setCartazistaNote(user.id, note)}
      />
    ),
    vacations: <VacationPage boards={vacations} setBoards={setVacations} editable={false} />,
    birthdays: <BirthdayPage boards={birthdays} setBoards={setBirthdays} editable={false} />,
    menu: <MenuPage menus={menus} setMenus={setMenus} editable={false} />,
    calculators: <CalculatorsPage />,
    apex: hasLeaderAccess(user) ? <ApexPage /> : <Dashboard user={user} vacations={vacations} birthdays={birthdays} menus={menus} setActivePage={guardedSetPage} />,
    scale: hasLeaderAccess(user) ? <ScaleGeneratorPage users={users} /> : <Dashboard user={user} vacations={vacations} birthdays={birthdays} menus={menus} setActivePage={guardedSetPage} />,
    "admin-vacations": hasAdminAccess(user) ? <VacationPage boards={vacations} setBoards={setVacations} editable /> : null,
    "admin-birthdays": hasAdminAccess(user) ? <BirthdayPage boards={birthdays} setBoards={setBirthdays} editable /> : null,
    "admin-menu": hasAdminAccess(user) ? <MenuPage menus={menus} setMenus={setMenus} editable /> : null,
    "admin-users": hasAdminAccess(user) ? <UsersAdminPage users={users} setUsers={setUsers} /> : null,
  };

  return (
    <PortalShell
      user={user}
      activePage={activePage}
      setActivePage={guardedSetPage}
      syncStatus={syncStatus}
      onLogout={() => {
        signOutFirebaseUser().catch(() => undefined);
        setCurrentUser(null);
        setActivePage("dashboard");
      }}
    >
      {pages[activePage]}
    </PortalShell>
  );
}

export default App;
