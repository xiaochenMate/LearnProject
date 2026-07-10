
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { EDUCATION_ITEMS, ENTERTAINMENT_ITEMS, UTILITIES_ITEMS } from './constants';
import { AppItem } from './types';
import { useTranslation } from './i18n';
import AppCard from './components/AppCard';
import Modal from './components/Modal';
import KnowledgeBanner from './components/KnowledgeBanner';
import ErrorBoundary from './components/ErrorBoundary';
import Button from './components/ui/Button';
import Card from './components/ui/Card';
import Typography from './components/ui/Typography';
import { AnimatePresence, motion as motionBase } from 'framer-motion';
const motion = motionBase as any;
import { Search, Compass, Bookmark, Settings, Moon, Sun, Loader2, Sparkles, LayoutGrid, Box } from 'lucide-react';

// Resilient Lazy Loading for chunk errors
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      
      if (!component || !component.default) {
         console.error("Component failed to load or has no default export", component);
         throw new Error("Module has no default export");
      }
      
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        return new Promise(() => {}); // Wait for reload
      }
      throw error;
    }
  });

// Lazy load sub-apps
const Earth3D = lazyWithRetry(() => import('./components/Earth3D'));
const FoodChainApp = lazyWithRetry(() => import('./components/FoodChainApp'));
const WaveApp = lazyWithRetry(() => import('./components/WaveApp'));
const CharacterApp = lazyWithRetry(() => import('./components/CharacterApp'));
const PoetryApp = lazyWithRetry(() => import('./components/PoetryApp'));
const HistorySortingApp = lazyWithRetry(() => import('./components/HistorySortingApp'));
const ClockApp = lazyWithRetry(() => import('./components/ClockApp'));
const MathSprintApp = lazyWithRetry(() => import('./components/MathSprintApp'));
const ThreeCharacterApp = lazyWithRetry(() => import('./components/ThreeCharacterApp'));
const ThousandCharacterApp = lazyWithRetry(() => import('./components/ThousandCharacterApp'));
const BrainTeaseApp = lazyWithRetry(() => import('./components/BrainTeaseApp'));
const GobangApp = lazyWithRetry(() => import('./components/GobangApp'));
const ChineseChessApp = lazyWithRetry(() => import('./components/ChineseChessApp'));
const ChessApp = lazyWithRetry(() => import('./components/ChessApp'));
const GoApp = lazyWithRetry(() => import('./components/GoApp'));
const ProArtApp = lazyWithRetry(() => import('./components/ProArtApp'));
const VocabularyApp = lazyWithRetry(() => import('./components/VocabularyApp'));
const IdiomApp = lazyWithRetry(() => import('./components/IdiomApp'));
const CurrencyConverterApp = lazyWithRetry(() => import('./components/CurrencyConverterApp'));
const CapybaraComicApp = lazyWithRetry(() => import('./components/CapybaraComicApp'));
const LibraryView = lazyWithRetry(() => import('./components/LibraryView'));
const SettingsView = lazyWithRetry(() => import('./components/SettingsView'));
const ExploreView = lazyWithRetry(() => import('./components/ExploreView'));

type Tab = 'HOME' | 'EXPLORE' | 'LIBRARY' | 'PROFILE';
type Theme = 'light' | 'dark';

export interface UserInfo {
  email: string;
  avatarUrl: string;
  isPro?: boolean;
}

const LoadingOverlay = () => (
  <div className="fixed inset-0 z-[100] bg-white/80 dark:bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center">
    <div className="relative">
      <Loader2 className="w-10 h-10 text-brand-accent animate-spin" />
    </div>
  </div>
);

const NavBtn: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group relative ${
      active 
        ? 'bg-black/5 dark:bg-white/10 text-black dark:text-white font-medium' 
        : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
    }`}
  >
    <span className={`transition-transform duration-200 ${active ? 'scale-105' : 'group-hover:scale-105'}`}>
      {icon}
    </span>
    <span className="text-sm">{label}</span>
  </button>
);

const safeStorage = {
  get: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Storage quota exceeded or unavailable', e);
    }
  }
};

const App: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [selectedItem, setSelectedItem] = useState<AppItem | null>(null);
  const [runningAppId, setRunningAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [theme, setTheme] = useState<Theme>(() => (safeStorage.get('zst_theme') as Theme) || 'light');
  const [isCapybaraOpen, setIsCapybaraOpen] = useState(false);

  const allModules = [...EDUCATION_ITEMS, ...ENTERTAINMENT_ITEMS, ...UTILITIES_ITEMS];

  useEffect(() => {
    const savedIden = safeStorage.get('zst_identity_v3');
    if (savedIden) setUser(JSON.parse(savedIden));
    const storedSaved = safeStorage.get('zst_saved_v2');
    if (storedSaved) setSavedIds(JSON.parse(storedSaved));
    const storedHistory = safeStorage.get('zst_history_v2');
    if (storedHistory) setHistoryIds(JSON.parse(storedHistory));
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    safeStorage.set('zst_theme', theme);
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
    return item.title.toLowerCase().includes(query) || 
      item.description.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query));
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
              case 'ent7': return <GoApp onClose={closeApp} />;
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

  if (runningAppId) {
    const item = allModules.find(m => m.id === runningAppId);
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#FAFAFA] dark:bg-[#000000] text-gray-900 dark:text-gray-100 animate-in fade-in duration-300">
        <header className="h-14 md:h-16 px-4 md:px-6 flex items-center justify-between border-b border-black/5 dark:border-white/10 shrink-0 bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-base md:text-lg font-semibold tracking-tight">{item?.name}</h1>
          </div>
          <button onClick={() => setRunningAppId(null)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>
        <main className="flex-1 relative overflow-hidden flex flex-col">
          {renderApp()}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#FAFAFA] dark:bg-[#000000] text-[#171717] dark:text-[#EDEDED] transition-colors duration-300 overflow-hidden font-sans selection:bg-brand-accent selection:text-white">
      
      {/* Sidebar - Desktop */}
      <aside className="w-64 bg-white/50 dark:bg-[#111]/50 backdrop-blur-2xl border-r border-black/5 dark:border-white/10 flex-col shrink-0 p-6 hidden md:flex z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col gap-1 mb-10 px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black">
               <Box size={18} strokeWidth={2.5} />
            </div>
            <Typography variant="h3" className="text-xl font-semibold tracking-tight">OptPad</Typography>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <NavBtn 
            icon={<LayoutGrid size={18}/>} 
            label={t('overview')} 
            active={activeTab === 'HOME'} 
            onClick={() => setActiveTab('HOME')} 
          />
          <NavBtn 
            icon={<Compass size={18}/>} 
            label={t('explore')} 
            active={activeTab === 'EXPLORE'} 
            onClick={() => setActiveTab('EXPLORE')} 
          />
          <NavBtn 
            icon={<Bookmark size={18}/>} 
            label={t('library')} 
            active={activeTab === 'LIBRARY'} 
            onClick={() => setActiveTab('LIBRARY')} 
          />
          <NavBtn 
            icon={<Settings size={18}/>} 
            label={t('settings')} 
            active={activeTab === 'PROFILE'} 
            onClick={() => setActiveTab('PROFILE')} 
          />
        </nav>

        <div className="mt-auto px-2">
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="flex items-center justify-between w-full p-3 rounded-lg border border-black/5 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
               {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
               <span>{theme === 'light' ? t('darkMode') : t('lightMode')}</span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col items-center">
        
        {/* Mobile Header */}
        <header className="md:hidden w-full sticky top-0 bg-[#FAFAFA]/80 dark:bg-black/80 backdrop-blur-xl z-30 px-6 py-4 flex items-center justify-between border-b border-black/5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center text-white dark:text-black">
              <Box size={18} strokeWidth={2.5} />
            </div>
            <Typography variant="h3" className="text-lg font-semibold tracking-tight">OptPad</Typography>
          </div>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 -mr-2">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </header>

        <div className="w-full max-w-5xl px-6 md:px-12 py-8 md:py-12 flex flex-col flex-1">
          
          <section className="mb-10 w-full">
            <div className="relative w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-accent transition-colors" size={18} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchModules')}
                className="w-full bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent transition-all dark:text-white placeholder:text-gray-400 shadow-sm"
              />
            </div>
          </section>

          <AnimatePresence mode="wait">
            {activeTab === 'HOME' ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-10">
                <KnowledgeBanner onRun={handleRunAppById} />

                <section>
                   <div className="flex items-center justify-between mb-6">
                      <Typography variant="h3" className="text-xl font-semibold tracking-tight">{t('featured')}</Typography>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* Promo Card */}
                     <Card 
                       onClick={() => setIsCapybaraOpen(true)}
                       className="relative overflow-hidden p-6 flex flex-col justify-between group cursor-pointer bg-gradient-to-br from-[#0070F3]/5 to-transparent border-transparent hover:border-[#0070F3]/20 transition-all h-[180px]"
                     >
                       <div className="relative z-10">
                         <div className="flex items-center gap-2 text-[#0070F3] mb-2">
                           <Sparkles size={14} />
                           <span className="text-xs font-medium uppercase tracking-wider">Spotlight</span>
                         </div>
                         <Typography variant="h2" className="text-2xl font-semibold mb-1 text-[#171717] dark:text-white">{t('capybaraTitle')}</Typography>
                         <Typography variant="body" className="text-gray-500 dark:text-gray-400 text-sm">{t('capybaraDesc')}</Typography>
                       </div>
                       <div className="relative z-10 flex justify-end">
                         <span className="text-sm font-medium text-[#0070F3] opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">{t('readNow')} &rarr;</span>
                       </div>
                     </Card>
                     
                     <Card 
                       onClick={() => handleRunAppById('ent6')}
                       className="relative overflow-hidden p-6 flex flex-col justify-between group cursor-pointer hover:border-black/20 dark:hover:border-white/30 transition-all h-[180px]"
                     >
                       <div className="relative z-10">
                         <Typography variant="h2" className="text-2xl font-semibold mb-1">{t('chessTitle')}</Typography>
                         <Typography variant="body" className="text-gray-500 dark:text-gray-400 text-sm">{t('chessDesc')}</Typography>
                       </div>
                       <div className="relative z-10 flex justify-end">
                         <span className="text-sm font-medium opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">{t('play')} &rarr;</span>
                       </div>
                     </Card>
                   </div>
                </section>

                 <section>
                   <div className="flex items-center justify-between mb-6 mt-4">
                      <Typography variant="h3" className="text-xl font-semibold tracking-tight">{t('modules')}</Typography>
                   </div>

                   {filteredModules.length > 0 ? (
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredModules.map(item => (
                          <AppCard key={item.id} item={item} onClick={setSelectedItem} />
                        ))}
                     </div>
                   ) : (
                     <div className="w-full flex flex-col items-center justify-center py-20 border border-black/5 dark:border-white/10 border-dashed rounded-2xl">
                        <Typography variant="body" className="text-gray-500">
                          {t('noModulesFound')}
                        </Typography>
                     </div>
                   )}
                </section>
                
                <div className="h-24 md:hidden" />
              </motion.div>
            ) : activeTab === 'EXPLORE' ? (
              <Suspense fallback={<Loader2 className="animate-spin m-auto" />}>
                <ExploreView allModules={allModules} onOpenItem={setSelectedItem} />
              </Suspense>
            ) : activeTab === 'LIBRARY' ? (
              <Suspense fallback={<Loader2 className="animate-spin m-auto" />}>
                <LibraryView allModules={allModules} savedIds={savedIds} historyIds={historyIds} onOpenItem={setSelectedItem} />
              </Suspense>
            ) : (
              <Suspense fallback={<Loader2 className="animate-spin m-auto" />}>
                <SettingsView theme={theme} onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')} user={user} onUpdateUser={setUser} />
              </Suspense>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-[#FAFAFA]/90 dark:bg-black/90 backdrop-blur-xl border-t border-black/5 dark:border-white/10 py-2 px-6 flex justify-around items-center safe-bottom z-50">
        <MobNavBtn icon={<LayoutGrid size={20}/>} label={t('home')} active={activeTab === 'HOME'} onClick={() => setActiveTab('HOME')} />
        <MobNavBtn icon={<Compass size={20}/>} label={t('explore')} active={activeTab === 'EXPLORE'} onClick={() => setActiveTab('EXPLORE')} />
        <MobNavBtn icon={<Bookmark size={20}/>} label={t('library')} active={activeTab === 'LIBRARY'} onClick={() => setActiveTab('LIBRARY')} />
        <MobNavBtn icon={<Settings size={20}/>} label={t('settings')} active={activeTab === 'PROFILE'} onClick={() => setActiveTab('PROFILE')} />
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

const MobNavBtn = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 transition-all ${active ? 'text-brand-accent' : 'text-gray-400 dark:text-gray-500'}`}>
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default App;
