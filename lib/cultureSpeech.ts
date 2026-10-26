import { useCallback, useEffect, useRef, useState } from 'react';

export function useCultureSpeech(scope: string) {
  const [available, setAvailable] = useState(false);
  const [message, setMessage] = useState('正在检查设备中文语音');
  const [speaking, setSpeaking] = useState(false);
  const [character, setCharacter] = useState(-1);
  const voice = useRef<SpeechSynthesisVoice | null>(null);
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => {
    if (watchdog.current) clearTimeout(watchdog.current);
    if (current.current) {
      current.current.onstart = null;
      current.current.onend = null;
      current.current.onerror = null;
      current.current.onboundary = null;
      current.current = null;
      window.speechSynthesis?.cancel();
    }
  }, []);
  const stop = useCallback(() => { cancel(); setSpeaking(false); setCharacter(-1); }, [cancel]);

  useEffect(() => {
    if (typeof window.speechSynthesis === 'undefined' || typeof window.SpeechSynthesisUtterance === 'undefined') {
      setMessage('当前设备不支持语音朗读');
      return;
    }
    const synth = window.speechSynthesis;
    const refresh = () => {
      const chinese = synth.getVoices().filter(item => /^zh(?:-|_)/i.test(item.lang));
      voice.current = chinese.find(item => /^zh[-_]CN$/i.test(item.lang)) || chinese[0] || null;
      setAvailable(Boolean(voice.current));
      setMessage(voice.current ? `设备语音 · ${voice.current.name}` : '设备未提供中文语音，仍可阅读与练习');
    };
    refresh();
    synth.addEventListener('voiceschanged', refresh);
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { synth.removeEventListener('voiceschanged', refresh); document.removeEventListener('visibilitychange', hidden); cancel(); };
  }, [cancel, stop]);
  useEffect(() => { stop(); return cancel; }, [scope, stop, cancel]);

  const speak = useCallback((text: string, rate: number) => {
    if (!voice.current || !window.speechSynthesis || !text.trim()) {
      setMessage('当前没有可用的中文语音');
      return;
    }
    stop();
    const utterance = new SpeechSynthesisUtterance(text);
    current.current = utterance;
    utterance.voice = voice.current;
    utterance.lang = voice.current.lang;
    utterance.rate = rate;
    const finish = (error?: string) => {
      if (current.current !== utterance) return;
      if (watchdog.current) clearTimeout(watchdog.current);
      current.current = null;
      setSpeaking(false);
      setCharacter(-1);
      if (error) setMessage(error);
    };
    utterance.onstart = () => {
      if (current.current !== utterance) return;
      if (watchdog.current) clearTimeout(watchdog.current);
      setSpeaking(true);
      setMessage(`设备语音 · ${voice.current?.name || '中文'}`);
    };
    utterance.onboundary = event => {
      if (current.current === utterance) setCharacter(Array.from(text.slice(0, event.charIndex)).filter(c => /[\u3400-\u9fff]/.test(c)).length);
    };
    utterance.onend = () => finish();
    utterance.onerror = event => finish(`朗读未完成：${event.error === 'not-allowed' ? '请允许设备朗读后重试' : '设备语音暂不可用，请重试'}`);
    try {
      setSpeaking(true);
      watchdog.current = setTimeout(() => {
        if (current.current !== utterance) return;
        stop();
        setMessage('设备语音未响应，请稍后重试');
      }, 5000);
      window.speechSynthesis.speak(utterance);
    } catch {
      stop();
      setMessage('设备语音启动失败，请稍后重试');
    }
  }, [stop]);
  return { available, speaking, message, character, speak, stop };
}
