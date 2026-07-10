import React, { useState } from 'react';
import { Search, Sparkles, Compass, Lightbulb, BrainCircuit, Quote, ArrowRight, Loader2, Zap, BookOpen, Microscope, Dices, Layers, Target } from 'lucide-react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { GoogleGenAI, Type } from "@google/genai";
import { AppItem } from '../types';
import { useTranslation } from '../i18n';

interface ExploreViewProps {
  allModules?: AppItem[];
  onOpenItem?: (item: AppItem) => void;
}

const ExploreView: React.FC<ExploreViewProps> = ({ allModules = [], onOpenItem }) => {
  const { t, lang } = useTranslation();
  
  const EXPERIMENTS = lang === 'zh' ? [
    { title: "如果地球停止自转？", icon: <Compass size={18}/>, query: "如果地球突然停止自转，生态系统和物理环境会发生什么变化？" },
    { title: "语言如何塑造思维？", icon: <BrainCircuit size={18}/>, query: "萨丕尔-沃夫假说：我们使用的语言是否决定了我们能思考的边界？" },
    { title: "硅基生命的可能", icon: <Microscope size={18}/>, query: "除了碳基生命，宇宙中存在硅基生命的科学依据和形态推测是什么？" },
    { title: "时间的本质是什么？", icon: <Zap size={18}/>, query: "在物理学和哲学中，时间究竟是客观存在的维度，还是人类意识的错觉？" }
  ] : [
    { title: "What if the Earth stopped spinning?", icon: <Compass size={18}/>, query: "如果地球突然停止自转，生态系统和物理环境会发生什么变化？" },
    { title: "Does language shape thought?", icon: <BrainCircuit size={18}/>, query: "萨丕尔-沃夫假说：我们使用的语言是否决定了我们能思考的边界？" },
    { title: "Silicon-based life", icon: <Microscope size={18}/>, query: "除了碳基生命，宇宙中存在硅基生命的科学依据和形态推测是什么？" },
    { title: "The nature of time", icon: <Zap size={18}/>, query: "在物理学和哲学中，时间究竟是客观存在的维度，还是人类意识的错觉？" }
  ];

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
      {/* Search Header */}
      <section className="mb-12">
        <div className="flex flex-col mb-10">
           <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white tracking-tight mb-2">
             {t('curiosityEngine')}
           </h2>
           <p className="text-gray-500 dark:text-gray-400">
             {t('curiosityDesc')}
           </p>
        </div>

        <div className={`relative transition-all duration-300 w-full`}>
          <div className="relative bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-2xl flex items-center shadow-sm">
            <div className="pl-6 text-gray-400">
              <Search size={20} />
            </div>
            <input 
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
              placeholder={t('curiosityPlaceholder')}
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-4 px-4 font-medium placeholder:text-gray-400 dark:text-white outline-none"
            />
            <button 
              onClick={handleRandomExplore}
              className="p-4 text-gray-400 hover:text-brand-accent transition-colors"
              title={t('random')}
            >
              <Dices size={20} />
            </button>
            <button 
              onClick={() => handleAISearch()}
              disabled={isCatalyzing || !query.trim()}
              className="bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-80 active:scale-[0.98] transition-all disabled:opacity-30 mr-2"
            >
              {isCatalyzing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              <span className="hidden sm:inline">{t('exploreBtn')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* AI Result */}
      <AnimatePresence mode="wait">
        {isCatalyzing ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col items-center justify-center text-center py-20"
          >
            <Loader2 size={32} className="text-brand-accent animate-spin mb-4" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-200">
              {t('synthesizing')}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {t('extracting')}
            </p>
          </motion.div>
        ) : aiResult ? (
          <motion.div 
            key="result"
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-3xl p-8 shadow-sm">
              <h3 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-6">
                {aiResult.title}
              </h3>
              
              <div className="bg-[#FAFAFA] dark:bg-[#000] p-6 rounded-2xl mb-8 border-l-2 border-brand-accent">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {t('coreEssence')}
                </h4>
                <p className="text-lg text-gray-800 dark:text-gray-200 font-medium">
                  "{aiResult.essence}"
                </p>
              </div>

              <div className="mb-8">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  {t('surprisingFact')}
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  {aiResult.fact}
                </p>
              </div>

              <div className="mb-8">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  {t('perspectives')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiResult.perspectives.map((p: any, i: number) => (
                    <div key={i} className="bg-[#FAFAFA] dark:bg-[#000] border border-black/5 dark:border-white/5 p-5 rounded-2xl">
                      <div className="text-xs font-medium text-brand-accent mb-2">{p.domain}</div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{p.insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-black dark:bg-white text-white dark:text-black p-8 rounded-2xl mb-8">
                <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  {t('foodForThought')}
                </h4>
                <p className="text-lg font-medium">
                  {aiResult.thought}
                </p>
              </div>

              {aiResult.recommended_modules && aiResult.recommended_modules.length > 0 && (
                <div className="pt-8 border-t border-black/5 dark:border-white/10">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                    {t('recommendedModules')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {aiResult.recommended_modules.map((mod: any, i: number) => (
                      <div 
                        key={i} 
                        onClick={() => handleOpenModule(mod.title)}
                        className="flex flex-col p-4 bg-[#FAFAFA] dark:bg-[#000] rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {mod.title}
                          </span>
                          <ArrowRight size={14} className="text-gray-400 group-hover:text-brand-accent" />
                        </div>
                        <p className="text-xs text-gray-500">
                          {mod.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="experiments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('thoughtExperiments')}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EXPERIMENTS.map((exp, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleAISearch(exp.query)}
                  className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/10 p-6 rounded-2xl cursor-pointer hover:border-black/10 dark:hover:border-white/20 transition-all group"
                >
                  <div className="w-10 h-10 bg-[#FAFAFA] dark:bg-[#000] rounded-xl flex items-center justify-center text-gray-500 mb-4 group-hover:text-brand-accent transition-colors">
                    {exp.icon}
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {exp.title}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2">
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
