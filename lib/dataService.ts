
import sql from './neon';
import { supabase } from './supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 1000 * 60 * 60; // 1 hour

class DataService {
  private cache: Map<string, CacheEntry<any>> = new Map();

  private getCacheKey(query: string, params: any[] = []): string {
    return `${query}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.data;
    }
    return null;
  }

  private setCache<T>(key: string, data: T) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Neon (PostgreSQL) Query with Caching
   */
  async queryNeon<T>(query: TemplateStringsArray, ...params: any[]): Promise<T> {
    if (!sql) return [] as unknown as T;
    
    const cacheKey = this.getCacheKey(query.join('?'), params);
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) return cached;

    try {
      const result = await sql(query, ...params);
      this.setCache(cacheKey, result);
      return result as unknown as T;
    } catch (error: any) {
      if (error && error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
          return [] as unknown as T;
      }
      // console.error('[DataService] Neon Query Error:', error);
      throw error;
    }
  }

  /**
   * Neon (PostgreSQL) Query with string and params
   */
  async query<T>(queryString: string, params: any[] = []): Promise<T> {
    if (!sql) return [] as unknown as T;
    
    const cacheKey = this.getCacheKey(queryString, params);
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) return cached;

    try {
      const result = await sql(queryString, params);
      this.setCache(cacheKey, result);
      return result as unknown as T;
    } catch (error: any) {
      if (error && error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
          return [] as unknown as T;
      }
      // console.error('[DataService] Neon Query Error:', error);
      throw error;
    }
  }

  /**
   * Supabase Query (Example)
   */
  async querySupabase(table: string, select = '*') {
    if (!supabase) return [];
    
    const cacheKey = `supabase_${table}_${select}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase.from(table).select(select);
    if (error) throw error;
    
    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Clear Cache
   */
  clearCache() {
    this.cache.clear();
  }
}

export const dataService = new DataService();
export default dataService;
