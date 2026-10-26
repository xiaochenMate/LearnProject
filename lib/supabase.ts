import dataService from './dataService';

export { SERVER_API } from './dataService';

/** @deprecated Compatibility for the former from(table).select(columns) path. */
export const supabase = Object.freeze({
  from(table: string) {
    return Object.freeze({
      select(columns = '*') {
        return dataService.querySupabase(table, columns);
      },
    });
  },
});
