
import React, { useEffect, useState } from 'react';
import { X, Heart, Share2, Info, PlayCircle, CheckCircle2 } from 'lucide-react';
import { AppItem } from '../types';
import { motion as motionBase } from 'framer-motion';
const motion = motionBase as any;
import { useTranslation } from '../i18n';

interface ModalProps {
  item: AppItem;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onClose: () => void;
  onRun: (item: AppItem) => void;
  user: { email: string } | null;
}

const Modal: React.FC<ModalProps> = ({ item, isSaved, onToggleSave, onClose, onRun, user }) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-end md:items-center justify-center transition-all duration-300 ${isVisible ? 'bg-black/20 dark:bg-black/80 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`} onClick={handleClose}>
      <div 
        className={`relative w-full md:max-w-2xl h-[85dvh] md:h-auto bg-white dark:bg-[#111] md:rounded-3xl overflow-hidden transform transition-all duration-300 border border-transparent dark:border-white/10 shadow-2xl ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10">
          <button onClick={handleClose} className="p-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-full transition-colors text-gray-500 dark:text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="h-48 md:h-64 overflow-hidden relative">
          <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#111] via-white/50 dark:via-[#111]/50 to-transparent"></div>
          <div className="absolute bottom-6 left-8 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#222] flex items-center justify-center shadow-lg border border-black/5 dark:border-white/5">
              <span className="material-icons-outlined text-3xl text-gray-700 dark:text-gray-300">{item.icon || 'apps'}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{item.title}</h2>
          </div>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(85dvh-16rem)] no-scrollbar">
          <section>
            <div className="flex items-center gap-2 mb-3 text-gray-400">
              <Info size={16} />
              <h3 className="text-[11px] font-semibold uppercase tracking-wider">{t('aboutModule')}</h3>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
              {item.description}
            </p>
          </section>

          <div className="flex flex-wrap gap-2">
            {item.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-400 text-[11px] font-medium rounded-full">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-8">
            <button 
              onClick={() => onRun(item)}
              className="flex-1 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:bg-gray-800 dark:hover:bg-gray-200 active:scale-[0.98]"
            >
              <PlayCircle size={20} />
              <span>{t('launch')}</span>
            </button>
            <div className="flex gap-4">
              <motion.button 
                whileTap={{ scale: 1.1 }}
                onClick={() => onToggleSave(item.id)}
                className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${isSaved ? 'bg-red-50 text-red-500 dark:bg-red-500/20' : 'bg-black/5 dark:bg-white/5 text-gray-500 hover:bg-black/10 dark:hover:bg-white/10'}`}
              >
                <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
              </motion.button>
              <button onClick={() => { setCopyFeedback(true); setTimeout(()=>setCopyFeedback(false), 2000); }} className="w-14 h-14 bg-black/5 dark:bg-white/5 text-gray-500 rounded-xl flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-all">
                {copyFeedback ? <CheckCircle2 size={20} className="text-green-500" /> : <Share2 size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
