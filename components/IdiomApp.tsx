
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, Search, Sparkles, BookOpen, RefreshCw, 
  ChevronRight, Bookmark, Info, History, 
  Database, Loader2, Quote, ScrollText, 
  Feather, Languages, BookOpenCheck, Target,
  Brain, Library, Filter, Star, Zap, ArrowLeft
} from 'lucide-react';
import { dataService } from '../lib/dataService';

interface Idiom {
  id: number;
  word: string;
  pinyin: string;
  abbreviation: string;
  derivation: string;
  explanation: string;
  example: string;
  category?: string;
}

const THEMES = [
  { id: 'all', label: '全部', icon: <Library size={14}/> },
  { id: 'aspiration', label: '志向', icon: <Zap size={14}/> },
  { id: 'wisdom', label: '智慧', icon: <Brain size={14}/> },
  { id: 'nature', label: '山水', icon: <Feather size={14}/> },
  { id: 'history', label: '典故', icon: <ScrollText size={14}/> },
];

const IdiomApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [view, setView] = useState<'home' | 'search' | 'challenge'>('home');
  const [query, setQuery] = useState('');
  const [activeTheme, setActiveTheme] = useState('all');
  const [results, setResults] = useState<Idiom[]>([]);
  const [randomIdiom, setRandomIdiom] = useState<Idiom | null>(null);
  const [selectedIdiom, setSelectedIdiom] = useState<Idiom | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dbMode, setDbMode] = useState<'NEON' | 'NONE'>('NONE');

  // 挑战模式状态
  const [quizItem, setQuizItem] = useState<Idiom | null>(null);
  const [quizInput, setQuizInput] = useState<string[]>(['', '', '', '']);
  const [quizStatus, setQuizStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const fetchRandom = useCallback(async () => {
    try {
      const data = await dataService.query<any>('SELECT * FROM idioms ORDER BY RANDOM() LIMIT 1');
      if (data && data.length > 0) {
        setRandomIdiom(data[0] as unknown as Idiom);
        setDbMode('NEON');
      }
    } catch (e) {
      console.warn("Neon random fetch failed", e);
    }
  }, []);

  const startChallenge = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataService.query<any>('SELECT * FROM idioms ORDER BY RANDOM() LIMIT 1');
      if (data && data.length > 0) {
        const item = data[0] as unknown as Idiom;
        setQuizItem(item);
        setQuizInput(['', '', '', '']);
        setQuizStatus('idle');
        setView('challenge');
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const searchPattern = `%${q.trim()}%`;
      const data = await dataService.query<any>(
        `SELECT * FROM idioms 
         WHERE word ILIKE $1 
            OR pinyin ILIKE $1 
         ORDER BY LENGTH(word) ASC
         LIMIT 24`,
        [searchPattern]
      );
      setResults(data as unknown as Idiom[]);
      if(view !== 'search') setView('search');
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [view]);

  useEffect(() => {
    fetchRandom();
  }, [fetchRandom]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) search(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleQuizSubmit = () => {
    if (!quizItem) return;
    if (quizInput.join('') === quizItem.word) {
      setQuizStatus('success');
      // 自动展示详情
      setTimeout(() => setSelectedIdiom(quizItem), 800);
    } else {
      setQuizStatus('error');
      setTimeout(() => setQuizStatus('idle'), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FDFBF7] flex flex-col font-serif text-[#2c3e50] overflow-hidden select-none">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-0 bg-[url('https://www.transparenttextures.com/patterns/rice-paper.png')]"></div>

      <header className="h-16 md:h-20 bg-white/90 backdrop-blur-md border-b border-[#e0d7c6] flex items-center justify-between px-4 md:px-8 z-20 shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 md:gap-5 overflow-hidden">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#c0392b] text-white rounded-xl flex items-center justify-center shadow-lg shrink-0">
            <ScrollText className="w-5 h-5 md:w-7 md:h-7" />
          </div>
          <div className="truncate">
            <h1 className="text-base md:text-2xl font-black tracking-tight text-[#2c3e50] truncate">成语大辞典 <span className="text-[9px] bg-[#c0392b]/10 text-[#c0392b] px-2 py-0.5 rounded-full ml-2">PRO</span></h1>
            <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] flex items-center gap-1">
              <Database size={10} /> {dbMode === 'NEON' ? 'NEURAL_CLOUD_LINK' : 'OFFLINE_CACHE'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6 shrink-0">
           <div className="hidden sm:relative sm:group sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="键入检索词..." 
                value={query} 
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-2 bg-[#f3efe6] border border-[#e0d7c6] rounded-full text-sm focus:outline-none focus:border-[#c0392b] transition-all"
              />
           </div>
           <button onClick={startChallenge} className="hidden xs:flex items-center gap-2 px-4 py-2 bg-[#2c3e50] text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#c0392b] transition-all active:scale-95 shadow-md">
             <Target size={14} /> 挑战
           </button>
           <button onClick={onClose} className="p-2 md:p-3 bg-[#f3efe6] hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all">
             <X size={18}/>
           </button>
        </div>
      </header>

      {/* Mobile Actions Container */}
      <div className="sm:hidden px-4 py-3 bg-white/50 border-b border-[#e0d7c6] flex gap-2 z-10 shrink-0 overflow-x-auto no-scrollbar">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜索成语..." 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f3efe6] border border-[#e0d7c6] rounded-lg text-xs focus:outline-none"
          />
        </div>
        <button onClick={startChallenge} className="px-4 bg-[#c0392b] text-white rounded-lg flex items-center justify-center">
          <Target size={16} />
        </button>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-10 relative z-10 pb-safe">
        <div className="max-w-6xl mx-auto">
          
          {/* 主题导航 */}
          <nav className="flex items-center gap-2 mb-8 md:mb-12 overflow-x-auto no-scrollbar pb-2">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => { setActiveTheme(theme.id); setView('home'); setQuery(''); }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap border ${
                  activeTheme === theme.id 
                  ? 'bg-[#c0392b] text-white border-[#c0392b] shadow-lg shadow-[#c0392b]/20' 
                  : 'bg-white text-slate-500 border-[#e0d7c6] hover:bg-[#f3efe6]'
                }`}
              >
                {theme.icon} {theme.label}
              </button>
            ))}
          </nav>

          {view === 'home' && (
            <div className="space-y-10 md:space-y-16">
              {/* 每日发现卡片 */}
              {randomIdiom && (
                <section className="animate-in fade-in slide-in-from-bottom-5 duration-700">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-1.5 bg-[#c0392b] rounded-full animate-pulse"></div>
                         <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">每日雅趣 / DISCOVERY</h2>
                      </div>
                      <button onClick={fetchRandom} className="text-[10px] font-black text-[#c0392b] flex items-center gap-1 hover:underline">
                        <RefreshCw size={12} /> 换一批
                      </button>
                   </div>
                   
                   <div 
                    onClick={() => setSelectedIdiom(randomIdiom)}
                    className="relative bg-white border-2 border-[#e0d7c6] rounded-[2.5rem] md:rounded-[4rem] p-10 md:p-20 shadow-xl hover:shadow-2xl transition-all cursor-pointer group overflow-hidden"
                   >
                      <div className="absolute -top-10 -right-10 p-8 md:p-12 opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000">
                        <ScrollText size={300} />
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-20 relative z-10">
                         <div className="text-7xl md:text-[12rem] font-black text-[#2c3e50] tracking-tighter leading-none shrink-0" style={{ fontFamily: 'serif' }}>
                            {randomIdiom.word}
                         </div>
                         <div className="flex-1 text-center md:text-left pt-4 md:pt-10">
                            <div className="text-lg md:text-3xl font-mono italic text-[#c0392b] mb-6 md:mb-10 tracking-[0.2em]">{randomIdiom.pinyin}</div>
                            <div className="relative">
                               <Quote className="absolute -left-8 -top-4 opacity-10 text-[#c0392b]" size={40} />
                               <p className="text-xl md:text-3xl text-slate-600 leading-relaxed font-bold italic mb-10">
                                 {randomIdiom.explanation}
                               </p>
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-6">
                              <button className="px-10 py-4 bg-[#2c3e50] text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#c0392b] transition-colors flex items-center gap-3 shadow-xl">
                                研读全篇 <ChevronRight size={16} />
                              </button>
                            </div>
                         </div>
                      </div>
                   </div>
                </section>
              )}

              {/* 推荐磁贴 */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-1 bg-[#2c3e50] text-white rounded-[2rem] p-8 flex flex-col justify-between overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Target size={80}/></div>
                    <div>
                      <h3 className="text-2xl font-black mb-2 italic">成语填空战</h3>
                      <p className="text-xs text-white/60 leading-relaxed">通过语境推断成语，检验你的文化底蕴储备。</p>
                    </div>
                    <button onClick={startChallenge} className="w-full mt-8 py-3 bg-white text-[#2c3e50] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#c0392b] hover:text-white transition-all">立即开启</button>
                 </div>
                 
                 <div className="md:col-span-2 bg-white border border-[#e0d7c6] rounded-[2rem] p-8 flex items-center gap-8">
                    <div className="w-24 h-24 bg-[#f3efe6] rounded-2xl flex items-center justify-center shrink-0">
                       <History className="text-[#c0392b]" size={40} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-[#2c3e50] mb-2">历史足迹</h3>
                       <p className="text-xs text-slate-400 mb-4 italic">记录你最近研习的成语条目，方便随时复习巩固。</p>
                       <div className="flex gap-2">
                          <span className="px-3 py-1 bg-[#f3efe6] text-[10px] font-bold text-slate-500 rounded-lg">卧薪尝胆</span>
                          <span className="px-3 py-1 bg-[#f3efe6] text-[10px] font-bold text-slate-500 rounded-lg">破釜沉舟</span>
                          <span className="text-[10px] text-[#c0392b] font-black flex items-center px-2 cursor-pointer hover:underline">更多...</span>
                       </div>
                    </div>
                 </div>
              </section>
            </div>
          )}

          {view === 'search' && (
            <section className="animate-in fade-in duration-500">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <History size={16} className="text-slate-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">检索结果 ({results.length})</h2>
                  </div>
                  <button onClick={() => { setView('home'); setQuery(''); }} className="text-[10px] font-black text-[#c0392b] flex items-center gap-1">
                    <ArrowLeft size={12} /> 返回首页
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                  {results.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedIdiom(item)}
                      className="bg-white border border-[#e0d7c6] p-8 rounded-[1.5rem] md:rounded-[2.5rem] hover:border-[#c0392b] hover:shadow-xl transition-all cursor-pointer group flex flex-col h-full"
                    >
                       <div className="flex justify-between items-start mb-4">
                          <h3 className="text-3xl md:text-5xl font-black text-[#2c3e50] group-hover:text-[#c0392b] transition-colors" style={{ fontFamily: 'serif' }}>{item.word}</h3>
                          <span className="text-[9px] font-mono text-[#c0392b]/30 font-black uppercase">{item.abbreviation}</span>
                       </div>
                       <div className="text-[10px] md:text-xs font-mono text-[#c0392b] font-bold italic mb-4 tracking-[0.2em]">{item.pinyin}</div>
                       <p className="text-xs md:text-sm text-slate-500 line-clamp-3 leading-relaxed border-l-2 border-[#f3efe6] pl-4 italic flex-1">
                         {item.explanation}
                       </p>
                       <div className="mt-6 pt-4 border-t border-[#f3efe6] flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-black uppercase text-slate-300">Read Details</span>
                          <ChevronRight size={14} className="text-[#c0392b]" />
                       </div>
                    </div>
                  ))}
                  
                  {results.length === 0 && !isLoading && (
                    <div className="col-span-full py-24 text-center">
                       <Quote size={48} className="mx-auto text-[#f3efe6] mb-6" />
                       <p className="text-slate-400 font-bold tracking-widest uppercase text-xs italic">未能在古籍中寻得相关词条</p>
                       <button onClick={() => setQuery('')} className="mt-6 px-10 py-3 bg-[#2c3e50] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">重置检索</button>
                    </div>
                  )}
               </div>
            </section>
          )}

          {view === 'challenge' && quizItem && (
            <section className="max-w-2xl mx-auto py-10 md:py-20 animate-in zoom-in duration-500">
               <div className="text-center mb-16">
                  <div className="inline-block px-4 py-1.5 bg-[#c0392b]/10 text-[#c0392b] rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-4 italic">CHALLENGE_MODE</div>
                  <h2 className="text-3xl md:text-5xl font-black text-[#2c3e50] mb-6">补全成语，见微知著</h2>
                  <div className="bg-white border-2 border-[#e0d7c6] p-8 rounded-[2rem] shadow-inner italic text-lg text-slate-600 leading-relaxed">
                     “{quizItem.explanation}”
                  </div>
               </div>

               <div className="flex justify-center gap-4 mb-16">
                  {[0, 1, 2, 3].map(idx => (
                    <input
                      key={idx}
                      maxLength={1}
                      value={quizInput[idx]}
                      onChange={(e) => {
                        const next = [...quizInput];
                        next[idx] = e.target.value;
                        setQuizInput(next);
                        if(e.target.value && idx < 3) (e.target.nextSibling as HTMLInputElement)?.focus();
                      }}
                      className={`w-16 h-20 md:w-24 md:h-32 text-center text-4xl md:text-6xl font-black bg-white border-2 rounded-2xl md:rounded-[2rem] transition-all outline-none ${
                        quizStatus === 'success' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 
                        quizStatus === 'error' ? 'border-red-500 animate-shake bg-red-50' : 
                        'border-[#e0d7c6] focus:border-[#c0392b] text-[#2c3e50]'
                      }`}
                      style={{ fontFamily: 'serif' }}
                    />
                  ))}
               </div>

               <div className="flex gap-4">
                  <button onClick={handleQuizSubmit} className="flex-1 py-5 bg-[#c0392b] text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.3em] shadow-xl hover:shadow-2xl transition-all active:scale-95">验证我的推断</button>
                  <button onClick={() => setView('home')} className="px-10 py-5 bg-white border border-[#e0d7c6] text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#f3efe6]">放弃</button>
               </div>
            </section>
          )}
        </div>
      </main>

      {/* 详情弹窗 */}
      {selectedIdiom && (
        <div className="fixed inset-0 z-[100] bg-[#2c3e50]/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6 animate-in fade-in duration-300" onClick={() => setSelectedIdiom(null)}>
           <div 
            className="bg-[#FDFBF7] w-full max-w-4xl h-[92dvh] md:h-auto md:max-h-[85vh] rounded-t-[3rem] md:rounded-[4rem] shadow-2xl relative overflow-hidden border-t md:border border-[#e0d7c6] flex flex-col"
            onClick={e => e.stopPropagation()}
           >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-[#c0392b] to-transparent opacity-60"></div>
              
              <button 
                onClick={() => setSelectedIdiom(null)}
                className="absolute top-6 right-6 md:top-10 md:right-12 p-3 bg-[#f3efe6] text-slate-500 hover:text-red-500 rounded-full transition-all z-10 active:scale-90"
              >
                <X size={20}/>
              </button>

              <div className="flex-1 overflow-y-auto no-scrollbar p-10 md:p-20">
                 <div className="flex flex-col md:flex-row items-baseline gap-6 md:gap-10 mb-12 border-b border-[#e0d7c6] pb-12 text-center md:text-left">
                    <h2 className="text-6xl md:text-[7rem] font-black text-[#2c3e50] tracking-tighter leading-none" style={{ fontFamily: 'serif' }}>{selectedIdiom.word}</h2>
                    <span className="text-xl md:text-3xl font-mono italic text-[#c0392b] tracking-[0.2em]">{selectedIdiom.pinyin}</span>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div className="lg:col-span-8 space-y-12">
                       <section>
                          <div className="flex items-center gap-3 mb-6">
                             <BookOpenCheck size={18} className="text-[#c0392b]" />
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">语义详释 / MEANING</h4>
                          </div>
                          <p className="text-2xl md:text-3xl text-[#2c3e50] leading-relaxed font-bold italic">
                             {selectedIdiom.explanation}
                          </p>
                       </section>

                       <section>
                          <div className="flex items-center gap-3 mb-6">
                             <Languages size={18} className="text-[#c0392b]" />
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">典籍出处 / DERIVATION</h4>
                          </div>
                          <div className="p-8 bg-[#f3efe6] border-l-4 border-[#c0392b] rounded-r-[1.5rem] shadow-inner">
                             <p className="text-sm md:text-base text-slate-700 leading-relaxed font-medium italic">
                               {selectedIdiom.derivation || "此语载于经传，融入血脉，历经千载而弥新。"}
                             </p>
                          </div>
                       </section>

                       {selectedIdiom.example && (
                        <section>
                           <div className="flex items-center gap-3 mb-6">
                               <Quote size={18} className="text-[#c0392b]" />
                               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">现代语境 / EXAMPLE</h4>
                           </div>
                           <p className="text-base md:text-lg text-slate-500 leading-relaxed font-light italic pl-8 relative">
                              <span className="absolute left-0 top-0 text-3xl text-[#c0392b]/20">“</span>
                              {selectedIdiom.example}
                              <span className="absolute -bottom-4 text-3xl text-[#c0392b]/20">”</span>
                           </p>
                        </section>
                       )}
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-6">
                       <div className="bg-white border border-[#e0d7c6] p-8 rounded-[2rem] shadow-sm">
                          <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">研习勋章</h5>
                          <div className="flex flex-col items-center gap-4 text-center">
                             <div className="w-20 h-20 bg-[#f3efe6] rounded-full flex items-center justify-center border-4 border-white shadow-xl">
                                <Star className="text-amber-500 fill-amber-500" size={32} />
                             </div>
                             <p className="text-[10px] font-bold text-slate-500">已加入你的每日研习计划</p>
                          </div>
                       </div>
                       <button onClick={() => {}} className="w-full py-5 bg-[#2c3e50] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#c0392b] transition-all shadow-xl active:scale-95">保存至古籍馆</button>
                    </div>
                 </div>

                 <div className="mt-16 pt-10 border-t border-[#f3efe6] flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] text-slate-300 font-mono tracking-[0.3em] uppercase">
                    <span className="flex items-center gap-3"><Info size={14}/> ENTRY_INDEX: {selectedIdiom.id.toString().padStart(6, '0')}</span>
                    <button onClick={() => setSelectedIdiom(null)} className="w-full md:w-auto px-12 py-4 bg-[#f3efe6] text-slate-600 rounded-full font-black text-[10px] hover:bg-[#e0d7c6] transition-colors">完成研读</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      <footer className="h-10 bg-white/90 border-t border-[#e0d7c6] px-4 md:px-10 flex items-center justify-between z-20 text-[8px] md:text-[10px] font-bold tracking-widest text-slate-400 italic shrink-0">
        <div className="flex gap-4 md:gap-10 truncate">
           <span className="flex items-center gap-1.5 whitespace-nowrap">
             <span className="w-1.5 h-1.5 bg-[#c0392b] rounded-full animate-pulse"></span>
             文化脉络: SYNC_ESTABLISHED
           </span>
           <span className="uppercase tracking-[0.2em] hidden xs:inline">Archived_Records: 31,000+</span>
        </div>
        <div className="flex items-center gap-4 shrink-0">
           <span className="flex items-center gap-1.5"><Bookmark size={10} /> 收藏 (0)</span>
           <span className="hidden sm:block">V3.0_MASTER_EDITION</span>
        </div>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default IdiomApp;
