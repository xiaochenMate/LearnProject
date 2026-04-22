
import React from 'react';
import { AppItem } from '../types';

interface HeroSpotlightProps {
  item: AppItem;
  onRun: (item: AppItem) => void;
}

const HeroSpotlight: React.FC<HeroSpotlightProps> = ({ item, onRun }) => {
  return (
    <section className="mt-1 mb-4">
      <div className="relative overflow-hidden rounded-2xl bg-slate-400 dark:bg-slate-900 shadow-sm group transition-colors duration-500">
        {/* 背景渐变 */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#9BAFB9] to-[#8095A0] dark:from-[#2C3E50] dark:to-[#1a1a1a]"></div>
        
        {/* 装饰 SVG - 进一步缩小 */}
        <div className="absolute right-[-20px] top-[-10px] opacity-10 dark:opacity-5 pointer-events-none transition-opacity">
          <svg fill="white" height="140" viewBox="0 0 24 24" width="140" xmlns="http://www.w3.org/2000/svg">
            <path d="M19,22H5V20H19V22M17,10C15.58,10 14.26,10.77 13.55,12C13.24,11.5 13.13,10.94 13.13,10.45C13.13,8.97 14,7.44 14.61,6.34C14.86,5.89 14.33,5.43 13.92,5.77C12.18,7.21 10.66,9.22 10.15,11.77C10.1,12.04 10.39,12.22 10.61,12.08C11,11.83 11.5,11.7 12,11.7C12.6,11.7 13.15,11.87 13.61,12.16C14.07,13.29 13.93,14.64 13.1,15.71C11.95,17.21 11.69,17.96 11.55,18H17C17.86,18 18.6,17.47 18.88,16.68L19.64,14.37C19.95,13.43 19.5,12.4 18.68,11.96C18.15,11.67 17.58,11.5 17,11.5V11C17,10.45 17,10 17,10M9.5,18H11.53C11.67,17.65 11.9,17 12.87,15.71C12.39,15.9 11.89,16 11.37,16C9.96,16 8.71,15.22 8,14.06C7.29,15.22 6.04,16 4.63,16C4.11,16 3.61,15.9 3.13,15.71C4.5,18 7,18 9.5,18M12,2C11.5,2 11,2.19 10.59,2.59C10.19,3 10,3.5 10,4V5H6V7H8V9.16C6.73,9.75 5.61,10.9 5.09,12.38L4.35,14.67C4.19,15.17 4.19,15.68 4.34,16.16C5.5,15.2 7,14.5 8.63,14.5C9.4,14.5 10.14,14.63 10.83,14.88C10.28,12.59 10.82,10.59 12.08,9C11.38,8.23 11,7.21 11,6.08C11,4.81 11.5,3.67 12.39,2.88L13.12,3.71C12.42,4.32 12,5.16 12,6.08C12,7.21 12.5,8 13.34,8.82C13.5,8.29 13.78,7.83 14.15,7.46C13.32,6.06 12,3.69 12,2Z"></path>
          </svg>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-4 md:p-5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 px-2 py-0.5 rounded-md">
                <span className="text-[8px] font-black text-white tracking-widest uppercase">精选</span>
              </div>
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight serif-font">
                {item.title}
              </h2>
            </div>
            <p className="text-slate-100/80 dark:text-slate-400 text-[10px] md:text-xs leading-tight font-medium line-clamp-1 italic">
              {item.description}
            </p>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <button 
              onClick={() => onRun(item)}
              className="bg-white dark:bg-slate-200 text-slate-700 dark:text-dark-bg px-4 py-1.5 rounded-lg flex items-center space-x-1.5 font-bold text-[10px] shadow-sm active:scale-95 transition-all hover:bg-slate-50"
            >
              <span className="material-icons-outlined text-sm">play_arrow</span>
              <span>立即开始</span>
            </button>
            <span className="text-[8px] text-white/40 font-mono tracking-tighter hidden xs:block">ID: {item.id.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSpotlight;
