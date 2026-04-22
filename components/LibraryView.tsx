
import React, { useState, useMemo } from 'react';
import { MoreVertical, ChevronRight, BookOpenCheck, Bookmark, History, Sparkles, ArrowRight, BookOpen } from 'lucide-react';
// Fix: Bypassing broken framer-motion types in this environment
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { AppItem } from '../types';

interface LibraryViewProps {
  allModules: AppItem[];
  savedIds: string[];
  historyIds: string[];
  onOpenItem: (item: AppItem) => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ allModules, savedIds, historyIds, onOpenItem }) => {
  const [activeTab, setActiveTab] = useState<'SAVED' | 'HISTORY'>('SAVED');

  const savedItems = useMemo(() => 
    allModules.filter(m => savedIds.includes(m.id)), 
  [allModules, savedIds]);

  const historyItems = useMemo(() => 
    historyIds.map(id => allModules.find(m => m.id === id)).filter(Boolean) as AppItem[],
  [allModules, historyIds]);

  const currentList = activeTab === 'SAVED' ? savedItems : historyItems;

  const categoryColors: Record<string, string> = {
    education: '#A3B1B7',
    entertainment: '#D4A5A5',
    utilities: '#A8B7A3'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col px-6 pt-6 overflow-hidden"
    >
      <header className="flex items-center justify-between mb-8 shrink-0">
        <h2 className="text-2xl font-bold text-morandi-charcoal dark:text-slate-100 serif-font">我的图书馆</h2>
        <div className="p-2 bg-white/50 dark:bg-dark-card/50 border border-morandi-border dark:border-white/5 rounded-xl transition-colors">
           <Sparkles size={18} className="text-morandi-taupe dark:text-slate-500" />
        </div>
      </header>

      {/* 分段选择器 */}
      <div className="bg-morandi-taupe/10 dark:bg-white/5 p-1.5 rounded-[1.5rem] flex mb-8 shrink-0 transition-colors">
        <button 
          onClick={() => setActiveTab('SAVED')}
          className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'SAVED' ? 'bg-white dark:bg-dark-card text-morandi-charcoal dark:text-slate-100 shadow-sm' : 'text-morandi-taupe dark:text-slate-600'}`}
        >
          <Bookmark size={14} /> 收藏集 ({savedItems.length})
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'bg-white dark:bg-dark-card text-morandi-charcoal dark:text-slate-100 shadow-sm' : 'text-morandi-taupe dark:text-slate-600'}`}
        >
          <History size={14} /> 历史记录
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <AnimatePresence mode="wait">
          {currentList.length > 0 ? (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {currentList.map((item, idx) => (
                <motion.div 
                  key={`${item.id}-${idx}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenItem(item)}
                  className="bg-white/60 dark:bg-dark-card/60 border border-morandi-border dark:border-white/5 p-4 rounded-[2rem] flex items-center gap-4 soft-shadow cursor-pointer transition-all hover:bg-white dark:hover:bg-dark-card"
                >
                  <div className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: `${categoryColors[item.category]}20` }}>
                    <div className="absolute inset-0 watercolor-fill opacity-20" style={{ backgroundColor: categoryColors[item.category] }}></div>
                    <img src={item.imageUrl} className="w-full h-full object-cover opacity-60" alt="" />
                    <BookOpenCheck size={20} className="absolute text-white drop-shadow-md" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-morandi-charcoal dark:text-slate-100 truncate text-sm">{item.title}</h4>
                    <p className="text-[10px] text-morandi-taupe dark:text-slate-600 font-medium mt-1 uppercase tracking-wider">{item.category}</p>
                  </div>

                  <ChevronRight size={16} className="text-morandi-border dark:text-slate-800" />
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
              <div className="w-32 h-32 bg-morandi-taupe/10 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 relative transition-colors">
                 <div className="absolute inset-0 watercolor-fill opacity-10 dark:opacity-5 bg-morandi-charcoal dark:bg-slate-200"></div>
                 <BookOpen size={48} className="text-morandi-taupe/40 dark:text-slate-700" />
              </div>
              <h3 className="text-lg font-bold text-morandi-charcoal dark:text-slate-300 serif-font mb-2">
                {activeTab === 'SAVED' ? '还没有收藏任何模块' : '暂无历史记录'}
              </h3>
              <p className="text-xs text-morandi-taupe dark:text-slate-600 max-w-[200px] leading-relaxed mb-8">
                去“发现”页面探索更多有趣的知识领域吧。
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-morandi-charcoal dark:bg-slate-200 text-white dark:text-dark-bg rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
              >
                开始探索 <ArrowRight size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LibraryView;
