
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  X, Play, Pause, ChevronRight, Sparkles, 
  BookOpen, SkipBack, SkipForward,
  ArrowLeft, Search, History, LayoutGrid, 
  Trophy, Target, Type, Compass, Menu, Loader2, Info, Languages
} from 'lucide-react';
// Fix: Bypassing broken framer-motion types in this environment
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { QianZiWenVerse, QIAN_ZI_WEN_LOCAL } from '../lib/qianziwenData';
import { dataService } from '../lib/dataService';

const ThousandCharacterApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [verses, setVerses] = useState<QianZiWenVerse[]>(QIAN_ZI_WEN_LOCAL);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentCharIdx, setCurrentCharIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentView, setCurrentView] = useState<'hub' | 'reader'>('hub');
  const [activeTab, setActiveTab] = useState<'study' | 'lexicon' | 'practice'>('study');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [reflectionDone, setReflectionDone] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);

  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataService.query<any>('SELECT * FROM qianziwen_verses ORDER BY verse_index ASC');
      if (data && data.length > 0) {
        const formatted = data.map((d: any) => ({
          ...d,
          content_chars: Array.isArray(d.content_chars) ? d.content_chars : [],
          content_pinyin: Array.isArray(d.content_pinyin) ? d.content_pinyin : [],
          char_analysis: typeof d.char_analysis === 'string' ? JSON.parse(d.char_analysis) : d.char_analysis
        })) as QianZiWenVerse[];
        setVerses(formatted);
      }
    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const speak = (text: string, rate: number = 0.8) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  const playVerseSequence = useCallback((idx: number) => {
    if (!window.speechSynthesis || !verses[idx]) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(verses[idx].content_raw);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.7;
    
    utterance.onboundary = (e) => {
      const chineseOnlyBefore = verses[idx].content_raw.substring(0, e.charIndex).replace(/[^\u4e00-\u9fa5]/g, '');
      setCurrentCharIdx(chineseOnlyBefore.length);
    };

    utterance.onend = () => {
      setCurrentCharIdx(-1);
      if (isPlaying && idx < verses.length - 1) {
        setTimeout(() => isPlaying && setCurrentIdx(prev => prev + 1), 600);
      } else {
        setIsPlaying(false);
      }
    };
    window.speechSynthesis.speak(utterance);
  }, [isPlaying, verses]);

  useEffect(() => {
    if (isPlaying) playVerseSequence(currentIdx);
    if (verseRefs.current[currentIdx]) {
      verseRefs.current[currentIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIdx, isPlaying, playVerseSequence]);

  const activeVerse = verses[currentIdx];

  const handleCharClick = (char: string) => {
    setSelectedChar(char);
    setActiveTab('lexicon');
    speak(char, 0.6);
  };

  const HubView = () => (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto no-scrollbar">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-black text-[#1A1A1A] serif-font">千字文 · 百科馆</h2>
          <p className="text-[9px] text-slate-400 font-bold tracking-widest">THOUSAND CHARACTERS</p>
        </div>
        <button onClick={onClose} className="p-2 bg-white border border-[#e0d7c6] rounded-xl text-slate-400"><X size={18}/></button>
      </div>
      <div className="bg-white border border-[#e0d7c6] rounded-3xl p-8 mb-8 shadow-sm cursor-pointer" onClick={() => setCurrentView('reader')}>
         <div className="flex flex-col items-center gap-4">
            <div className="text-5xl font-black serif-font text-[#1A1A1A] tracking-tighter">天地玄黄</div>
            <p className="text-sm text-slate-500 italic text-center leading-relaxed">“宇宙的宏大叙事，从这里开始。”</p>
            <div className="px-6 py-2 bg-[#2E4A62] text-white text-[10px] font-black rounded-full uppercase tracking-widest mt-2 shadow-lg">进入卷轴</div>
         </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
         <button onClick={() => setCurrentView('reader')} className="bg-white border border-[#e0d7c6] p-4 rounded-2xl flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#2E4A62]"><BookOpen size={18}/></div>
              <span className="text-xs font-black text-[#1A1A1A] serif-font">全息阅读模式</span>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
         </button>
      </div>
    </div>
  );

  const ReaderView = () => (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FDFBF7]">
      

      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        <section className="px-4 py-8 md:py-12 flex flex-col items-center gap-12">
           {verses.map((v, i) => (
             <div 
               key={v.id} ref={el => { verseRefs.current[i] = el; }}
               className={`transition-all duration-500 cursor-pointer w-full max-w-xl ${currentIdx === i ? 'opacity-100 scale-100' : 'opacity-10 scale-95'}`}
               onClick={() => { setCurrentIdx(i); setIsPlaying(false); }}
             >
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-x-2 gap-y-4 w-full">
                   {v.content_chars.map((char, cIdx) => (
                     <div key={cIdx} className="flex flex-col items-center" onClick={(e) => { e.stopPropagation(); handleCharClick(char); }}>
                        {showPinyin && (
                          <span className={`text-[8px] sm:text-xs font-mono mb-1 tracking-tight ${currentIdx === i && currentCharIdx === cIdx ? 'text-[#2E4A62] font-black' : 'text-slate-300'}`}>
                            {v.content_pinyin[cIdx]}
                          </span>
                        )}
                        <span className={`text-3xl sm:text-5xl font-black serif-font transition-all ${currentIdx === i && currentCharIdx === cIdx ? 'text-[#1A1A1A] scale-110 drop-shadow-sm' : 'text-[#333] opacity-80'}`}>
                           {char}
                        </span>
                     </div>
                   ))}
                </div>
             </div>
           ))}
        </section>

        <div className="sticky top-0 z-40 bg-white border-y border-[#e0d7c6] shadow-sm">
          <nav className="flex max-w-2xl mx-auto">
            {[
              { id: 'study', icon: <BookOpen size={16}/>, label: '义理' },
              { id: 'lexicon', icon: <Search size={16}/>, label: '字解' },
              { id: 'practice', icon: <Target size={16}/>, label: '练习' }
            ].map((tab: any) => (
              <button
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 flex flex-col items-center gap-1.5 text-[10px] font-black transition-all relative ${activeTab === tab.id ? 'text-[#2E4A62]' : 'text-slate-400'}`}
              >
                {tab.icon} {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 w-full h-0.5 bg-[#2E4A62]" />}
              </button>
            ))}
          </nav>
        </div>

        <div className="max-w-xl mx-auto p-6 md:p-10 pb-20">
           <AnimatePresence mode="wait">
              {activeTab === 'study' && (
                <motion.div key="study" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                   <div>
                     <h4 className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-3 italic">现代译文</h4>
                     <p className="text-lg sm:text-xl font-black text-[#1A1A1A] leading-relaxed italic serif-font">“{activeVerse?.translation}”</p>
                   </div>
                   <div className="bg-[#F4F7F9] p-6 rounded-3xl border border-[#DCE4E9]">
                     <h4 className="text-[8px] font-black text-[#2E4A62] uppercase tracking-[0.2em] mb-4">深度导读</h4>
                     <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">{activeVerse?.interpretation}</p>
                   </div>
                </motion.div>
              )}

              {activeTab === 'lexicon' && (
                <motion.div key="lexicon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                   {selectedChar && activeVerse?.char_analysis?.[selectedChar] ? (
                     <div className="space-y-6">
                        <div className="flex items-end gap-4 border-b border-slate-100 pb-6">
                           <div className="text-6xl font-black text-[#1A1A1A] serif-font">{selectedChar}</div>
                           <div className="pb-1">
                              <div className="text-xl font-mono font-black text-[#2E4A62]">{activeVerse.char_analysis[selectedChar].pinyin}</div>
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">部首: {activeVerse.char_analysis[selectedChar].radical} | 笔画: {activeVerse.char_analysis[selectedChar].strokes}</div>
                           </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed italic border-l-2 border-[#2E4A62] pl-3">{activeVerse.char_analysis[selectedChar].evolution_story}</p>
                     </div>
                   ) : (
                     <div className="py-20 text-center opacity-10 flex flex-col items-center gap-3"><Search size={48} /><p className="text-sm font-black serif-font">点击汉字查看字源</p></div>
                   )}
                </motion.div>
              )}

              {activeTab === 'practice' && (
                 <motion.div key="practice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="p-7 bg-blue-50/60 border border-blue-100 rounded-3xl">
                       <div className="flex items-center gap-2 text-blue-700">
                         <Target size={16} />
                         <h4 className="text-[9px] font-black tracking-widest">理解检查</h4>
                       </div>
                       <p className="mt-5 text-base font-bold text-blue-950 leading-relaxed serif-font">
                         不看原文，尝试说出这一句描绘的场景和核心意思。
                       </p>
                       <p className="mt-4 text-xs leading-6 text-blue-900/65">
                         再从本句选一个字，解释它在句中的作用。完成复述后再查看译文核对。
                       </p>
                    </div>
                    <button
                      onClick={() => setReflectionDone(value => !value)}
                      className={`w-full py-4 border rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 ${
                        reflectionDone ? 'border-blue-700 bg-blue-700 text-white' : 'border-blue-100 bg-white text-blue-700'
                      }`}
                    >
                      <Target size={14} />
                      {reflectionDone ? '本句练习已完成' : '标记为已理解'}
                    </button>
                 </motion.div>
              )}
           </AnimatePresence>
        </div>
      </div>
      
      <footer className="h-8 bg-white/90 border-t border-[#e0d7c6] px-6 flex items-center justify-between text-[8px] font-bold text-slate-400 shrink-0">
         <span>千字文核心节点</span>
         <span className="uppercase tracking-widest">V4.0_QZW</span>
      </footer>
    </div>
  );

  return (
    <div className="w-full h-full relative  flex flex-col select-none overflow-hidden pb-[env(safe-area-inset-bottom)]     bg-white text-slate-900 bg-white text-slate-900">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]" />
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#FDFBF7]">
           <div className="relative mb-6">
              <div className="w-16 h-16 bg-[#2E4A62]/10 rounded-full animate-ping opacity-20" />
              <div className="absolute inset-0 m-auto w-10 h-10 border-[3px] border-[#2E4A62] border-t-transparent rounded-full animate-spin" />
           </div>
           <p className="text-[10px] font-black tracking-[0.4em] text-[#2E4A62] uppercase animate-pulse">正在载入经文...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {currentView === 'hub' ? <HubView key="hub" /> : <ReaderView key="reader" />}
        </AnimatePresence>
      )}

      <style>{`
        .serif-font { font-family: 'Noto Serif SC', serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default ThousandCharacterApp;
