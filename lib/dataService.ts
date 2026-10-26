export const SERVER_API = Object.freeze({
  mode: 'serverAPI',
  readOnly: true,
  health: '/api/health',
  dataStatus: '/api/data-status',
} as const);

type ClientDataErrorCode =
  | 'CLIENT_DATABASE_DISABLED'
  | 'SERVER_API_UNAVAILABLE'
  | 'SERVER_API_INVALID_RESPONSE';

const ERROR_MESSAGES: Record<ClientDataErrorCode, string> = {
  CLIENT_DATABASE_DISABLED:
    'Browser database queries are disabled (serverAPI mode). /api/health and /api/data-status provide read-only status, not query results.',
  SERVER_API_UNAVAILABLE:
    'The serverAPI status endpoint is unavailable. Database connectivity and migration status are unknown.',
  SERVER_API_INVALID_RESPONSE:
    'The serverAPI status endpoint did not return a JSON object. Database connectivity and migration status are unknown.',
};

export class ClientDataError extends Error {
  readonly mode = SERVER_API.mode;

  constructor(
    readonly code: ClientDataErrorCode,
    readonly endpoint?: string,
    readonly status?: number,
  ) {
    super(ERROR_MESSAGES[code]);
    this.name = 'ClientDataError';
  }
}

export type ServerAPIStatus = Readonly<Record<string, unknown>>;

class DataService {
  readonly mode = SERVER_API.mode;

  private async readStatus(
    endpoint: typeof SERVER_API.health | typeof SERVER_API.dataStatus,
    signal?: AbortSignal,
  ): Promise<ServerAPIStatus> {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'same-origin',
        mode: 'same-origin',
        redirect: 'error',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal,
      });
    } catch {
      // Do not forward connection errors that might contain server credentials.
      throw new ClientDataError('SERVER_API_UNAVAILABLE', endpoint);
    }

    if (!response.ok || response.redirected) {
      throw new ClientDataError('SERVER_API_UNAVAILABLE', endpoint, response.status);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!/^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(contentType)) {
      throw new ClientDataError('SERVER_API_INVALID_RESPONSE', endpoint, response.status);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ClientDataError('SERVER_API_INVALID_RESPONSE', endpoint, response.status);
    }
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ClientDataError('SERVER_API_INVALID_RESPONSE', endpoint, response.status);
    }

    // Preserve server-reported readiness; HTTP success alone does not prove a migration.
    return payload as ServerAPIStatus;
  }

  getHealth(signal?: AbortSignal): Promise<ServerAPIStatus> {
    return this.readStatus(SERVER_API.health, signal);
  }

  getDataStatus(signal?: AbortSignal): Promise<ServerAPIStatus> {
    return this.readStatus(SERVER_API.dataStatus, signal);
  }

  /** @deprecated Retained only to reject legacy calls without losing data silently. */
  async queryNeon<T>(_query: TemplateStringsArray, ..._params: any[]): Promise<T> {
    throw new ClientDataError('CLIENT_DATABASE_DISABLED');
  }

  /** @deprecated Arbitrary SQL is not part of the serverAPI contract. */
  async query<T>(_queryString: string, _params: any[] = []): Promise<T> {
    throw new ClientDataError('CLIENT_DATABASE_DISABLED');
  }

  /** @deprecated Arbitrary table queries are not part of the serverAPI contract. */
  async querySupabase(_table: string, _select = '*'): Promise<never> {
    throw new ClientDataError('CLIENT_DATABASE_DISABLED');
  }

  clearCache(): void {
    // Compatibility only: status responses and legacy query results are never cached.
  }
}

export const dataService = new DataService();
export default dataService;
