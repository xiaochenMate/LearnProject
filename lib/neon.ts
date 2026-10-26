import { ClientDataError } from './dataService';

export { SERVER_API } from './dataService';

/** @deprecated Database queries belong on the server, not in a browser bundle. */
export async function sql<T = unknown[]>(
  _query: TemplateStringsArray | string,
  ..._params: any[]
): Promise<T> {
  throw new ClientDataError('CLIENT_DATABASE_DISABLED');
}

export default sql;
