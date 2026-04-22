
import React, { useEffect, useState } from 'react';
import { X, Heart, Share2, Info, PlayCircle, CheckCircle2 } from 'lucide-react';
import { AppItem } from '../types';
// Fix: Bypassing broken framer-motion types in this environment
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;

interface ModalProps {
  item: AppItem;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onClose: () => void;
  onRun: (item: AppItem) => void;
  user: { email: string } | null;
}

const Modal: React.FC<ModalProps> = ({ item, isSaved, onToggleSave, onClose, onRun, user }) => {
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
    <div className={`fixed inset-0 z-50 flex items-end md:items-center justify-center transition-all duration-300 ${isVisible ? 'bg-morandi-charcoal/20 dark:bg-black/60 backdrop-blur-md' : 'bg-transparent pointer-events-none'}`} onClick={handleClose}>
      <div 
        className={`relative w-full md:max-w-2xl h-[85dvh] md:h-auto bg-morandi-oatmeal dark:bg-dark-bg shadow-2xl rounded-t-[3rem] md:rounded-[3rem] overflow-hidden transform transition-all duration-300 border border-morandi-border dark:border-white/5 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10">
          <button onClick={handleClose} className="p-2 bg-white/80 dark:bg-dark-card/80 hover:bg-white dark:hover:bg-dark-card rounded-full transition-colors border border-morandi-border dark:border-white/5 text-morandi-taupe">
            <X size={20} />
          </button>
        </div>

        <div className="h-48 md:h-64 overflow-hidden relative">
          <img src={item.imageUrl} className="w-full h-full object-cover" alt={item.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-morandi-oatmeal dark:from-dark-bg via-transparent to-transparent"></div>
          <div className="absolute bottom-6 left-8">
            <h2 className="text-3xl md:text-5xl font-bold text-morandi-charcoal dark:text-white serif-font">{item.title}</h2>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-8 overflow-y-auto max-h-[calc(85dvh-16rem)] no-scrollbar transition-colors">
          <section>
            <div className="flex items-center gap-2 mb-4 text-morandi-taupe dark:text-slate-500">
              <Info size={16} />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">模块简介</h3>
            </div>
            <p className="text-lg text-morandi-charcoal dark:text-slate-300 leading-relaxed font-light italic">
              {item.description}
            </p>
          </section>

          <div className="flex flex-wrap gap-2">
            {item.tags.map(tag => (
              <span key={tag} className="px-4 py-1.5 bg-white dark:bg-dark-card border border-morandi-border dark:border-white/5 text-morandi-taupe dark:text-slate-500 text-[10px] font-bold rounded-xl">
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 pb-8">
            <button 
              onClick={() => onRun(item)}
              className="flex-1 py-4 bg-morandi-charcoal dark:bg-slate-200 text-white dark:text-dark-bg rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all hover:bg-black dark:hover:bg-white"
            >
              <PlayCircle size={24} />
              <span>启动程序</span>
            </button>
            <div className="flex gap-4">
              <motion.button 
                whileTap={{ scale: 1.2 }}
                onClick={() => onToggleSave(item.id)}
                className={`w-14 h-14 border rounded-2xl flex items-center justify-center transition-all shadow-sm ${isSaved ? 'bg-morandi-rose border-morandi-rose text-white' : 'bg-white dark:bg-dark-card border-morandi-border dark:border-white/5 text-morandi-rose hover:bg-morandi-rose/5'}`}
              >
                <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
              </motion.button>
              <button onClick={() => { setCopyFeedback(true); setTimeout(()=>setCopyFeedback(false), 2000); }} className="w-14 h-14 bg-white dark:bg-dark-card border border-morandi-border dark:border-white/5 text-morandi-blue rounded-2xl flex items-center justify-center hover:bg-morandi-blue hover:text-white transition-all shadow-sm">
                {copyFeedback ? <CheckCircle2 size={20} /> : <Share2 size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
