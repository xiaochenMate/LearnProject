
import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Typography from './ui/Typography';

interface KnowledgeBannerProps {
  onRun: (id: string) => void;
}

const KnowledgeBanner: React.FC<KnowledgeBannerProps> = ({ onRun }) => {
  const [wisdom, setWisdom] = useState<string>('Curiosity is the engine of achievement.');
  const [isLoading, setIsLoading] = useState(false);

  const fetchWisdom = async () => {
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Generate a short, minimalist, and philosophical insight about knowledge or exploration in English, under 10 words.",
      });
      setWisdom(`${response.text || 'Exploration never ceases.'}`);
    } catch (e) {
      setWisdom('Curiosity is the engine of achievement.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchWisdom(); }, []);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-[#0070F3]" />
          <Typography variant="caption" className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Neural Insight</Typography>
        </div>
        
        <div className="relative group cursor-pointer" onClick={fetchWisdom}>
          <Typography variant="h1" className={`text-3xl md:text-5xl font-semibold tracking-tight leading-tight transition-all duration-700 ${isLoading ? 'opacity-20 blur-sm' : 'opacity-100 blur-0'}`}>
            {wisdom}
          </Typography>
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isLoading ? <Loader2 size={16} className="animate-spin text-gray-400" /> : <RefreshCw size={16} className="text-gray-400" />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBanner;
