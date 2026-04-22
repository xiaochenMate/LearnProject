
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, BookOpen, Trophy, Activity, Cpu } from 'lucide-react';
// Fix: Bypassing broken framer-motion types in this environment
import { motion as motionBase } from 'framer-motion';
const motion = motionBase as any;

const IntelDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    chars: 0,
    poems: 0,
    points: 0,
    chess: 'NOVICE'
  });

  useEffect(() => {
    // 聚合各模块的数据
    const loadStats = () => {
      setStats({
        chars: Number(localStorage.getItem('char_learned') || 0),
        poems: Number(localStorage.getItem('poem_score') || 0),
        points: Number(localStorage.getItem('szj_points') || 0),
        chess: localStorage.getItem('chess_rank') || 'UNRANKED'
      });
    };
    loadStats();
    window.addEventListener('storage', loadStats);
    return () => window.removeEventListener('storage', loadStats);
  }, []);

  const dataCards = [
    { label: '神经元识字', value: stats.chars, unit: '单元', icon: BookOpen, color: 'text-emerald-400' },
    { label: '文化共鸣度', value: stats.poems, unit: '阶', icon: Zap, color: 'text-amber-400' },
    { label: '国学积分', value: stats.points, unit: 'EXP', icon: Trophy, color: 'text-rose-400' },
    { label: '逻辑算力', value: stats.chess, unit: '', icon: Activity, color: 'text-blue-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
      {dataCards.map((card, idx) => (
        <motion.div 
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="relative group cursor-default"
        >
          <div className="absolute -inset-[1px] bg-gradient-to-b from-white/10 to-transparent rounded-2xl -z-10 group-hover:from-emerald-500/20 transition-all duration-500"></div>
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-4 md:p-6 rounded-2xl flex flex-col h-full overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
              <card.icon size={64} />
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 bg-slate-800 rounded-lg ${card.color}`}>
                <card.icon size={16} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{card.label}</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black text-white tech-font italic tracking-tighter">
                {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
              </span>
              <span className="text-[10px] font-bold text-slate-600 uppercase">{card.unit}</span>
            </div>
            
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '65%' }}
                className={`h-full ${card.color.replace('text-', 'bg-')}`}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default IntelDashboard;
