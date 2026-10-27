/** Query values arrive as strings; anything that isn't a positive integer falls back. */
function toPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

/** The page number and size of a query, as numbers. */
export function parsePageQuery(page: unknown, pageSize: unknown, defaultPageSize: number) {
  return { page: toPositiveInt(page, 1), pageSize: toPositiveInt(pageSize, defaultPageSize) };
}

/** One page of `items`, with the page info the wiki's infinite lists read. */
export function paginate<T>(items: T[], page: unknown, pageSize: unknown, defaultPageSize: number) {
  const { page: currentPage, pageSize: size } = parsePageQuery(page, pageSize, defaultPageSize);
  const startIndex = (currentPage - 1) * size;
  const endIndex = startIndex + size;
  const hasNextPage = endIndex < items.length;
  return {
    data: items.slice(startIndex, endIndex),
    pageInfo: {
      nextPage: hasNextPage ? currentPage + 1 : null,
      hasNextPage,
      pageSize: size,
      currentPage,
      totalCount: items.length,
    },
  };
}
