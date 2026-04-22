
import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Globe, Book, Zap, Cpu, Loader2, FileCheck } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Button from './ui/Button';
import Card from './ui/Card';
import Typography from './ui/Typography';

interface KnowledgeBannerProps {
  onRun: (id: string) => void;
}

const KnowledgeBanner: React.FC<KnowledgeBannerProps> = ({ onRun }) => {
  const [wisdom, setWisdom] = useState<string>('“思维火花暂歇，探索永不止步。”');
  const [isLoading, setIsLoading] = useState(false);

  const fetchWisdom = async () => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "生成一条极简、富有哲理的知识洞察，不超过25字。",
      });
      setWisdom(`“${response.text || '探索的真谛在于保持好奇。'}”`);
    } catch (e) {
      setWisdom('“思维火花暂歇，探索永不止步。”');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchWisdom(); }, []);

  return (
    <Card className="p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 relative group">
      
      {/* 左侧语录区 */}
      <div className="flex-1 min-w-0 w-full">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <Sparkles size={14} className="text-slate-300" />
          <Typography variant="caption" className="text-slate-300">Neural_Insight</Typography>
        </div>
        
        <div className="relative">
          <Typography variant="h2" className={`leading-snug transition-all duration-700 ${isLoading ? 'opacity-20 blur-sm' : 'opacity-100 blur-0'}`}>
            {wisdom}
          </Typography>
        </div>

        <Button 
          variant="ghost"
          size="sm"
          onClick={fetchWisdom}
          className="mt-4 md:mt-6 p-0 hover:bg-transparent"
        >
          {isLoading ? <Loader2 size={10} className="animate-spin mr-2" /> : <RefreshCw size={10} className="mr-2" />}
          刷新灵感
        </Button>
      </div>

      {/* 右侧快捷矩阵 - 新增融资测试按钮 */}
      <div className="flex gap-4 md:gap-6 shrink-0 w-full md:w-auto justify-center md:justify-end border-t md:border-t-0 pt-6 md:pt-0 border-morandi-border/30 dark:border-white/5">
        <QuickLink icon={<Globe size={18}/>} label="3D地球" onClick={() => onRun('e1')} />
        <QuickLink icon={<Book size={18}/>} label="诗词馆" onClick={() => onRun('e5')} />
        <QuickLink icon={<FileCheck size={18}/>} label="融资测试" onClick={() => onRun('u5')} />
        <QuickLink icon={<Cpu size={18}/>} label="AI对弈" onClick={() => onRun('ent6')} />
      </div>
    </Card>
  );
};

const QuickLink = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center gap-2 md:gap-3 group/link"
  >
    <div className="w-12 h-12 md:w-14 md:h-14 bg-slate-50 dark:bg-dark-bg rounded-full flex items-center justify-center text-slate-400 group-hover/link:bg-brand-orange group-hover/link:text-white transition-all shadow-inner border border-transparent group-hover/link:border-brand-orange/20">
      {icon}
    </div>
    <span className="text-[8px] md:text-[10px] font-bold text-slate-400 group-hover/link:text-morandi-charcoal dark:group-hover/link:text-slate-200 transition-colors">{label}</span>
  </button>
);

export default KnowledgeBanner;
