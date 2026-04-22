
import React from 'react';
import { AppItem } from '../types';
import { motion as motionBase } from 'framer-motion';
import Card from './ui/Card';
import Typography from './ui/Typography';
const motion = motionBase as any;

interface AppCardProps {
  item: AppItem;
  onClick: (item: AppItem) => void;
}

const AppCard: React.FC<AppCardProps> = ({ item, onClick }) => {
  // 根据图标类型自动分配莫兰迪配色
  const getThemeColor = () => {
    const icon = item.icon || '';
    if (['public', 'waves', 'currency_exchange'].includes(icon)) return 'bg-[#DEE7E9] text-[#78909C]';
    if (['menu_book', 'auto_stories', 'history_edu'].includes(icon)) return 'bg-[#E9EDDE] text-[#829C78]';
    if (['calculate', 'lightbulb', 'schedule'].includes(icon)) return 'bg-[#F2F1EC] text-[#9EA3A0]';
    return 'bg-[#EAE9E4] text-[#8C8B87]';
  };

  const theme = getThemeColor();

  return (
    <Card 
      onClick={() => onClick(item)}
      className="p-5 flex flex-col group"
    >
      <div className={`aspect-[4/3] rounded-ios flex items-center justify-center mb-6 relative overflow-hidden transition-colors ${theme}`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_30%_30%,white_0%,transparent_70%)]"></div>
        <span className="material-icons-outlined text-5xl group-hover:scale-110 transition-transform duration-500">
          {item.icon || 'apps'}
        </span>
        <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-black/5"></div>
      </div>

      <div className="px-1">
        <Typography variant="h4" className="mb-2 truncate">
          {item.title}
        </Typography>
        <Typography variant="body" className="text-slate-400 dark:text-slate-500 line-clamp-3 font-medium italic">
          {item.description}
        </Typography>
      </div>
    </Card>
  );
};

export default AppCard;
