
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { EDUCATION_ITEMS, ENTERTAINMENT_ITEMS, UTILITIES_ITEMS } from './constants';
import { AppItem } from './types';
import AppCard from './components/AppCard';
import Modal from './components/Modal';
import KnowledgeBanner from './components/KnowledgeBanner';
import ErrorBoundary from './components/ErrorBoundary';
import Button from './components/ui/Button';
import Card from './components/ui/Card';
import Typography from './components/ui/Typography';
import { AnimatePresence, motion as motionBase } from 'framer-motion';
const motion = motionBase as any;
import { Search, ChevronRight, Book, LayoutGrid, Compass, Bookmark, Settings, Moon, Sun, Sparkles, Crown, Zap, Loader2 } from 'lucide-react';

// Lazy load sub-apps
const Earth3D = lazy(() => import('./components/Earth3D'));
const FoodChainApp = lazy(() => import('./components/FoodChainApp'));
const WaveApp = lazy(() => import('./components/WaveApp'));
const CharacterApp = lazy(() => import('./components/CharacterApp'));
const PoetryApp = lazy(() => import('./components/PoetryApp'));
const HistorySortingApp = lazy(() => import('./components/HistorySortingApp'));
const ClockApp = lazy(() => import('./components/ClockApp'));
const MathSprintApp = lazy(() => import('./components/MathSprintApp'));
const ThreeCharacterApp = lazy(() => import('./components/ThreeCharacterApp'));
const ThousandCharacterApp = lazy(() => import('./components/ThousandCharacterApp'));
const BrainTeaseApp = lazy(() => import('./components/BrainTeaseApp'));
const GobangApp = lazy(() => import('./components/GobangApp'));
const ChineseChessApp = lazy(() => import('./components/ChineseChessApp'));
const ChessApp = lazy(() => import('./components/ChessApp'));
const ProArtApp = lazy(() => import('./components/ProArtApp'));
const VocabularyApp = lazy(() => import('./components/VocabularyApp'));
const IdiomApp = lazy(() => import('./components/IdiomApp'));
const CurrencyConverterApp = lazy(() => import('./components/CurrencyConverterApp'));
const CapybaraComicApp = lazy(() => import('./components/CapybaraComicApp'));
const LibraryView = lazy(() => import('./components/LibraryView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const ExploreView = lazy(() => import('./components/ExploreView'));

type Tab = 'HOME' | 'EXPLORE' | 'LIBRARY' | 'PROFILE';
type Theme = 'light' | 'dark';

export interface UserInfo {
  email: string;
  avatarUrl: string;
  isPro?: boolean;
}

const LoadingOverlay = () => (
  <div className="fixed inset-0 z-[100] bg-morandi-oatmeal/80 dark:bg-dark-bg/80 backdrop-blur-md flex flex-col items-center justify-center">
    <div className="relative">
      <div className="w-24 h-24 border-4 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Sparkles className="text-brand-orange animate-pulse" size={32} />
      </div>
    </div>
    <p className="mt-8 text-sm font-black text-morandi-charcoal dark:text-white serif-font italic tracking-widest animate-pulse">
      INITIALIZING_MODULE...
    </p>
  </div>
);

const NavBtn: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  tooltip?: string;
}> = ({ icon, label, active, onClick, tooltip }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative ${
      active 
        ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' 
        : 'text-morandi-taupe hover:text-brand-orange hover:bg-white/50 dark:hover:bg-white/5'
    }`}
  >
    <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
      {icon}
    </span>
    <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    {active && (
      <motion.div 
        layoutId="nav-active"
        className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full"
      />
    )}
    {tooltip && !active && (
      <div className="absolute left-full ml-4 px-3 py-1 bg-morandi-charcoal text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
        {tooltip}
      </div>
    )}
  </button>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [selectedItem, setSelectedItem] = useState<AppItem | null>(null);
  const [runningAppId, setRunningAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('zst_theme') as Theme) || 'light');
  const [isCapybaraOpen, setIsCapybaraOpen] = useState(false);

  const allModules = [...EDUCATION_ITEMS, ...ENTERTAINMENT_ITEMS, ...UTILITIES_ITEMS];

  useEffect(() => {
    const savedIden = localStorage.getItem('zst_identity_v3');
    if (savedIden) setUser(JSON.parse(savedIden));
    const storedSaved = localStorage.getItem('zst_saved_v2');
    if (storedSaved) setSavedIds(JSON.parse(storedSaved));
    const storedHistory = localStorage.getItem('zst_history_v2');
    if (storedHistory) setHistoryIds(JSON.parse(storedHistory));
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('zst_theme', theme);
  }, [theme]);

  const handleRunAppById = (id: string) => {
    const item = allModules.find(m => m.id === id);
    if (item) handleRunApp(item);
  };

  const handleRunApp = (item: AppItem) => {
    setSelectedItem(null); 
    setHistoryIds(prev => [item.id, ...prev.filter(id => id !== item.id)].slice(0, 15));
    setRunningAppId(item.id);
  };

  const filteredModules = allModules.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      item.title.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query));
    
    const matchesCategory = activeCategory === 'ALL' || item.category.toUpperCase() === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const renderApp = () => {
    const closeApp = () => setRunningAppId(null);
    
    return (
      <ErrorBoundary onReset={closeApp}>
        <Suspense fallback={<LoadingOverlay />}>
          {(() => {
            switch (runningAppId) {
              case 'e1': return <Earth3D onClose={closeApp} />;
              case 'e2': return <FoodChainApp onClose={closeApp} />;
              case 'e3': return <WaveApp onClose={closeApp} />;
              case 'e4': return <CharacterApp onClose={closeApp} />;
              case 'e5': return <PoetryApp onClose={closeApp} />;
              case 'e6': return <HistorySortingApp onClose={closeApp} />;
              case 'e7': return <ClockApp onClose={closeApp} />;
              case 'e18': return <MathSprintApp onClose={closeApp} />;
              case 'e20': return <ThreeCharacterApp onClose={closeApp} />;
              case 'e21': return <ThousandCharacterApp onClose={closeApp} />;
              case 'ent3': return <BrainTeaseApp onClose={closeApp} />;
              case 'ent4': return <GobangApp onClose={closeApp} />;
              case 'ent5': return <ChineseChessApp onClose={closeApp} />;
              case 'ent6': return <ChessApp onClose={closeApp} />;
              case 'u1': return <ProArtApp onClose={closeApp} />;
              case 'u2': return <VocabularyApp onClose={closeApp} userEmail={user?.email} />;
              case 'u3': return <IdiomApp onClose={closeApp} />;
              case 'u4': return <CurrencyConverterApp onClose={closeApp} />;
              default: return null;
            }
          })()}
        </Suspense>
      </ErrorBoundary>
    );
  };

  if (runningAppId) return renderApp();

  return (
    <div className="flex h-screen bg-morandi-oatmeal dark:bg-dark-bg text-morandi-charcoal transition-colors duration-300 overflow-hidden">
      
      {/* 侧边栏 */}
      <aside className="w-80 bg-white/40 dark:bg-dark-card/40 backdrop-blur-xl border-r border-morandi-border dark:border-white/5 flex flex-col shrink-0 p-10 hidden md:flex">
        <div className="flex flex-col gap-4 mb-12 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center text-white shadow-lg">
               <Book size={24} />
            </div>
            <Typography variant="h2" className="text-2xl">OptPad</Typography>
          </div>
          <div className="flex items-center gap-2 px-1">
             <span className="h-px w-6 bg-brand-orange/40"></span>
             <Typography variant="caption" className="text-morandi-taupe dark:text-slate-500">智在简，美在恒</Typography>
          </div>
        </div>

        <nav className="flex-1 space-y-4">
          <NavBtn 
            icon={<LayoutGrid size={20}/>} 
            label="首页" 
            tooltip="浏览精选模块与最新内容"
            active={activeTab === 'HOME'} 
            onClick={() => setActiveTab('HOME')} 
          />
          <NavBtn 
            icon={<Compass size={20}/>} 
            label="探索" 
            tooltip="激发灵感，发现跨学科知识"
            active={activeTab === 'EXPLORE'} 
            onClick={() => setActiveTab('EXPLORE')} 
          />
          <NavBtn 
            icon={<Bookmark size={20}/>} 
            label="收藏" 
            tooltip="管理您的个人知识库"
            active={activeTab === 'LIBRARY'} 
            onClick={() => setActiveTab('LIBRARY')} 
          />
          <NavBtn 
            icon={<Settings size={20}/>} 
            label="设置" 
            tooltip="个性化您的节点配置"
            active={activeTab === 'PROFILE'} 
            onClick={() => setActiveTab('PROFILE')} 
          />
        </nav>

        {/* 会员卡片 */}
        <div className="mt-auto mb-6">
           <Card className="relative overflow-hidden bg-morandi-charcoal dark:bg-slate-200 p-6 group cursor-pointer shadow-xl transition-all hover:scale-[1.02]">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform"><Crown size={64} className="text-white dark:text-black" /></div>
              <div className="relative z-10">
                 <Typography variant="label" className="text-white dark:text-black mb-1 flex items-center gap-2">
                   OptPad Plus <Crown size={12} className="text-amber-400" />
                 </Typography>
                 <Typography variant="caption" className="text-white/50 dark:text-black/50 mb-4 block">解锁 AI 无限催化 & 高级算力</Typography>
                 <Button className="w-full py-2" size="sm">立即升级</Button>
              </div>
           </Card>
        </div>

        <div className="flex items-center justify-between px-2">
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex items-center gap-3 py-4 rounded-ios text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-brand-orange transition-all"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>Appearance</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/40 dark:bg-white/5 rounded-full border border-morandi-border dark:border-white/5">
             <Zap size={10} className="text-amber-500" />
             <span className="text-[8px] font-black text-slate-400">Tokens: 3k+</span>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
        
        {/* 移动端 Header */}
        <header className="md:hidden sticky top-0 bg-morandi-oatmeal/90 dark:bg-dark-bg/90 backdrop-blur-xl z-30 px-6 py-4 flex items-center justify-between pt-[env(safe-area-inset-top)] border-b border-morandi-border dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center text-white">
              <Book size={18} />
            </div>
            <Typography variant="h3" className="text-lg">OptPad</Typography>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </Button>
            <div className="w-8 h-8 rounded-full bg-morandi-blue/20 flex items-center justify-center">
              <Settings size={18} className="text-morandi-blue" />
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-12 py-6 md:py-10 flex flex-col">
          
          <section className="mb-8 md:mb-12 flex justify-center">
            <div className="relative w-full max-w-2xl group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-morandi-taupe group-focus-within:text-brand-orange transition-colors" size={20} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="键入检索词..."
                className="w-full bg-white dark:bg-dark-card border border-morandi-border dark:border-white/5 rounded-full py-3.5 md:py-4 pl-14 md:pl-16 pr-8 text-sm font-medium soft-shadow focus:ring-4 focus:ring-brand-orange/10 focus:border-brand-orange transition-all dark:text-white"
              />
            </div>
          </section>

          <AnimatePresence mode="wait">
            {activeTab === 'HOME' ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8 md:space-y-12">
                <KnowledgeBanner onRun={handleRunAppById} />

                <Card 
                  onClick={() => setIsCapybaraOpen(true)}
                  className="relative overflow-hidden p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br md:bg-gradient-to-r from-brand-orange-light to-transparent dark:from-orange-900/5 pointer-events-none"></div>
                  <div className="flex items-center gap-6 md:gap-10 relative z-10">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-brand-orange/10 rounded-ios flex items-center justify-center text-brand-orange shrink-0">
                       <Book size={32} className="md:w-12 md:h-12" />
                    </div>
                    <div>
                      <Typography variant="h2" className="text-xl md:text-3xl">卡皮巴拉成长日记</Typography>
                      <Typography variant="body" className="text-slate-400 mt-1">跟着柠檬与它的伙伴，开启一场温柔的自律进化...</Typography>
                    </div>
                  </div>
                  <Button className="relative z-10 w-full md:w-auto">
                    立即阅读 <ChevronRight size={16} className="ml-2" />
                  </Button>
                </Card>

                <section>
                   <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                         <Sparkles className="text-brand-orange" size={16} />
                         <Typography variant="label" className="text-morandi-charcoal dark:text-slate-100">核心模块集</Typography>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                      {filteredModules.map(item => (
                        <AppCard key={item.id} item={item} onClick={setSelectedItem} />
                      ))}
                   </div>
                </section>
                
                <div className="h-20 md:hidden" />
              </motion.div>
            ) : activeTab === 'EXPLORE' ? (
              <Suspense fallback={<Loader2 className="animate-spin" />}>
                <ExploreView allModules={allModules} onOpenItem={setSelectedItem} />
              </Suspense>
            ) : activeTab === 'LIBRARY' ? (
              <Suspense fallback={<Loader2 className="animate-spin" />}>
                <LibraryView allModules={allModules} savedIds={savedIds} historyIds={historyIds} onOpenItem={setSelectedItem} />
              </Suspense>
            ) : (
              <Suspense fallback={<Loader2 className="animate-spin" />}>
                <SettingsView theme={theme} onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} user={user} onUpdateUser={setUser} />
              </Suspense>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 移动端底部导航 */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-dark-card/90 backdrop-blur-2xl border-t border-morandi-border dark:border-white/5 py-3 px-8 flex justify-between safe-bottom z-50">
        <MobNavBtn icon={<LayoutGrid size={22}/>} active={activeTab === 'HOME'} onClick={() => setActiveTab('HOME')} />
        <MobNavBtn icon={<Compass size={22}/>} active={activeTab === 'EXPLORE'} onClick={() => setActiveTab('EXPLORE')} />
        <MobNavBtn icon={<Bookmark size={22}/>} active={activeTab === 'LIBRARY'} onClick={() => setActiveTab('LIBRARY')} />
        <MobNavBtn icon={<Settings size={22}/>} active={activeTab === 'PROFILE'} onClick={() => setActiveTab('PROFILE')} />
      </footer>

      <Suspense fallback={null}>
        <CapybaraComicApp isOpen={isCapybaraOpen} onClose={() => setIsCapybaraOpen(false)} onRunApp={handleRunAppById} />
      </Suspense>
      {selectedItem && (
        <Modal 
          item={selectedItem} 
          isSaved={savedIds.includes(selectedItem.id)}
          onToggleSave={(id) => setSavedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
          onClose={() => setSelectedItem(null)} 
          onRun={handleRunApp} 
          user={user} 
        />
      )}
    </div>
  );
};

const MobNavBtn = ({ icon, active, onClick }: { icon: React.ReactNode, active?: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`p-2 transition-all active:scale-90 ${active ? 'text-brand-orange' : 'text-slate-300 dark:text-slate-600'}`}>
    {icon}
  </button>
);

export default App;
