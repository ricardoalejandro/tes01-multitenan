import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  onInteractOutside?: (e: any) => void;
}

export function Dialog({ open, onOpenChange, children, onInteractOutside }: DialogProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onOpenChange]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (onInteractOutside) {
      onInteractOutside(e);
      // Si preventDefault fue llamado, no cerrar
      if (e.defaultPrevented) return;
    }
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={handleBackdropClick}
      />
      <div className="relative z-50 w-full max-w-2xl mx-4">{children}</div>
    </div>
  );
}

export function DialogContent({
  className,
  children,
  onClose,
  onInteractOutside,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { 
  onClose?: () => void;
  onInteractOutside?: (e: any) => void;
}) {
  const [isMaximized, setIsMaximized] = React.useState(false);

  return (
    <div
      className={cn(
        'relative bg-white rounded-xl shadow-2xl overflow-hidden',
        isMaximized ? 'w-[95vw] h-[95vh]' : 'max-h-[90vh]',
        'animate-in fade-in-0 slide-in-from-bottom-4 duration-300',
        className
      )}
      {...props}
    >
      <div className="absolute right-4 top-4 flex gap-2 z-10">
        <button
          onClick={() => setIsMaximized(!isMaximized)}
          className="rounded-full p-2 hover:bg-neutral-3 transition-colors"
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMaximized ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            )}
          </svg>
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-neutral-3 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('p-6 border-b border-neutral-4', className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-2xl font-bold text-neutral-12', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-neutral-10 mt-1', className)}
      {...props}
    />
  );
}

export function DialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('p-8 overflow-y-auto max-h-[60vh]', className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'p-6 border-t border-neutral-4 flex justify-end gap-3',
        className
      )}
      {...props}
    />
  );
}
