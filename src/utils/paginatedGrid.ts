export function padToPageSize<T>(items: readonly T[], pageSize: number): Array<T | null> {
  const padded: Array<T | null> = [...items]
  while (padded.length < pageSize) {
    padded.push(null)
  }
  return padded
}
