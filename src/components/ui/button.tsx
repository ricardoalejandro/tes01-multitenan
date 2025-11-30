import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium',
          'transition-all duration-200 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-9 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'active:scale-[0.98] active:transition-transform',
          {
            'bg-accent-9 text-white hover:bg-accent-10 shadow-sm hover:shadow-md active:shadow-sm': variant === 'default',
            'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md active:shadow-sm': variant === 'destructive',
            'border border-neutral-4 bg-white hover:bg-neutral-2 hover:border-neutral-5 text-neutral-11 shadow-sm': variant === 'outline',
            'bg-neutral-3 text-neutral-11 hover:bg-neutral-4': variant === 'secondary',
            'hover:bg-neutral-3 text-neutral-11': variant === 'ghost',
            'text-accent-9 underline-offset-4 hover:underline hover:text-accent-10': variant === 'link',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-lg px-3 text-xs': size === 'sm',
            'h-11 rounded-lg px-8 text-base': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
