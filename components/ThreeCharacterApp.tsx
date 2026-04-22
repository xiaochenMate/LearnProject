
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  X, Play, Pause, ScrollText, ChevronRight, Sparkles, 
  RefreshCw, BookOpen, Volume2, SkipBack, SkipForward, 
  ArrowLeft, Search, Bookmark, History, LayoutGrid, 
  Library, Trophy, Target, Type, Mic2, FileText, 
  Compass, Feather, User, Menu, Sliders, Loader2, Star,
  Info, ChevronDown, ChevronUp, Languages
} from 'lucide-react';
// Fix: Bypassing broken framer-motion types in this environment
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { SanZiJingVerse, CharAnalysis } from '../lib/sanzijingData';
import { GoogleGenAI } from "@google/genai";
import { dataService } from '../lib/dataService';

type ViewType = 'hub' | 'reader' | 'stories' | 'profile';

const ThreeCharacterApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [verses, setVerses] = useState<SanZiJingVerse[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentCharIdx, setCurrentCharIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('hub');
  const [activeTab, setActiveTab] = useState<'study' | 'source' | 'lexicon' | 'ai'>('study');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [isVertical, setIsVertical] = useState(true);
  const [stats, setStats] = useState({ learned: 124, streak: 5, points: 850 });

  const scrollRef = useRef<HTMLDivElement>(null);
  const verseRefs = useRef<(HTMLDivElement | null)[]>([]);

  const speak = (text: string, rate: number = 0.8) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataService.query<any>('SELECT * FROM sanzijing_verses ORDER BY verse_index ASC');
      if (data && data.length > 0) {
        const formatted = data.map(d => ({
          ...d,
          content_chars: Array.isArray(d.content_chars) ? d.content_chars : [],
          content_pinyin: Array.isArray(d.content_pinyin) ? d.content_pinyin : [],
          key_vocabulary: Array.isArray(d.key_vocabulary) ? d.key_vocabulary : [],
          tags: Array.isArray(d.tags) ? d.tags : [],
          char_analysis: typeof d.char_analysis === 'string' ? JSON.parse(d.char_analysis) : d.char_analysis
        })) as SanZiJingVerse[];
        setVerses(formatted);
      }
    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchAiInsight = async (verse: SanZiJingVerse) => {
    if (isAiLoading || !verse) return;
    setIsAiLoading(true);
    setAiInsight('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你是一位温和的国学老师。请针对这段经文：“${verse.content_raw}”，给孩子写一段简短、有趣的生活建议。100字以内。`,
      });
      setAiInsight(response.text || '智慧正在生成中...');
    } catch (e) {
      setAiInsight('AI 老师去休息啦，待会再试吧。');
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ai' && !aiInsight && verses[currentIdx]) {
      fetchAiInsight(verses[currentIdx]);
    }
  }, [activeTab, currentIdx, verses]);

  const playVerseSequence = useCallback((idx: number) => {
    if (!window.speechSynthesis || !verses[idx]) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(verses[idx].content_raw);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.75;
    
    utterance.onboundary = (e) => {
      const textBefore = verses[idx].content_raw.substring(0, e.charIndex);
      const chineseOnlyBefore = textBefore.replace(/[^\u4e00-\u9fa5]/g, '');
      setCurrentCharIdx(chineseOnlyBefore.length);
    };

    utterance.onend = () => {
      setCurrentCharIdx(-1);
      if (isPlaying && idx < verses.length - 1) {
        setTimeout(() => {
           if(isPlaying) setCurrentIdx(prev => prev + 1);
        }, 800);
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

  // --- 视图组件 ---

  const HubView = () => {
    const dailyIdx = useMemo(() => new Date().getDate() % (verses.length || 1), [verses.length]);
    const dailyVerse = verses[dailyIdx];

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col p-6 md:p-10 overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-start mb-10">
          <div>
             <h2 className="text-2xl md:text-4xl font-black text-[#1A1A1A] serif-font mb-1">三字经 · 国学馆</h2>
             <p className="text-slate-400 font-bold tracking-[0.1em] text-[10px] uppercase">Wisdom of Ancient Classics</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-white px-3 py-1.5 rounded-xl border border-[#e0d7c6] shadow-sm flex items-center gap-2">
                <Trophy size={14} className="text-[#B22222]" />
                <span className="text-[10px] font-black text-[#1A1A1A]">{stats.points} 积分</span>
             </div>
             <button onClick={onClose} className="p-2.5 bg-white border border-[#e0d7c6] rounded-xl text-slate-400 hover:text-[#B22222] transition-all"><X size={18}/></button>
          </div>
        </div>

        <div className="relative mb-10 group cursor-pointer" onClick={() => { setCurrentIdx(dailyIdx); setCurrentView('reader'); }}>
          <div className="absolute inset-0 bg-[#B22222]/5 rounded-[2rem] blur-2xl opacity-40 group-hover:opacity-100 transition-opacity" />
          <div className="relative bg-white/90 backdrop-blur-xl border border-[#e0d7c6] rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 shadow-lg overflow-hidden">
             <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12">
                <div className="flex flex-col items-center">
                   <div className="text-[9px] font-black text-[#B22222] bg-[#B22222]/10 px-2.5 py-0.5 rounded-full mb-4 tracking-widest uppercase">Daily Wisdom</div>
                   <div className="text-6xl md:text-7xl font-black text-[#1A1A1A] tracking-tighter serif-font leading-none">{dailyVerse?.content_chars.slice(0, 3).join('')}</div>
                </div>
                <div className="flex-1 text-center md:text-left">
                   <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-bold italic mb-6 serif-font">“{dailyVerse?.translation_vernacular}”</p>
                   <button className="px-8 py-3 bg-[#B22222] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#1A1A1A] transition-all flex items-center gap-2 shadow-lg">开始修行 <ChevronRight size={14} /></button>
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <HubCard icon={<BookOpen size={20}/>} label="全息长卷" sub="Full Content" onClick={() => setCurrentView('reader')} />
           <HubCard icon={<Compass size={20}/>} label="典故寻踪" sub="Story Finder" onClick={() => setCurrentView('reader')} />
           <HubCard icon={<History size={20}/>} label="复习巩固" sub="Recent Review" onClick={() => setCurrentView('reader')} />
           <HubCard icon={<Sparkles size={20}/>} label="AI 陪读" sub="AI Companion" onClick={() => { setCurrentView('reader'); setActiveTab('ai'); }} />
        </div>
      </motion.div>
    );
  };

  const ReaderView = () => (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#FDFBF7]">
      
      {/* 顶部控制栏 - 缩小尺寸 */}
      <header className="h-16 sm:h-20 bg-white/95 backdrop-blur-xl border-b border-[#e0d7c6] flex items-center justify-between px-6 sm:px-10 z-50 shrink-0">
         <button onClick={() => { setIsPlaying(false); setCurrentView('hub'); }} className="p-2.5 bg-[#F9F6F0] border border-[#e0d7c6] rounded-xl text-slate-400 hover:text-[#B22222] shadow-sm transition-all active:scale-95">
           <ArrowLeft size={20} />
         </button>
         
         <div className="flex items-center gap-3 sm:gap-4 bg-[#1A1A1A] p-1.5 sm:p-2 rounded-full shadow-xl">
            <button onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} className="p-1.5 text-white/40 hover:text-white transition-colors">
              <SkipBack size={20} fill="currentColor"/>
            </button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 sm:w-13 sm:h-13 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all">
               {isPlaying ? <Pause size={24} className="text-[#1A1A1A]" fill="currentColor"/> : <Play size={24} className="text-[#1A1A1A] ml-0.5" fill="currentColor"/>}
            </button>
            <button onClick={() => setCurrentIdx(prev => Math.min(verses.length - 1, prev + 1))} className="p-1.5 text-white/40 hover:text-white transition-colors">
              <SkipForward size={20} fill="currentColor"/>
            </button>
         </div>

         <div className="flex gap-2">
            <ReaderAction icon={<Type size={18}/>} active={showPinyin} onClick={() => setShowPinyin(!showPinyin)} />
            <ReaderAction icon={<LayoutGrid size={18}/>} active={isVertical} onClick={() => setIsVertical(!isVertical)} />
            <button className="p-2.5 sm:p-3 bg-[#B22222] text-white rounded-xl shadow-lg shadow-[#B22222]/10 active:scale-95">
              <Menu size={18}/>
            </button>
         </div>
      </header>

      {/* 主阅读区 */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* 左侧：经文长卷 - 调优字号与留白 */}
        <section className="flex-1 overflow-y-auto no-scrollbar scroll-smooth bg-[#FDFBF7] py-12 px-6 relative">
           <div className="max-w-5xl mx-auto space-y-32 sm:space-y-48">
              {verses.map((v, i) => (
                <div 
                  key={v.id} ref={el => { verseRefs.current[i] = el; }}
                  className={`transition-all duration-700 flex justify-center ${currentIdx === i ? 'opacity-100' : 'opacity-10'}`}
                  onClick={() => { setCurrentIdx(i); setIsPlaying(false); }}
                >
                  <div className={`flex ${isVertical ? 'flex-row-reverse' : 'flex-col'} items-center gap-10 sm:gap-16 p-6 sm:p-10 relative group cursor-pointer`}>
                    <div className="flex flex-wrap justify-center gap-x-8 sm:gap-x-12 gap-y-10 sm:gap-y-14 max-w-[800px]">
                        {v.content_chars.map((char, cIdx) => (
                          <div 
                            key={cIdx} 
                            onClick={(e) => { e.stopPropagation(); handleCharClick(char); }}
                            className="flex flex-col items-center group/char"
                          >
                            {showPinyin && (
                              <span className={`text-[10px] sm:text-sm font-mono mb-3 transition-colors ${currentIdx === i && currentCharIdx === cIdx ? 'text-[#B22222] font-black' : 'text-slate-300'}`}>
                                {v.content_pinyin[cIdx]}
                              </span>
                            )}
                            <span className={`text-6xl sm:text-[7.5rem] font-black leading-none serif-font transition-all tracking-tight ${currentIdx === i && currentCharIdx === cIdx ? 'text-[#1A1A1A] scale-105 drop-shadow-lg' : 'text-[#333] opacity-70 group-hover/char:text-[#B22222]'}`}>
                              {char}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ))}
           </div>
           <div className="h-[40vh]" />
        </section>

        {/* 右侧：解析面板 - 缩小宽度与字号 */}
        <aside className="lg:w-[380px] xl:w-[420px] flex flex-col bg-white border-l border-[#e0d7c6] shadow-[-10px_0_40px_rgba(0,0,0,0.02)] z-40">
          <nav className="flex bg-[#FDFBF7] border-b border-[#e0d7c6] shrink-0">
            {[
              { id: 'study', icon: <BookOpen size={14}/>, label: '义理' },
              { id: 'source', icon: <History size={14}/>, label: '典故' },
              { id: 'lexicon', icon: <Search size={14}/>, label: '字解' },
              { id: 'ai', icon: <Sparkles size={14}/>, label: 'AI' }
            ].map((tab: any) => (
              <button
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-5 flex flex-col items-center gap-1.5 text-[10px] font-black transition-all relative ${activeTab === tab.id ? 'text-[#B22222] bg-white' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                {tab.icon} {tab.label}
                {activeTab === tab.id && <motion.div layoutId="tab-underline" className="absolute bottom-0 w-full h-0.5 bg-[#B22222]" />}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-8 sm:p-10 no-scrollbar">
            <AnimatePresence mode="wait">
               {activeTab === 'study' && (
                 <motion.div key="study" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">
                    <section>
                      <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-4 serif-font italic">现代译文</h4>
                      <p className="text-xl sm:text-2xl font-black text-[#1A1A1A] leading-snug italic serif-font">“{activeVerse?.translation_vernacular}”</p>
                    </section>
                    <section className="bg-[#F9F6F0] p-6 sm:p-8 rounded-[1.5rem] border border-[#e0d7c6] shadow-sm">
                      <h4 className="text-[9px] font-black text-[#B22222] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">深度导读</h4>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium text-justify">{activeVerse?.interpretation_deep}</p>
                    </section>
                 </motion.div>
               )}

               {activeTab === 'source' && (
                 <motion.div key="source" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    {activeVerse?.allusion_title ? (
                      <div className="space-y-6">
                         <div className="inline-block px-3 py-1 bg-[#B22222]/5 text-[#B22222] rounded-full text-[9px] font-black">{activeVerse.allusion_source}</div>
                         <h3 className="text-2xl font-black serif-font text-[#1A1A1A]">{activeVerse.allusion_title}</h3>
                         <div className="p-6 bg-white border border-dashed border-[#e0d7c6] rounded-[1.5rem]">
                            <p className="text-sm text-slate-500 leading-loose italic">{activeVerse.allusion_context}</p>
                         </div>
                      </div>
                    ) : (
                      <div className="py-20 text-center opacity-20">
                         <Compass size={48} className="mx-auto mb-4" />
                         <p className="text-xs serif-font font-black">此章节暂未收录典故</p>
                      </div>
                    )}
                 </motion.div>
               )}

               {activeTab === 'lexicon' && (
                 <motion.div key="lexicon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-6">
                      <Info size={14} className="text-[#B22222]" />
                      <p className="text-[9px] font-bold text-slate-400">点击左侧原文汉字，查看详细字源解析。</p>
                    </div>
                    
                    {selectedChar && activeVerse?.char_analysis?.[selectedChar] ? (
                      <div className="space-y-8">
                         <div className="flex items-end gap-4 border-b border-[#f3efe6] pb-6">
                            <div className="text-7xl font-black text-[#1A1A1A] serif-font leading-none">{selectedChar}</div>
                            <div className="pb-1">
                               <div className="text-xl font-mono font-black text-[#B22222]">{activeVerse.char_analysis[selectedChar].pinyin}</div>
                               <div className="text-[9px] font-black text-slate-400 tracking-widest uppercase mt-1">部首: {activeVerse.char_analysis[selectedChar].radical} | 笔画: {activeVerse.char_analysis[selectedChar].strokes}</div>
                            </div>
                         </div>
                         <section className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl">
                               <h5 className="text-[9px] font-black text-slate-400 uppercase mb-2">字形构造</h5>
                               <div className="text-sm font-black text-[#1A1A1A]">{activeVerse.char_analysis[selectedChar].formation}</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl">
                               <h5 className="text-[9px] font-black text-slate-400 uppercase mb-2">本义探源</h5>
                               <div className="text-sm font-black text-[#1A1A1A]">{activeVerse.char_analysis[selectedChar].original_meaning}</div>
                            </div>
                         </section>
                         <section>
                            <h5 className="text-[9px] font-black text-[#B22222] uppercase mb-3 flex items-center gap-2"><Sparkles size={10}/> 字理演变</h5>
                            <p className="text-sm text-slate-600 leading-relaxed font-medium italic">{activeVerse.char_analysis[selectedChar].evolution_story}</p>
                         </section>
                      </div>
                    ) : (
                      <div className="py-24 flex flex-col items-center justify-center opacity-10">
                         <Type size={80} className="text-slate-900 mb-6" />
                         <p className="text-lg font-black serif-font text-center">点击汉字探秘</p>
                      </div>
                    )}
                 </motion.div>
               )}

               {activeTab === 'ai' && (
                  <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                     <div className="p-8 bg-emerald-50/50 border border-emerald-100 rounded-[2rem] relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8 text-emerald-600">
                          <div className="flex items-center gap-2.5"><Mic2 size={18} /> <h4 className="text-[9px] font-black uppercase tracking-[0.2em]">AI 伴读智慧</h4></div>
                          {isAiLoading && <Loader2 size={16} className="animate-spin" />}
                        </div>
                        
                        {isAiLoading ? (
                          <div className="py-12 flex flex-col items-center gap-4">
                            <p className="text-[10px] text-emerald-400 font-black tracking-[0.2em] animate-pulse">正在感悟经文...</p>
                          </div>
                        ) : (
                          <div className="animate-in fade-in duration-1000">
                             <p className="text-xl font-bold text-emerald-900 leading-relaxed italic mb-8 serif-font">“{aiInsight || '请稍候，AI 老师正在为您解读...' }”</p>
                             <div className="bg-emerald-900 text-white p-6 rounded-2xl flex items-center gap-4 shadow-xl">
                                <Target size={24} className="text-emerald-300 shrink-0" />
                                <p className="text-[11px] font-medium leading-relaxed opacity-90 italic">愿先贤智慧指引您的修行。</p>
                             </div>
                          </div>
                        )}
                     </div>
                     <button 
                      onClick={() => activeVerse && fetchAiInsight(activeVerse)}
                      className="w-full py-4 bg-white border border-emerald-100 text-emerald-600 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-50 transition-all active:scale-95 shadow-sm"
                     >
                       <RefreshCw size={14} /> 换个角度感悟
                     </button>
                  </motion.div>
               )}
            </AnimatePresence>
          </div>
        </aside>
      </div>

      {/* 底部装饰页脚 */}
      <footer className="h-8 bg-white/90 border-t border-[#e0d7c6] px-6 flex items-center justify-between z-40 text-[8px] font-bold text-slate-400 italic">
         <div className="flex gap-8">
           <span className="flex items-center gap-1.5"><span className="w-1 h-1 bg-[#B22222] rounded-full animate-pulse"></span> 传承模式: 同步中</span>
           <span className="uppercase tracking-widest hidden sm:inline">V3.2.5_Compact</span>
         </div>
         <div className="flex gap-4">
            <span className="flex items-center gap-1"><Languages size={8}/> 简体中文 / Pinyin</span>
         </div>
      </footer>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] bg-[#FDFBF7] flex flex-col select-none overflow-hidden pb-[env(safe-area-inset-bottom)]">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]" />
      
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#FDFBF7]">
           <div className="relative mb-6">
              <div className="w-16 h-16 bg-[#B22222]/10 rounded-full animate-ping opacity-20" />
              <div className="absolute inset-0 m-auto w-10 h-10 border-[3px] border-[#B22222] border-t-transparent rounded-full animate-spin" />
           </div>
           <p className="text-[10px] font-black tracking-[0.4em] text-[#B22222] uppercase animate-pulse">正在载入经文...</p>
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

const HubCard = ({ icon, label, sub, onClick }: any) => (
  <button onClick={onClick} className="bg-white border border-[#e0d7c6] p-6 rounded-[1.5rem] flex flex-col items-center gap-3 hover:border-[#B22222] hover:shadow-lg transition-all group shadow-sm">
     <div className="w-12 h-12 bg-[#F9F6F0] rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#B22222] transition-colors shadow-inner">
       {icon}
     </div>
     <div className="text-center">
        <div className="text-sm font-black text-[#1A1A1A] serif-font">{label}</div>
        <div className="text-[7px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">{sub}</div>
     </div>
  </button>
);

const ReaderAction = ({ icon, active, onClick }: any) => (
  <button onClick={onClick} className={`p-2.5 rounded-xl transition-all border pointer-events-auto ${active ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white shadow-lg' : 'bg-white border-[#e0d7c6] text-slate-300 shadow-sm'}`}>
    {icon}
  </button>
);

export default ThreeCharacterApp;
