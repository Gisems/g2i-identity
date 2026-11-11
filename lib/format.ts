export const money = (n: number | null | undefined, currency = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(Number(n ?? 0));

// Una fecha "YYYY-MM-DD" (columna `date`) se parsea como medianoche UTC; formatearla en Lima la
// movería al día anterior. Para esas fechas se formatea en UTC; los timestamps siguen en Lima.
export const dateShort = (d: string | null | undefined) => {
  if (!d) return "—";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(d);
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: dateOnly ? "UTC" : "America/Lima" }).format(new Date(d));
};

export const dateTime = (d: string | null | undefined) =>
  d
    ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(d))
    : "—";

/** Las iniciales de las dos primeras palabras: `Julia Méndez` → `JM`. */
export const initials = (fullName: string) =>
  fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

const LIMA = "America/Lima";

/** Fecha de hoy en Lima, formato YYYY-MM-DD. */
export const todayLima = () => new Intl.DateTimeFormat("en-CA", { timeZone: LIMA }).format(new Date());

/** Suma días a una fecha YYYY-MM-DD. */
export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Suma meses a YYYY-MM-DD; si el día no existe en el mes destino, cae al último día. */
export const addMonths = (date: string, months: number) => {
  const [y, m, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
};

/** "2026-11-04T15:30" (hora de Lima, de un input datetime-local) → ISO con zona. Lima no tiene horario de verano. */
export const limaLocalToIso = (local: string) => new Date(`${local}:00-05:00`).toISOString();

/** ISO de la base → "YYYY-MM-DDTHH:mm" en hora de Lima, para un input datetime-local. */
export const isoToLimaLocal = (iso: string | null | undefined) => {
  if (!iso) return "";
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: LIMA, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
};

/** Hora corta en Lima, ej. "15:30". */
export const timeShort = (d: string | null | undefined) =>
  d ? new Intl.DateTimeFormat("es-PE", { timeStyle: "short", hourCycle: "h23", timeZone: LIMA }).format(new Date(d)) : "";
