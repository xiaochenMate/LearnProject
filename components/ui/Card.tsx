
import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glass?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, glass = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#15171C] transition-all duration-200 shadow-[0_1px_2px_rgba(16,24,40,0.03)]',
          hover && 'hover:border-black/10 dark:hover:border-white/20',
          glass && 'bg-white/40 dark:bg-black/40 backdrop-blur-xl',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
