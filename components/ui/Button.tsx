
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
      primary: 'bg-exbeam-forest text-white hover:bg-[#225247] active:translate-y-px',
      secondary: 'bg-[#EEF2FF] dark:bg-white/10 text-exbeam-ink dark:text-white hover:bg-[#E0E7FF] dark:hover:bg-white/15 active:translate-y-px',
      outline: 'bg-transparent border border-[#D7DAE0] dark:border-white/15 text-exbeam-ink dark:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.06] active:translate-y-px',
      ghost: 'bg-transparent text-[#69707D] dark:text-slate-300 hover:text-exbeam-green hover:bg-exbeam-green/[0.06] active:translate-y-px',
      danger: 'bg-[#B83A35] text-white hover:bg-[#A2312D] active:translate-y-px',
    };

    const sizes = {
      sm: 'px-3 py-2 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-5 py-3 text-sm',
      icon: 'h-9 w-9',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:pointer-events-none',
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
