import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg border border-neutral-4 bg-white px-3 py-2 text-sm',
          'ring-offset-bg placeholder:text-neutral-5',
          'transition-all duration-200 ease-out',
          'hover:border-neutral-5',
          'focus:outline-none focus:ring-2 focus:ring-accent-9/20 focus:border-accent-9',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-2',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
