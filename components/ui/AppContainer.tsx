import React from 'react';
import { X } from 'lucide-react';

interface AppContainerProps {
  title: string;
  onClose: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const AppContainer: React.FC<AppContainerProps> = ({ 
  title, 
  onClose, 
  headerActions, 
  children,
  className = "",
  contentClassName = "flex-1 overflow-y-auto"
}) => {
  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-[#FAFAFA] dark:bg-[#000000] text-gray-900 dark:text-gray-100 animate-in fade-in duration-300 ${className}`}>
      <header className="h-14 md:h-16 px-4 md:px-6 flex items-center justify-between border-b border-black/5 dark:border-white/10 shrink-0 bg-white/80 dark:bg-[#111]/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-base md:text-lg font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
             <X size={20} />
          </button>
        </div>
      </header>
      <main className={`relative z-10 ${contentClassName}`}>
        {children}
      </main>
    </div>
  );
};
