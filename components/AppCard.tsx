
import React from 'react';
import { AppItem } from '../types';
import Card from './ui/Card';
import Typography from './ui/Typography';

interface AppCardProps {
  item: AppItem;
  onClick: (item: AppItem) => void;
}

const AppCard: React.FC<AppCardProps> = ({ item, onClick }) => {
  return (
    <Card 
      onClick={() => onClick(item)}
      className="p-5 flex flex-col group cursor-pointer border border-transparent hover:border-black/5 dark:hover:border-white/10 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(255,255,255,0.02)] h-[180px] justify-between"
    >
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:scale-105 transition-transform duration-300">
          <span className="material-icons-outlined text-2xl">
            {item.icon || 'apps'}
          </span>
        </div>
      </div>

      <div className="mt-auto">
        <Typography variant="h4" className="mb-1 truncate font-medium">
          {item.title}
        </Typography>
        <Typography variant="body" className="text-gray-500 line-clamp-2 text-sm leading-relaxed">
          {item.description}
        </Typography>
      </div>
    </Card>
  );
};

export default AppCard;
