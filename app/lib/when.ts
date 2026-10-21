/** "Tue 22 Oct, 07:30" in the reader's language (BCP 47 tag), for trip times. */
export function formatWhen(iso: string, tag: string): string {
  return new Date(iso).toLocaleString(tag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The value for an <input type="datetime-local"> at `ms` in the phone's own time zone. */
export function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
