/** Una fecha de ejecución es un día calendario, no un instante con zona horaria. */
export function formatFechaEjecucion(value?: string | null): string {
  if (!value) return "-";
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  if (!match) return "-";
  const [, year, month, day] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== `${year}-${month}-${day}`) return "-";
  return `${day}-${month}-${year}`;
}
