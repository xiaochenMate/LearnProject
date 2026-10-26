import { useCallback, useEffect, useState } from 'react';

export function usePracticeSpeech() {
  const available = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  const [notice, setNotice] = useState('');
  useEffect(() => () => { if (available) window.speechSynthesis.cancel(); }, [available]);
  const speak = useCallback((text: string, lang = 'zh-CN') => {
    if (!available) { setNotice('此浏览器不支持语音朗读。'); return; }
    try {
      window.speechSynthesis.cancel();
      const message = new window.SpeechSynthesisUtterance(text);
      message.lang = lang; message.rate = 0.85;
      message.onerror = event => { if (event.error !== 'canceled' && event.error !== 'interrupted') setNotice('语音暂时不可用，文字内容仍可学习。'); };
      setNotice(''); window.speechSynthesis.speak(message);
    } catch { setNotice('语音暂时不可用，文字内容仍可学习。'); }
  }, [available]);
  return { available, speak, notice };
}
