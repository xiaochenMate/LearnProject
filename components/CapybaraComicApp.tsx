
import React, { useState, useEffect } from 'react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { X, ChevronLeft, ChevronRight, Sparkles, Quote, BookOpen, Loader2, Image as ImageIcon, Zap, Stars, Book as BookIcon } from 'lucide-react';

// =========================================================================
// 配置区域
// =========================================================================

const getImgUrl = (key: string) => {
  return `/images/${key}.jpg`;
};

interface Panel {
  imgKey: string;
  desc: string;
  dialog: string;
  sfx: string;
}

interface Chapter {
  title: string;
  growth: number;
  panels: Panel[];
  summary: string;
}

const chapters: Chapter[] = [
  {
    title: "第一章：魔法降临",
    growth: 8,
    panels: [
      { imgKey: "ch1_1", desc: "柠檬睡得很香，怀里抱着他的卡皮巴拉玩偶。", dialog: "嘘——魔法开始了。", sfx: "✨ 嗡~" },
      { imgKey: "ch1_2", desc: "玩偶活过来了！它们正轻手轻脚地探索房间。", dialog: "妈妈，你看！我的腿能动了！", sfx: "🐾 哒哒" }
    ],
    summary: "我们要快快长大，才能真正陪伴柠檬。"
  },
  {
    title: "第二章：学霸模仿秀",
    growth: 16,
    panels: [
      { imgKey: "ch2_1", desc: "柠檬在写作业，卡皮在书本间穿梭。", dialog: "学习资料就是我们的成长阶梯。", sfx: "🖍️ 刷刷" },
      { imgKey: "ch2_2", desc: "皮皮学着柠檬的样子在认真看书。", dialog: "读过的书越多，魔法值越高。", sfx: "💡 叮！" }
    ],
    summary: "我也要变聪明，长得像书架那么高！"
  },
  {
    title: "第三章：花瓣百科",
    growth: 25,
    panels: [
      { imgKey: "ch3_1", desc: "阳台的花瓣就像巨大的粉色沙发。", dialog: "每一片花瓣，都记录着自然。", sfx: "🌸 芬芳" },
      { imgKey: "ch3_2", desc: "皮皮用露珠当放大镜观察小蚂蚁。", dialog: "这只蚂蚁长得好像坦克！", sfx: "🔍 发现" }
    ],
    summary: "静静观察，也是一种学习。"
  },
  {
    title: "第四章：异世游乐场",
    growth: 33,
    panels: [
      { imgKey: "ch4_1", desc: "画出来的彩虹变成了真实的滑梯。", dialog: "冲啊！彩虹滑梯太刺激啦！", sfx: "🌈 耶！" },
      { imgKey: "ch4_2", desc: "它们在恐龙画稿里玩捉迷藏。", dialog: "想象力就是我们最棒的玩具。", sfx: "🦖 吼~" }
    ],
    summary: "在画作的世界里，我们拥有了快乐时光。"
  },
  {
    title: "第五章：自律挑战",
    growth: 42,
    panels: [
      { imgKey: "ch5_1", desc: "卡皮们在积木轨道上跟着柠檬狂奔。", dialog: "我感觉到肌肉在生长了！", sfx: "🏃 呼呼" },
      { imgKey: "ch5_2", desc: "坚持自律，体型在慢慢变大。", dialog: "像柠檬一样自律就能长大。", sfx: "🥛 咕嘟" }
    ],
    summary: "所有的努力，都是为了最好的遇见。"
  },
  {
    title: "第六章：新年秘密",
    growth: 100,
    panels: [
      { imgKey: "ch6_1", desc: "新年钟声敲响，柠檬发现了已经长到手掌大的伙伴。", dialog: "你们……居然是真的活过来了？！", sfx: "🎊 砰！" },
      { imgKey: "ch6_2", desc: "拥抱彼此，这是最好的新年礼物。", dialog: "谢谢你带我们一起成长！", sfx: "❤️ 温暖" }
    ],
    summary: "最好的成长，就是我们一起变优秀。"
  }
];

const PanelCard: React.FC<{ panel: Panel }> = ({ panel }) => (
  <div className="flex flex-col bg-white/70 backdrop-blur-sm rounded-2xl border border-amber-900/5 shadow-sm overflow-hidden p-3 sm:p-5 mb-4 last:mb-0">
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-amber-900/5">
      <img 
        src={getImgUrl(panel.imgKey)} 
        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
        alt="Comic Panel"
        referrerPolicy="no-referrer"
        loading="lazy"
      />
      <div className="absolute top-2 right-2 bg-white/95 text-[#4a3728] px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black shadow-md border border-amber-900/10">
        {panel.sfx}
      </div>
    </div>
    <div className="px-1 mt-3">
      <div className="flex gap-2 mb-1.5 items-start">
        <Quote size={12} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] md:text-[14px] font-story italic text-amber-950 leading-relaxed">“{panel.dialog}”</p>
      </div>
      <p className="text-[8px] md:text-[10px] text-amber-800/40 font-bold leading-tight uppercase tracking-tighter border-t border-amber-900/5 pt-2 mt-1">{panel.desc}</p>
    </div>
  </div>
);

const Page: React.FC<{ panels: Panel[]; side: 'left' | 'right' }> = ({ panels, side }) => (
  <div className={`relative h-full flex flex-col bg-white overflow-visible ${side === 'left' ? 'md:rounded-l-[2.5rem] md:border-r border-black/5' : 'md:rounded-r-[2.5rem] md:border-l border-black/5 md:shadow-[inset_20px_0_40px_rgba(0,0,0,0.03)]'}`}>
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-30 pointer-events-none"></div>
    <div className="flex-1 p-5 sm:p-10 flex flex-col relative z-10">
      {panels.map((p, i) => (
        <PanelCard key={i} panel={p} />
      ))}
    </div>
    <div className={`absolute bottom-3 ${side === 'left' ? 'left-8' : 'right-8'} text-[8px] font-black text-amber-900/10 hidden md:block tracking-widest uppercase`}>
      Section_{side}
    </div>
  </div>
);

const CapybaraComicApp: React.FC<{ isOpen: boolean; onClose: () => void; onRunApp: (id: string) => void }> = ({ isOpen, onClose, onRunApp }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [direction, setDirection] = useState(0);

  const scrollToTop = () => {
    const container = document.getElementById('comic-scroll-root');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpToChapter = (idx: number) => {
    if (idx === currentIdx) return;
    setDirection(idx > currentIdx ? 1 : -1);
    setCurrentIdx(idx);
    scrollToTop();
  };

  const paginate = (newDir: number) => {
    const next = currentIdx + newDir;
    if (next >= 0 && next < chapters.length) {
      setDirection(newDir);
      setCurrentIdx(next);
      scrollToTop();
    }
  };

  const chapter = chapters[currentIdx];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          id="comic-scroll-root"
          className="fixed inset-0 z-[100] bg-[#e6e2d3] flex flex-col items-center overflow-y-auto no-scrollbar"
        >
          <div className="fixed inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern-with-fine-lines.png')] opacity-15 pointer-events-none"></div>

          {/* 头部面板：增强版直接跳转导航 */}
          <header className="sticky top-0 w-full max-w-7xl px-6 py-3 md:py-5 flex flex-col gap-3 z-[110] bg-[#e6e2d3]/90 backdrop-blur-md">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-amber-900/10">
                      <BookIcon size={20} className="text-amber-700" />
                    </div>
                    <div className="hidden sm:block">
                      <h1 className="text-sm md:text-xl font-black text-amber-900 font-kids leading-none">卡皮巴拉成长日记</h1>
                      <span className="text-[7px] md:text-[8px] font-black uppercase text-amber-700/30 tracking-[0.2em] mt-1 block">Visual Memoir v5.5 (Nav Ready)</span>
                    </div>
                </div>

                {/* 精简章节导航栏 */}
                <nav className="flex-1 max-w-lg mx-4 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar py-1">
                   {chapters.map((_, i) => (
                     <button 
                       key={i} 
                       onClick={() => jumpToChapter(i)}
                       className={`shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-lg text-[10px] md:text-xs font-black transition-all border flex items-center justify-center ${currentIdx === i ? 'bg-amber-900 border-amber-900 text-white shadow-lg scale-110' : 'bg-white/50 border-amber-900/10 text-amber-900/40 hover:bg-white hover:text-amber-900'}`}
                     >
                       {i + 1}
                     </button>
                   ))}
                </nav>

                <button onClick={onClose} className="p-2.5 bg-white/90 hover:bg-red-500 hover:text-white rounded-full shadow-lg text-amber-900/40 transition-all active:scale-90">
                  <X size={20}/>
                </button>
             </div>
          </header>

           <div className="relative w-full max-w-7xl flex flex-col items-center px-4 md:px-12 pb-24">
            <div className="my-6 w-48">
               <div className="bg-white/95 backdrop-blur px-4 py-1.5 rounded-full shadow-2xl border border-amber-900/5 flex items-center gap-3">
                  <Sparkles size={10} className="text-orange-400 animate-pulse" />
                  <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${chapter.growth}%` }} className="h-full bg-orange-400" />
                  </div>
                  <span className="text-[10px] font-black text-amber-900">{chapter.growth}%</span>
               </div>
            </div>

            <div className="relative w-full flex items-start">
               <button 
                 disabled={currentIdx === 0} onClick={() => paginate(-1)}
                 className="fixed left-4 md:left-8 lg:left-12 top-1/2 -translate-y-1/2 z-[120] p-3 text-amber-900/20 hover:text-amber-900 hover:scale-125 disabled:opacity-0 transition-all active:scale-75"
               >
                 <ChevronLeft size={64} strokeWidth={2.5} />
               </button>

               <button 
                 disabled={currentIdx === chapters.length - 1} onClick={() => paginate(1)}
                 className="fixed right-4 md:right-8 lg:right-12 top-1/2 -translate-y-1/2 z-[120] p-3 text-amber-900/20 hover:text-amber-900 hover:scale-125 disabled:opacity-0 transition-all active:scale-75"
               >
                 <ChevronRight size={64} strokeWidth={2.5} />
               </button>

               <div className="flex-1 bg-amber-900/10 rounded-[2.5rem] md:rounded-[3rem] p-1.5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] relative overflow-visible">
                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div 
                      key={currentIdx}
                      custom={direction}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4 }}
                      className="w-full h-fit bg-[#fdf6e3] rounded-[2.2rem] md:rounded-[2.8rem] overflow-hidden relative flex flex-col md:grid md:grid-cols-2 items-stretch"
                    >
                       <div className="absolute left-1/2 top-0 bottom-0 w-16 -translate-x-1/2 z-30 pointer-events-none hidden md:block">
                          <div className="w-full h-full bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>
                          <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-black/5 -translate-x-1/2 shadow-[0_0_10px_rgba(0,0,0,0.1)]"></div>
                       </div>

                       <Page panels={chapter.panels.slice(0, Math.ceil(chapter.panels.length / 2))} side="left" />
                       <Page panels={chapter.panels.slice(Math.ceil(chapter.panels.length / 2))} side="right" />

                       <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
                          <motion.h2 
                            initial={{ y: -20 }} animate={{ y: 0 }}
                            className="bg-[#B22222] text-white px-8 py-3 rounded-full text-xs md:text-sm font-kids shadow-2xl border border-white/20 whitespace-nowrap tracking-widest"
                          >
                            {chapter.title}
                          </motion.h2>
                       </div>
                    </motion.div>
                  </AnimatePresence>
               </div>
            </div>

            {currentIdx === chapters.length - 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-12 flex justify-center"
              >
                <button 
                  onClick={() => {
                    onClose();
                    // Open a related app, e.g., CharacterApp
                    onRunApp('e4');
                  }}
                  className="bg-amber-900 text-white px-8 py-4 rounded-full font-black text-sm md:text-base flex items-center gap-3 shadow-xl hover:bg-amber-800 transition-all hover:scale-105 active:scale-95"
                >
                  <Sparkles size={20} className="text-amber-300" />
                  继续探索汉字魔法
                  <ChevronRight size={20} />
                </button>
              </motion.div>
            )}
          </div>

          <footer className="w-full max-w-7xl px-12 py-8 flex justify-between items-center text-[9px] md:text-[11px] font-black text-amber-900/30 uppercase tracking-[0.4em]">
             <div className="flex gap-8">
                <span>© 2025 Story Engine</span>
                <span className="flex items-center gap-2 animate-pulse"><Stars size={10}/> FINALE_COLLECTION</span>
             </div>
             <div className="flex items-center gap-4">
                <span className="italic">PAGE_{currentIdx + 1} OF {chapters.length}</span>
                <div className="flex gap-1.5">
                   {chapters.map((_, i) => (
                     <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === currentIdx ? 'bg-amber-900 scale-150' : 'bg-amber-900/10'}`}></div>
                   ))}
                </div>
             </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CapybaraComicApp;
