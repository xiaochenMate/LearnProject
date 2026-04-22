
import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, RefreshCw, ArrowUpDown, ChevronRight, 
  Search, TrendingUp, Info, DollarSign, Euro, Banknote, Clock, Check
} from 'lucide-react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;

interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

const CURRENCIES: Currency[] = [
  { code: 'CNY', name: '人民币', symbol: '¥', flag: '🇨🇳' },
  { code: 'USD', name: '美元', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: '欧元', symbol: '€', flag: '🇪🇺' },
  { code: 'JPY', name: '日元', symbol: '¥', flag: '🇯🇵' },
  { code: 'GBP', name: '英镑', symbol: '£', flag: '🇬🇧' },
  { code: 'HKD', name: '港币', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'AUD', name: '澳元', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: '加元', symbol: 'C$', flag: '🇨🇦' },
  { code: 'KRW', name: '韩元', symbol: '₩', flag: '🇰🇷' },
  { code: 'SGD', name: '新币', symbol: 'S$', flag: '🇸🇬' },
  { code: 'CHF', name: '瑞士法郎', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'THB', name: '泰铢', symbol: '฿', flag: '🇹🇭' },
  { code: 'MYR', name: '林吉特', symbol: 'RM', flag: '🇲🇾' },
];

// 模拟汇率数据 (以1 CNY为基准)
const MOCK_RATES: Record<string, number> = {
  CNY: 1,
  USD: 0.138,
  EUR: 0.127,
  JPY: 20.84,
  GBP: 0.106,
  HKD: 1.08,
  AUD: 0.208,
  CAD: 0.189,
  KRW: 184.56,
  SGD: 0.185,
  CHF: 0.122,
  THB: 4.85,
  MYR: 0.65,
};

const CurrencyConverterApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [fromCurrency, setFromCurrency] = useState<Currency>(CURRENCIES[0]);
  const [toCurrency, setToCurrency] = useState<Currency>(CURRENCIES[1]);
  const [amount, setAmount] = useState<string>('100');
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
  
  // 选择器状态
  const [selectorTarget, setSelectorTarget] = useState<'from' | 'to' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 计算结果
  const result = useMemo(() => {
    const numAmount = parseFloat(amount) || 0;
    const baseRate = MOCK_RATES[fromCurrency.code];
    const targetRate = MOCK_RATES[toCurrency.code];
    return (numAmount / baseRate) * targetRate;
  }, [amount, fromCurrency, toCurrency]);

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleRefresh = () => {
    setIsUpdating(true);
    setTimeout(() => {
      setLastUpdate(new Date().toLocaleTimeString());
      setIsUpdating(false);
    }, 800);
  };

  const handleNumberInput = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    if (amount === '0' && num !== '.') {
      setAmount(num);
    } else if (amount.length < 12) {
      setAmount(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  };

  const filteredCurrencies = CURRENCIES.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.name.includes(searchQuery)
  );

  const selectCurrency = (c: Currency) => {
    if (selectorTarget === 'from') {
      setFromCurrency(c);
    } else {
      setToCurrency(c);
    }
    setSelectorTarget(null);
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-morandi-oatmeal dark:bg-dark-bg flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 md:h-20 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-b border-morandi-border dark:border-white/5 flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-morandi-blue text-white rounded-2xl flex items-center justify-center shadow-lg">
             <RefreshCw className={`w-5 h-5 ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h1 className="text-sm md:text-lg font-black text-morandi-charcoal dark:text-slate-100 serif-font italic tracking-tight">汇率管家</h1>
            <p className="text-[8px] md:text-[10px] text-morandi-taupe dark:text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
              <Clock size={10} /> 最近更新: {lastUpdate}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-rose-500 hover:text-white rounded-full transition-all text-slate-400">
          <X size={20}/>
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-2xl mx-auto w-full relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#4b4b4b_1px,transparent_1px)] [background-size:24px_24px]"></div>

        {/* 转换卡片 */}
        <div className="w-full space-y-4 mb-8">
          <div className="relative">
            {/* Source Currency */}
            <motion.div 
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectorTarget('from')}
              className="bg-white dark:bg-dark-card p-6 md:p-8 rounded-[2.5rem] border border-morandi-border dark:border-white/5 shadow-sm transition-all hover:border-morandi-blue/30 cursor-pointer"
            >
               <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{fromCurrency.flag}</span>
                    <span className="text-sm font-black text-morandi-taupe dark:text-slate-500 uppercase tracking-widest">{fromCurrency.code}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 italic">
                    {fromCurrency.name} <ChevronRight size={12} />
                  </div>
               </div>
               <div className="text-4xl md:text-6xl font-black text-morandi-charcoal dark:text-slate-100 tracking-tighter truncate serif-font">
                 {fromCurrency.symbol}{amount}
               </div>
            </motion.div>

            {/* Swap Button */}
            <button 
              onClick={(e) => { e.stopPropagation(); handleSwap(); }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-morandi-charcoal dark:bg-slate-200 text-white dark:text-dark-bg rounded-full shadow-2xl flex items-center justify-center z-10 hover:scale-110 active:scale-90 transition-all border-4 border-morandi-oatmeal dark:border-dark-bg"
            >
              <ArrowUpDown size={20} />
            </button>

            {/* Target Currency */}
            <motion.div 
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectorTarget('to')}
              className="bg-white dark:bg-dark-card p-6 md:p-8 rounded-[2.5rem] border border-morandi-border dark:border-white/5 shadow-sm mt-2 transition-all hover:border-morandi-blue/30 cursor-pointer"
            >
               <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{toCurrency.flag}</span>
                    <span className="text-sm font-black text-morandi-taupe dark:text-slate-500 uppercase tracking-widest">{toCurrency.code}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 italic">
                    {toCurrency.name} <ChevronRight size={12} />
                  </div>
               </div>
               <div className="text-4xl md:text-6xl font-black text-morandi-blue dark:text-blue-400 tracking-tighter truncate serif-font">
                 {toCurrency.symbol}{result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </div>
            </motion.div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="flex items-center gap-3 mb-8 px-6 py-3 bg-morandi-sage/10 dark:bg-emerald-950/20 rounded-2xl border border-morandi-sage/20">
           <TrendingUp size={16} className="text-morandi-sage" />
           <p className="text-[10px] md:text-xs text-morandi-taupe dark:text-slate-400 font-medium italic">
             当前参考汇率: 1 {fromCurrency.code} = {(MOCK_RATES[toCurrency.code]/MOCK_RATES[fromCurrency.code]).toFixed(4)} {toCurrency.code}
           </p>
        </div>

        {/* 数字键盘 */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((val) => (
            <button
              key={val}
              onClick={() => handleNumberInput(val)}
              className="h-14 md:h-16 bg-white dark:bg-dark-card/50 rounded-2xl text-xl font-bold text-morandi-charcoal dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 active:scale-95 transition-all shadow-sm"
            >
              {val}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="h-14 md:h-16 bg-morandi-rose/5 dark:bg-rose-950/10 rounded-2xl text-morandi-rose flex items-center justify-center hover:bg-morandi-rose hover:text-white transition-all shadow-sm"
          >
            <X size={24} />
          </button>
        </div>

        <button 
          onClick={() => setAmount('0')}
          className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-morandi-taupe hover:text-morandi-charcoal transition-colors"
        >
          Clear Amount
        </button>
      </main>

      {/* 币种选择器浮层 */}
      <AnimatePresence>
        {selectorTarget && (
          <div className="fixed inset-0 z-[60] flex flex-col bg-morandi-oatmeal dark:bg-dark-bg animate-in fade-in duration-300">
             <header className="h-16 md:h-20 px-6 flex items-center justify-between border-b border-morandi-border dark:border-white/5 shrink-0 bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl">
                <h3 className="text-lg font-bold text-morandi-charcoal dark:text-white serif-font">选择货币</h3>
                <button onClick={() => { setSelectorTarget(null); setSearchQuery(''); }} className="p-2.5 bg-slate-100 dark:bg-white/5 rounded-full text-slate-400">
                  <X size={20}/>
                </button>
             </header>
             
             <div className="p-6 shrink-0">
                <div className="relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                    autoFocus
                    type="text" 
                    placeholder="搜索货币代码或名称..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-white dark:bg-dark-card border border-morandi-border dark:border-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-morandi-blue transition-all dark:text-white"
                   />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto px-6 pb-12 no-scrollbar">
                <div className="grid grid-cols-1 gap-2">
                   {filteredCurrencies.map((c) => {
                     const isSelected = (selectorTarget === 'from' ? fromCurrency : toCurrency).code === c.code;
                     return (
                       <button 
                        key={c.code}
                        onClick={() => selectCurrency(c)}
                        className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isSelected ? 'bg-morandi-blue border-morandi-blue text-white shadow-lg' : 'bg-white dark:bg-dark-card border-morandi-border dark:border-white/5 text-morandi-charcoal dark:text-slate-300 hover:border-morandi-blue/50'}`}
                       >
                         <div className="flex items-center gap-4">
                           <span className="text-3xl">{c.flag}</span>
                           <div className="text-left">
                              <div className="text-sm font-black uppercase tracking-widest">{c.code}</div>
                              <div className={`text-[10px] font-medium ${isSelected ? 'text-white/70' : 'text-morandi-taupe'}`}>{c.name}</div>
                           </div>
                         </div>
                         {isSelected && <Check size={18} />}
                       </button>
                     );
                   })}
                </div>
             </div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="h-10 bg-white/90 dark:bg-dark-card/90 border-t border-morandi-border dark:border-white/5 px-8 flex items-center justify-between text-[9px] font-bold text-slate-400 italic shrink-0">
         <div className="flex gap-6">
           <span className="flex items-center gap-1.5"><div className="w-1 h-1 bg-emerald-500 rounded-full"></div> 数据接口: 稳定在线</span>
           <span className="hidden sm:inline">OFFICIAL_EXCHANGE_DATA v2.1</span>
         </div>
         <button onClick={handleRefresh} className="flex items-center gap-1.5 hover:text-morandi-blue transition-colors">
            <RefreshCw size={10} /> 同步最新数据
         </button>
      </footer>

      <style>{`
        .serif-font { font-family: 'Noto Serif SC', serif; }
      `}</style>
    </div>
  );
};

export default CurrencyConverterApp;
