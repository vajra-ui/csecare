import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cursor-based infinite pagination for a Supabase table, keyed by a
 * monotonic `cursorColumn` (typically `created_at` or `date`).
 *
 * Usage:
 *   const q = useCursorPagination({
 *     key: ["attendance", studentId],
 *     table: "attendance",
 *     select: "id, date, is_present, subject",
 *     cursorColumn: "date",
 *     pageSize: 50,
 *     filter: (qb) => qb.eq("student_id", studentId),
 *   });
 */
export interface CursorPageParams<Row> {
  key: QueryKey;
  table: string;
  select: string;
  cursorColumn: string;
  pageSize?: number;
  ascending?: boolean;
  filter?: (qb: any) => any;
  enabled?: boolean;
}

export function useCursorPagination<Row extends Record<string, any>>({
  key,
  table,
  select,
  cursorColumn,
  pageSize = 50,
  ascending = false,
  filter,
  enabled = true,
}: CursorPageParams<Row>) {
  return useInfiniteQuery<{ rows: Row[]; nextCursor: string | null }>({
    queryKey: [...key, "cursor", table, cursorColumn, pageSize, ascending],
    enabled,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let qb: any = supabase.from(table as any).select(select);
      if (filter) qb = filter(qb);
      qb = qb.order(cursorColumn, { ascending }).limit(pageSize);
      if (pageParam) {
        qb = ascending
          ? qb.gt(cursorColumn, pageParam)
          : qb.lt(cursorColumn, pageParam);
      }
      const { data, error } = await qb;
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const last = rows[rows.length - 1];
      const nextCursor = rows.length === pageSize && last ? (last[cursorColumn] as string) : null;
      return { rows, nextCursor };
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}
