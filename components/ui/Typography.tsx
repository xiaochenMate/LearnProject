
import React from 'react';
import { cn } from '../../lib/utils';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'caption' | 'label';
  as?: React.ElementType;
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant = 'body', as, children, ...props }, ref) => {
    
    // Determine default element if 'as' is not provided
    let Component: React.ElementType = as || 'p';
    if (!as) {
      if (variant === 'h1') Component = 'h1';
      else if (variant === 'h2') Component = 'h2';
      else if (variant === 'h3') Component = 'h3';
      else if (variant === 'h4') Component = 'h4';
      else if (variant === 'caption' || variant === 'label') Component = 'span';
    }

    const variants = {
      h1: 'text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 dark:text-white',
      h2: 'text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 dark:text-white',
      h3: 'text-2xl font-semibold tracking-tight text-gray-900 dark:text-white',
      h4: 'text-xl font-semibold tracking-tight text-gray-900 dark:text-white',
      body: 'text-base text-gray-600 dark:text-gray-300 leading-relaxed',
      caption: 'text-sm text-gray-500 dark:text-gray-400',
      label: 'text-xs font-medium uppercase tracking-wider text-gray-500',
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
