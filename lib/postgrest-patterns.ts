/** Escape PostgreSQL LIKE/ILIKE pattern metacharacters for a literal match. */
export function escapePostgrestIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
