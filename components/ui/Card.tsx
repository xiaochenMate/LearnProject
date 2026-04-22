
import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glass?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = true, glass = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-[2.5rem] border border-morandi-border dark:border-white/5 bg-white dark:bg-dark-card p-6 transition-all duration-300',
          hover && 'hover:scale-[1.02] hover:shadow-xl',
          glass && 'bg-white/40 dark:bg-dark-card/40 backdrop-blur-xl',
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
