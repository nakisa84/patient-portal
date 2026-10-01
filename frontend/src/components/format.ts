/** "2026-04-03" -> "April 3, 2026" without timezone drift. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}
