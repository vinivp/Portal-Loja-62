export type PdfTextItem = {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
};

export type ParsedPdfMenuDay = {
  date: string;
  title: string;
  items: string[];
};

export type ParsedPdfMenu = {
  year: number;
  month: number;
  days: ParsedPdfMenuDay[];
  preview: string;
};

export const PDF_MENU_ITEMS_PER_DAY = 9;

function toISODate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatMenuWeekday(date: string) {
  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(
    new Date(`${date}T12:00:00`),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const menuAbbreviationRules: Array<[RegExp, string]> = [
  [/\bc\s*\/\s*/giu, "com "],
  [/\bs\s*\/\s*/giu, "sem "],
  [/\bp\s*\/\s*/giu, "para "],
  [/\bbco\b/giu, "branco"],
  [/\btom\b/giu, "tomate"],
  [/\brech\b/giu, "recheado"],
];

function expandMenuAbbreviations(value: string) {
  return menuAbbreviationRules.reduce(
    (expanded, [pattern, replacement]) => expanded.replace(pattern, replacement),
    value,
  );
}

export function formatMenuItemCase(value: string) {
  const normalized = expandMenuAbbreviations(value)
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
  if (!normalized) return "";
  return normalized.charAt(0).toLocaleUpperCase("pt-BR") + normalized.slice(1);
}

function normalizePdfMenuItem(value: string) {
  const normalized = value
    .replace(/^[|:;•·\-–—]+|[|:;•·\-–—]+$/g, "")
    .replace(/\s+\d{3,}(?:\s+\d{3,})*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return formatMenuItemCase(normalized);
}

function isPdfMenuNoise(value: string) {
  if (!value || !/[A-Za-zÀ-ÿ]/.test(value)) return true;
  if (/^\d[\d\s.,/-]*$/.test(value)) return true;
  return /^(?:p[aá]gina|card[aá]pio|data|dia|c[oó]d(?:igo)?|qtd|quantidade|total|unidade|loja|filial|refei[cç][aã]o)\b/i.test(
    value,
  );
}

function parsePdfMenuLines(
  lines: string[],
  fallbackYear: number,
  fallbackMonth: number,
) {
  const parsedByDate = new Map<string, ParsedPdfMenuDay>();
  let activeDay: ParsedPdfMenuDay | null = null;

  const activateDate = (year: number, month: number, day: number) => {
    const candidate = new Date(year, month, day, 12);
    if (
      candidate.getFullYear() !== year ||
      candidate.getMonth() !== month ||
      candidate.getDate() !== day
    ) {
      return null;
    }

    const date = toISODate(year, month, day);
    const current = parsedByDate.get(date) ?? {
      date,
      title: formatMenuWeekday(date),
      items: [],
    };
    parsedByDate.set(date, current);
    activeDay = current;
    return current;
  };

  const addItem = (rawValue: string) => {
    if (!activeDay) return;
    const item = normalizePdfMenuItem(rawValue);
    if (isPdfMenuNoise(item)) return;
    activeDay.items.push(item);
  };

  for (const rawLine of lines) {
    const parts = rawLine
      .replace(/\r/g, " ")
      .split(/\s+\|\s+|\t+/)
      .map((part) => part.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    for (const part of parts) {
      const dateMatch = part.match(
        /(?:^|\s)(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2,4})(?=\s|$)/,
      );

      if (dateMatch) {
        const detectedYear = Number(
          dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3],
        );
        const detectedMonth = Number(dateMatch[2]) - 1;
        const detectedDay = Number(dateMatch[1]);
        const detected = activateDate(detectedYear, detectedMonth, detectedDay);
        if (detected) {
          addItem(part.replace(dateMatch[0], " "));
          continue;
        }
      }

      const explicitDayMatch =
        part.match(/^(?:dia\s+)(\d{1,2})\b\s*[-:]?\s*(.*)$/i) ??
        part.match(/^(\d{1,2})\s*[-:]\s*(?=[A-Za-zÀ-ÿ])(.*)$/);

      if (explicitDayMatch) {
        const detected = activateDate(
          fallbackYear,
          fallbackMonth,
          Number(explicitDayMatch[1]),
        );
        if (detected) addItem(explicitDayMatch[2]);
        continue;
      }

      addItem(part);
    }
  }

  return [...parsedByDate.values()].filter((day) => day.items.length > 0);
}

export function buildPdfTextLayouts(items: PdfTextItem[]) {
  const readingOrder = items.map((item) => item.str.trim()).filter(Boolean);
  const flowLines: string[] = [];
  let flowBuffer: string[] = [];

  for (const item of items) {
    const value = item.str.trim();
    if (value) flowBuffer.push(value);
    if (item.hasEOL && flowBuffer.length) {
      flowLines.push(flowBuffer.join(" "));
      flowBuffer = [];
    }
  }
  if (flowBuffer.length) flowLines.push(flowBuffer.join(" "));

  const rows: Array<{ y: number; parts: Array<{ x: number; value: string }> }> = [];
  for (const item of items) {
    const value = item.str.trim();
    const x = item.transform?.[4];
    const y = item.transform?.[5];
    if (!value || typeof x !== "number" || typeof y !== "number") continue;
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= 2);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, value });
  }

  const visualRows = rows
    .sort((a, b) => b.y - a.y)
    .map((row) =>
      row.parts
        .sort((a, b) => a.x - b.x)
        .map((part) => part.value)
        .join(" | "),
    );

  return [readingOrder, flowLines, visualRows];
}

export function parseMenuPdfLayouts(
  layouts: string[][],
  fallbackYear: number,
  fallbackMonth: number,
): ParsedPdfMenu | null {
  const candidates = layouts
    .map((lines) => {
      const allDays = parsePdfMenuLines(lines, fallbackYear, fallbackMonth);
      const monthCounts = new Map<string, number>();
      for (const day of allDays) {
        const monthKey = day.date.slice(0, 7);
        monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1);
      }
      const dominantMonth = [...monthCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      const days = dominantMonth
        ? allDays
            .filter((day) => day.date.startsWith(dominantMonth))
            .sort((a, b) => a.date.localeCompare(b.date))
        : [];
      const score = days.reduce(
        (total, day) => total + 100 + Math.min(day.items.length, PDF_MENU_ITEMS_PER_DAY) * 4,
        0,
      );
      return { lines, days, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  if (!best?.days.length) return null;
  const [year, calendarMonth] = best.days[0].date.split("-").map(Number);
  return {
    year,
    month: calendarMonth - 1,
    days: best.days,
    preview: best.lines.join("\n").slice(0, 4000),
  };
}
