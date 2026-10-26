import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Database, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';

interface DataStatus {
  ready: boolean;
  migration: { totalRows: number; tables: { table: string; ready: boolean }[] };
}

export default function DataStatusPanel() {
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/data-status', { signal: controller.signal, cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('暂时无法连接数据服务。');
      const data = await response.json();
      if (data?.ok !== true || data?.database?.connected !== true || !Array.isArray(data?.migration?.tables) || !Number.isSafeInteger(data?.migration?.totalRows)) throw new Error('数据服务未返回有效状态。');
      if (!controller.signal.aborted) setStatus(data);
    } catch (cause) {
      if (!controller.signal.aborted) { setStatus(null); setError(cause instanceof Error ? cause.message : '暂时无法连接数据服务。'); }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => { void refresh(); return () => active.current?.abort(); }, [refresh]);
  return <section className="settings-section" aria-labelledby="data-service-title">
    <h2 id="data-service-title">在线数据服务</h2>
    <div className="settings-row">
      <div aria-live="polite">
        <strong>{loading ? '正在检查连接' : status ? 'Cloudflare 数据库已连接' : '数据服务暂不可用'}</strong>
        <p>{loading ? '正在核对内容库状态。' : status ? `内容库 ${status.migration.totalRows.toLocaleString('zh-CN')} 条记录 · ${status.migration.tables.filter(table => table.ready).length}/${status.migration.tables.length} 张表已核验${status.ready ? '' : ' · 迁移尚未完成'}` : error}</p>
      </div>
      {loading ? <Loader2 size={21} className="animate-spin" /> : status?.ready ? <CheckCircle2 size={21} /> : status ? <Database size={21} /> : <TriangleAlert size={21} />}
    </div>
    <div className="settings-buttons"><button type="button" className="ex-button ex-button-secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} />重新检查</button></div>
  </section>;
}
