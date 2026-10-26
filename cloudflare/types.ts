// Module-local structural bindings, without ambient Workers globals in the app.
export interface D1Result<T = Record<string, unknown>> {
  success: boolean;
  results: T[];
  meta: { changes?: number; [key: string]: unknown };
}

export interface PreparedStatement {
  bind(...values: unknown[]): PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Connection {
  prepare(sql: string): PreparedStatement;
  batch<T = Record<string, unknown>>(statements: PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface Database extends D1Connection {
  withSession?(constraint: 'first-primary'): D1Connection;
}

export interface Env {
  DB: Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
  EXBEAM_RELEASE?: string;
  LEGACY_SUMMER_ORIGIN?: string;
  LEGACY_BLOBS_VERIFIED_EMPTY?: string;
}

export class APIError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

export function primary(db: Database): D1Connection {
  return db.withSession ? db.withSession('first-primary') : db;
}

export function checked<T>(result: D1Result<T>): D1Result<T> {
  if (!result.success) throw new Error('Database operation failed');
  return result;
}
