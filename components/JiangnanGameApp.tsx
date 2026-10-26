import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';

interface JiangnanGameAppProps {
  onClose: () => void;
}

const ENTRY = '/games/jiangnan/index.html';

const JiangnanGameApp: React.FC<JiangnanGameAppProps> = () => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [detail, setDetail] = useState('正在准备水乡与战车');

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setMounted(false);
    setStatus('loading');
    setDetail('正在准备水乡与战车');
    const send = (command: string) => frame.current?.contentWindow?.postMessage(
      { type: 'jiangnan:command', protocol: 1, command }, window.location.origin,
    );
    const fail = (message: string) => {
      if (!active) return;
      window.clearTimeout(timeout);
      send('dispose');
      setMounted(false);
      setStatus('error');
      setDetail(message);
    };
    // A fallback or 404 document can fire onLoad. Only the game's ready handshake is success.
    const timeout = window.setTimeout(() => fail('战场载入超时，请检查连接后重试。'), 120_000);
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const value = event.data;
      if (!value || value.type !== 'jiangnan:status' || value.protocol !== 1
        || !['loading', 'ready', 'error'].includes(value.status)
        || typeof value.detail !== 'string' || value.detail.length > 300) return;
      if (value.status === 'ready') {
        window.clearTimeout(timeout);
        setStatus('ready');
      } else if (value.status === 'error') {
        window.clearTimeout(timeout);
        fail(value.detail);
      } else setDetail(value.detail);
    };
    window.addEventListener('message', receive);
    const hide = () => { if (document.hidden) send('suspend'); };
    document.addEventListener('visibilitychange', hide);
    fetch(ENTRY, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error(`战场入口暂不可用（${response.status}）。`);
        const html = await response.text();
        if (!html.includes('name="jiangnan-build" content="campaign-3"')) throw new Error('战场入口不完整，请重新载入。');
        if (active) setMounted(true);
      })
      .catch(error => { if (error.name !== 'AbortError') fail(error.message || '无法连接战场资源。'); });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
      window.removeEventListener('message', receive);
      document.removeEventListener('visibilitychange', hide);
      send('dispose');
      // Navigation tears down workers, audio and WebGL even if the child never booted.
      if (frame.current) frame.current.src = 'about:blank';
    };
  }, [attempt]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#0c1014]">
      {mounted && <iframe
        key={attempt}
        ref={frame}
        title="江南 · 烟雨归航"
        src={ENTRY}
        className="h-full w-full border-0"
        allow="gamepad"
        allowFullScreen
        onLoad={() => frame.current?.contentWindow?.postMessage(
          { type: 'jiangnan:command', protocol: 1, command: 'hello' }, window.location.origin,
        )}
        onError={() => { setMounted(false); setStatus('error'); setDetail('战场连接中断，请重试。'); }}
      />}
      {status !== 'ready' && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0c1014] p-6 text-[#e6eef0]">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center text-sm" role="status">
          {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-[#82e5c2]" />}
          <p>{detail}</p>
          {status === 'error' && <button type="button" onClick={() => setAttempt(value => value + 1)} className="flex items-center gap-2 rounded-md border border-white/20 bg-[#141a20] px-4 py-2 text-[#82e5c2]">
            <RotateCcw className="h-4 w-4" />重新进入
          </button>}
        </div>
      </div>}
    </div>
  );
};

export default JiangnanGameApp;
