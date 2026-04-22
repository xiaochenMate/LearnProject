
import React, { useState, useRef } from 'react';
// Fix: Bypassing broken framer-motion types in this environment
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { X, Sparkles, Send, Loader2, Zap, ArrowUpRight, Atom, Binary, BrainCircuit } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface CatalystResult {
  title: string;
  nucleus: string; // 核心定义
  orbitals: string[]; // 三个关联事实
  logicJump: {
    suggestion: string;
    relatedAppId: string;
  };
}

interface KnowledgeCatalystProps {
  isOpen: boolean;
  onClose: () => void;
  onRunApp: (id: string) => void;
}

const KnowledgeCatalyst: React.FC<KnowledgeCatalystProps> = ({ isOpen, onClose, onRunApp }) => {
  const [input, setInput] = useState('');
  const [isCatalyzing, setIsCatalyzing] = useState(false);
  const [result, setResult] = useState<CatalystResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCatalyze = async () => {
    if (!input.trim() || isCatalyzing) return;
    setIsCatalyzing(true);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `分析概念: "${input}"。请将其转化为结构化的知识卡片。`,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "你是一个跨学科知识催化专家。你的任务是把复杂的概念简化为精美的知识节点。relatedAppId 必须从以下集合中选择一个最相关的：e1(地理/天文), e5(文化/诗词), e18(数学/逻辑), ent6(国际象棋/博弈), u1(艺术/绘画), u3(成语/检索)。",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              nucleus: { type: Type.STRING, description: '20字以内的核心本质定义' },
              orbitals: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: '三个简短的衍生知识点'
              },
              logicJump: {
                type: Type.OBJECT,
                properties: {
                  suggestion: { type: Type.STRING, description: '联系现实的有趣启发' },
                  relatedAppId: { type: Type.STRING }
                },
                required: ['suggestion', 'relatedAppId']
              }
            },
            required: ['title', 'nucleus', 'orbitals', 'logicJump']
          }
        }
      });

      const data = JSON.parse(response.text) as CatalystResult;
      setResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCatalyzing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10"
        >
          {/* 背景模糊层 */}
          <div className="absolute inset-0 bg-morandi-charcoal/20 dark:bg-black/80 backdrop-blur-2xl" onClick={onClose} />
          
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-2xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e: any) => e.stopPropagation()}
          >
            {/* 顶栏 */}
            <div className="p-8 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-morandi-charcoal dark:bg-slate-200 text-white dark:text-dark-bg rounded-2xl flex items-center justify-center shadow-lg">
                    <BrainCircuit size={20} className={isCatalyzing ? 'animate-pulse' : ''} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white serif-font italic tracking-tight">知识催化器</h3>
                    <p className="text-[8px] text-white/40 uppercase tracking-[0.3em] font-mono">Input_Concept_Collapse</p>
                  </div>
               </div>
               <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
                 <X size={24} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-8 pt-0">
               {/* 输入区域 */}
               <div className="relative mb-10">
                  <input 
                    ref={inputRef}
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCatalyze()}
                    placeholder="键入任何你想探究的概念..."
                    className="w-full bg-white/5 border-2 border-white/10 rounded-3xl py-6 pl-8 pr-20 text-xl font-bold text-white placeholder:text-white/20 focus:border-white/30 transition-all outline-none"
                  />
                  <button 
                    onClick={handleCatalyze}
                    disabled={isCatalyzing || !input.trim()}
                    className="absolute right-3 top-3 bottom-3 px-6 bg-white dark:bg-slate-200 text-black dark:text-dark-bg rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-30 transition-all"
                  >
                    {isCatalyzing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
               </div>

               {/* 结果展示 */}
               <AnimatePresence mode="wait">
                  {isCatalyzing ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="py-20 flex flex-col items-center justify-center text-center"
                    >
                       <div className="relative mb-8">
                          <div className="w-24 h-24 border-4 border-white/5 border-t-white rounded-full animate-spin"></div>
                          <Atom className="absolute inset-0 m-auto text-white/40 animate-pulse" size={32} />
                       </div>
                       <p className="text-white/60 font-mono text-xs tracking-[0.4em] uppercase animate-pulse">Neural_Processing...</p>
                    </motion.div>
                  ) : result ? (
                    <motion.div 
                      key="result"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                       <div className="flex flex-col md:flex-row gap-8 items-start">
                          <div className="flex-1">
                             <div className="text-[10px] font-black text-morandi-sage uppercase tracking-[0.3em] mb-3">#Nucleus_定义</div>
                             <h2 className="text-4xl md:text-5xl font-black text-white serif-font mb-4 tracking-tighter leading-none">{result.title}</h2>
                             <p className="text-xl text-white/80 font-bold italic leading-relaxed serif-font">“{result.nucleus}”</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {result.orbitals.map((orbit: any, i: any) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl group hover:bg-white/10 transition-all">
                               <div className="text-[8px] font-black text-white/20 mb-2 uppercase font-mono tracking-widest">Orbit_0{i+1}</div>
                               <p className="text-xs text-white/70 font-medium leading-relaxed">{orbit}</p>
                            </div>
                          ))}
                       </div>

                       <div className="bg-gradient-to-br from-morandi-blue/20 to-transparent border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform"><Binary size={60} /></div>
                          <div className="relative z-10">
                             <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 flex items-center gap-2"><Zap size={12} className="text-amber-400" /> 逻辑跃迁 (Logic Jump)</h4>
                             <p className="text-lg text-white font-bold italic mb-6 leading-snug">“{result.logicJump.suggestion}”</p>
                             <button 
                                onClick={() => { onClose(); onRunApp(result.logicJump.relatedAppId); }}
                                className="flex items-center gap-2 text-[10px] font-black text-white/90 bg-white/10 hover:bg-white hover:text-black px-6 py-2.5 rounded-full transition-all uppercase tracking-[0.2em]"
                             >
                                进入关联模块 <ArrowUpRight size={14} />
                             </button>
                          </div>
                       </div>
                    </motion.div>
                  ) : (
                    <div className="py-20 text-center opacity-20">
                       <Zap size={60} className="mx-auto mb-6" />
                       <p className="text-xs font-black text-white uppercase tracking-[0.5em]">Waiting_For_Neural_Impulse</p>
                    </div>
                  )}
               </AnimatePresence>
            </div>

            {/* 页脚 */}
            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-between items-center text-[8px] font-mono text-white/20 tracking-widest uppercase">
               <span>Secure_Connection_771</span>
               <span>Powered by Gemini 3 Flash</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KnowledgeCatalyst;
