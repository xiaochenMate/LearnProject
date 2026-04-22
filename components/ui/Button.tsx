
import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-orange text-white shadow-lg hover:bg-brand-orange/90 active:scale-95',
      secondary: 'bg-morandi-charcoal dark:bg-slate-200 text-white dark:text-dark-bg hover:opacity-90 active:scale-95',
      outline: 'bg-transparent border border-morandi-border dark:border-white/10 text-morandi-charcoal dark:text-white hover:bg-white/10 active:scale-95',
      ghost: 'bg-transparent text-morandi-taupe dark:text-slate-400 hover:text-brand-orange dark:hover:text-brand-orange active:scale-95',
      danger: 'bg-rose-500 text-white shadow-lg hover:bg-rose-600 active:scale-95',
    };

    const sizes = {
      sm: 'px-4 py-2 text-[10px]',
      md: 'px-6 py-3 text-xs',
      lg: 'px-8 py-4 text-sm',
      icon: 'p-2',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-2xl font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={loading}
        {...props}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
