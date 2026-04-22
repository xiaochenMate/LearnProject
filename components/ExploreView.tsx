import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Compass, Lightbulb, BrainCircuit, Quote, ArrowRight, Loader2, Zap, BookOpen, Microscope, Dices, Layers, Target } from 'lucide-react';
// Fix: Bypassing broken framer-motion types in this environment
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { GoogleGenAI, Type } from "@google/genai";
import { AppItem } from '../types';

interface ExploreViewProps {
  allModules?: AppItem[];
  onOpenItem?: (item: AppItem) => void;
}

const EXPERIMENTS = [
  { title: "如果地球停止自转？", icon: <Compass size={18}/>, query: "如果地球突然停止自转，生态系统和物理环境会发生什么变化？" },
  { title: "语言如何塑造思维？", icon: <BrainCircuit size={18}/>, query: "萨丕尔-沃夫假说：我们使用的语言是否决定了我们能思考的边界？" },
  { title: "硅基生命的可能", icon: <Microscope size={18}/>, query: "除了碳基生命，宇宙中存在硅基生命的科学依据和形态推测是什么？" },
  { title: "时间的本质是什么？", icon: <Zap size={18}/>, query: "在物理学和哲学中，时间究竟是客观存在的维度，还是人类意识的错觉？" }
];

const ExploreView: React.FC<ExploreViewProps> = ({ allModules = [], onOpenItem }) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [isCatalyzing, setIsCatalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const handleAISearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setIsCatalyzing(true);
    setAiResult(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const moduleNames = allModules.map(m => m.title).join(', ');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `作为一个跨学科的知识向导，请深度解析概念或问题："${searchQuery}"。
        当前系统内可用的学习模块有：[${moduleNames}]。
        请将解析结果格式化为 JSON。`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "概念或问题的高级概括标题" },
              essence: { type: Type.STRING, description: "一句话解释其最深刻的核心本质" },
              fact: { type: Type.STRING, description: "一个令人惊叹的冷知识或反直觉的事实" },
              perspectives: {
                type: Type.ARRAY,
                description: "从2-3个完全不同的学科/维度来剖析它（如物理学、哲学、艺术、经济学等）",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    domain: { type: Type.STRING, description: "学科或视角名称" },
                    insight: { type: Type.STRING, description: "该视角下的深度洞见" }
                  }
                }
              },
              thought: { type: Type.STRING, description: "提出一个引人深思的开放性问题，启发用户思考" },
              recommended_modules: {
                type: Type.ARRAY,
                description: "从可用模块中推荐1-2个最相关的模块（必须是列表里有的），如果没有强相关的则返回空数组",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "推荐的模块名称" },
                    reason: { type: Type.STRING, description: "为什么推荐这个模块，它能如何帮助理解当前概念" }
                  }
                }
              }
            }
          }
        }
      });
      setAiResult(JSON.parse(response.text));
    } catch (e) {
      console.error("AI 解析失败:", e);
    } finally {
      setIsCatalyzing(false);
    }
  };

  const handleRandomExplore = () => {
    const randomQueries = ["黑洞的信息悖论", "蝴蝶效应与混沌理论", "人类梦境的演化意义", "量子纠缠", "图灵测试的哲学困境"];
    const randomQuery = randomQueries[Math.floor(Math.random() * randomQueries.length)];
    handleAISearch(randomQuery);
  };

  const handleOpenModule = (moduleTitle: string) => {
    const targetModule = allModules.find(m => m.title === moduleTitle);
    if (targetModule && onOpenItem) {
      onOpenItem(targetModule);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col overflow-y-auto no-scrollbar pb-24"
    >
      {/* 核心搜索区：好奇心引擎 */}
      <section className="px-6 pt-10 mb-8">
        <div className="flex flex-col items-center text-center mb-10">
           <div className="w-16 h-16 bg-morandi-charcoal dark:bg-slate-200 text-white dark:text-dark-bg rounded-[2rem] flex items-center justify-center shadow-2xl mb-6 transform rotate-3">
             <Sparkles size={32} className={isCatalyzing ? 'animate-pulse text-brand-orange' : ''} />
           </div>
           <h2 className="text-3xl md:text-4xl font-black text-morandi-charcoal dark:text-white serif-font tracking-tight mb-3">
             好奇心引擎
           </h2>
           <p className="text-sm text-morandi-taupe dark:text-slate-400 max-w-md leading-relaxed">
             输入任何你想了解的概念、问题或脑洞，AI 将为你生成跨学科的深度解析与知识图谱。
           </p>
        </div>

        <div className={`relative transition-all duration-500 max-w-3xl mx-auto ${searchFocused ? 'scale-[1.02] shadow-2xl' : 'scale-100 shadow-lg'}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-brand-orange/20 to-morandi-sage/20 rounded-[2.5rem] blur-xl opacity-50"></div>
          <div className="relative bg-white/90 dark:bg-dark-card/90 backdrop-blur-xl border border-morandi-border dark:border-white/10 p-2 rounded-[2.5rem] flex items-center">
            <div className="pl-6 text-morandi-taupe dark:text-slate-400">
              <Search size={24} />
            </div>
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
              placeholder="例如：引力、乡愁、圆的本质、如果人类冬眠..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-base py-5 px-4 font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 dark:text-slate-100"
            />
            <button 
              onClick={handleRandomExplore}
              className="p-4 text-morandi-taupe hover:text-brand-orange transition-colors"
              title="随机探索"
            >
              <Dices size={24} />
            </button>
            <button 
              onClick={() => handleAISearch()}
              disabled={isCatalyzing || !query.trim()}
              className="bg-morandi-charcoal dark:bg-slate-200 text-white dark:text-dark-bg px-8 py-4 rounded-full font-black text-sm tracking-widest flex items-center gap-2 hover:bg-brand-orange dark:hover:bg-brand-orange hover:text-white active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-morandi-charcoal ml-2"
            >
              {isCatalyzing ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
              <span className="hidden sm:inline">探索</span>
            </button>
          </div>
        </div>
      </section>

      {/* AI 解析结果呈现 */}
      <AnimatePresence mode="wait">
        {isCatalyzing ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-6 py-20 flex flex-col items-center justify-center text-center"
          >
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-brand-orange/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-brand-orange rounded-full border-t-transparent animate-spin"></div>
              <BrainCircuit size={32} className="absolute inset-0 m-auto text-brand-orange animate-pulse" />
            </div>
            <h3 className="text-lg font-black text-morandi-charcoal dark:text-slate-200 tracking-widest uppercase mb-2">
              正在重组知识维度
            </h3>
            <p className="text-sm text-morandi-taupe dark:text-slate-500">
              跨越学科边界，提取核心洞见...
            </p>
          </motion.div>
        ) : aiResult ? (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }}
            className="px-4 md:px-6 max-w-4xl mx-auto w-full mb-12"
          >
            <div className="bg-white dark:bg-dark-card border border-morandi-border dark:border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
              {/* 背景装饰 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-orange/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-morandi-sage/10 dark:bg-emerald-900/20 text-morandi-sage dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-8">
                  <Sparkles size={14} /> 知识图谱已生成
                </div>
                
                <h3 className="text-3xl md:text-5xl font-black text-morandi-charcoal dark:text-white serif-font mb-6 leading-tight">
                  {aiResult.title}
                </h3>
                
                {/* 核心本质 */}
                <div className="bg-morandi-oatmeal/50 dark:bg-dark-bg/50 p-6 md:p-8 rounded-[2rem] mb-8 border-l-4 border-brand-orange">
                  <h4 className="text-xs font-black text-morandi-taupe dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Target size={16} /> 核心本质
                  </h4>
                  <p className="text-xl md:text-2xl text-morandi-charcoal dark:text-slate-200 font-medium leading-relaxed italic serif-font">
                    “{aiResult.essence}”
                  </p>
                </div>

                {/* 冷知识 */}
                <div className="mb-10">
                  <h4 className="text-xs font-black text-morandi-taupe dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Lightbulb size={16} /> 令人惊叹的事实
                  </h4>
                  <div className="flex gap-4 items-start">
                    <div className="w-10 h-10 shrink-0 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                      <Zap size={20} />
                    </div>
                    <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
                      {aiResult.fact}
                    </p>
                  </div>
                </div>

                {/* 多维视角 */}
                <div className="mb-10">
                  <h4 className="text-xs font-black text-morandi-taupe dark:text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Layers size={16} /> 跨学科视角
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {aiResult.perspectives.map((p: any, i: number) => (
                      <div key={i} className="bg-white dark:bg-dark-bg border border-morandi-border dark:border-white/5 p-6 rounded-[2rem] hover:shadow-lg transition-shadow">
                        <div className="text-sm font-black text-brand-orange mb-3">{p.domain}</div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{p.insight}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 启发思考 */}
                <div className="bg-morandi-charcoal dark:bg-slate-800 text-white p-8 md:p-10 rounded-[2.5rem] mb-8 relative overflow-hidden">
                  <Quote size={120} className="absolute -top-10 -right-10 text-white/5 rotate-12" />
                  <h4 className="text-xs font-black text-white/50 uppercase tracking-widest mb-4 relative z-10">
                    深度思考
                  </h4>
                  <p className="text-xl md:text-2xl font-medium leading-relaxed relative z-10 serif-font">
                    {aiResult.thought}
                  </p>
                </div>

                {/* 关联模块推荐 */}
                {aiResult.recommended_modules && aiResult.recommended_modules.length > 0 && (
                  <div className="pt-8 border-t border-morandi-border dark:border-white/10">
                    <h4 className="text-xs font-black text-morandi-taupe dark:text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                      <BookOpen size={16} /> 推荐探索模块
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {aiResult.recommended_modules.map((mod: any, i: number) => (
                        <div 
                          key={i} 
                          onClick={() => handleOpenModule(mod.title)}
                          className="flex flex-col p-5 bg-morandi-oatmeal/30 dark:bg-white/5 rounded-2xl border border-transparent hover:border-brand-orange/30 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-morandi-charcoal dark:text-slate-200 group-hover:text-brand-orange transition-colors">
                              {mod.title}
                            </span>
                            <ArrowRight size={16} className="text-slate-400 group-hover:text-brand-orange group-hover:translate-x-1 transition-all" />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                            {mod.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="experiments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-6 max-w-5xl mx-auto w-full"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-morandi-charcoal dark:text-slate-100 serif-font italic flex items-center gap-2">
                <Lightbulb size={20} className="text-brand-orange" /> 思想实验
              </h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thought Experiments</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {EXPERIMENTS.map((exp, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleAISearch(exp.query)}
                  className="bg-white dark:bg-dark-card border border-morandi-border dark:border-white/5 p-8 rounded-[2.5rem] cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className="w-12 h-12 bg-morandi-oatmeal dark:bg-dark-bg rounded-2xl flex items-center justify-center text-morandi-charcoal dark:text-slate-300 mb-6 group-hover:bg-brand-orange group-hover:text-white transition-colors">
                    {exp.icon}
                  </div>
                  <h4 className="text-xl font-bold text-morandi-charcoal dark:text-slate-100 mb-3 group-hover:text-brand-orange transition-colors">
                    {exp.title}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {exp.query}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ExploreView;
