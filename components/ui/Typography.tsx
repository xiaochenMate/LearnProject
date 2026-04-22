
import React from 'react';
import { cn } from '../../lib/utils';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';
  as?: React.ElementType;
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant = 'body', as: Component = 'p', children, ...props }, ref) => {
    const variants = {
      h1: 'text-4xl md:text-6xl font-black serif-font italic tracking-tighter',
      h2: 'text-2xl md:text-4xl font-black serif-font italic tracking-tight',
      h3: 'text-xl md:text-2xl font-black serif-font italic',
      h4: 'text-lg font-black serif-font italic',
      body: 'text-sm leading-relaxed',
      caption: 'text-[11px] font-black uppercase tracking-[0.3em] italic',
      label: 'text-[10px] font-black uppercase tracking-widest',
    };

    return (
      <Component
        ref={ref}
        className={cn(variants[variant], className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Typography.displayName = 'Typography';

export default Typography;
