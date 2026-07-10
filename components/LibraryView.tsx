
import React, { useState, useMemo } from 'react';
import { ChevronRight, Bookmark, History, Sparkles, BookOpen } from 'lucide-react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { AppItem } from '../types';
import { useTranslation } from '../i18n';

interface LibraryViewProps {
  allModules: AppItem[];
  savedIds: string[];
  historyIds: string[];
  onOpenItem: (item: AppItem) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ allModules, savedIds, historyIds, onOpenItem }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'SAVED' | 'HISTORY'>('SAVED');

  const savedItems = useMemo(() => 
    allModules.filter(m => savedIds.includes(m.id)), 
  [allModules, savedIds]);

  const historyItems = useMemo(() => 
    historyIds.map(id => allModules.find(m => m.id === id)).filter(Boolean) as AppItem[],
  [allModules, historyIds]);

  const currentList = activeTab === 'SAVED' ? savedItems : historyItems;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col pt-6 overflow-hidden max-w-4xl w-full mx-auto"
    >
      <header className="flex flex-col mb-10 shrink-0">
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white tracking-tight mb-2">{t('libraryTitle')}</h2>
        <p className="text-gray-500 dark:text-gray-400">{t('libraryDesc')}</p>
      </header>

      {/* Tabs */}
      <div className="bg-[#FAFAFA] dark:bg-[#111] p-1 rounded-xl flex mb-8 shrink-0 transition-colors w-full max-w-sm border border-black/5 dark:border-white/5">
        <button 
          onClick={() => setActiveTab('SAVED')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'SAVED' ? 'bg-white dark:bg-[#222] text-gray-900 dark:text-white shadow-sm border border-black/5 dark:border-white/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Bookmark size={16} /> {t('saved')} ({savedItems.length})
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'bg-white dark:bg-[#222] text-gray-900 dark:text-white shadow-sm border border-black/5 dark:border-white/5' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <History size={16} /> {t('history')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <AnimatePresence mode="wait">
          {currentList.length > 0 ? (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {currentList.map((item, idx) => (
                <motion.div 
                  key={`${item.id}-${idx}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenItem(item)}
                  className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 p-4 rounded-2xl flex items-center gap-4 cursor-pointer transition-all hover:border-black/10 dark:hover:border-white/20 group"
                >
                  <div className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center relative overflow-hidden bg-black/5 dark:bg-white/5 text-gray-400 group-hover:text-brand-accent transition-colors">
                    <span className="material-icons-outlined text-2xl">{item.icon || 'apps'}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate text-base">{item.title}</h4>
                    <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wider">{item.category}</p>
                  </div>

                  <ChevronRight size={16} className="text-gray-300 dark:text-gray-700 group-hover:text-gray-500 transition-colors" />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 bg-[#FAFAFA] dark:bg-[#111] rounded-2xl flex items-center justify-center mb-6 text-gray-300 dark:text-gray-700">
                 <BookOpen size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-2">
                {activeTab === 'SAVED' ? t('noSaved') : t('noHistory')}
              </h3>
              <p className="text-sm text-gray-500 max-w-[250px]">
                {t('exploreHome')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LibraryView;
