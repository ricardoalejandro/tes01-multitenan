'use client';

import * as React from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: ResponsiveDialogProps) {
  const [isMaximized, setIsMaximized] = React.useState(false);

  // Reset maximized state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setIsMaximized(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'transition-all duration-300 ease-in-out',
          isMaximized
            ? 'fixed inset-4 max-w-none h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] p-0'
            : 'max-w-2xl max-h-[90vh]'
        )}
        onInteractOutside={(e) => {
          if (isMaximized) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader
          className={cn(
            'flex flex-row items-center justify-between space-y-0',
            isMaximized ? 'px-6 py-4 border-b' : ''
          )}
        >
          <div className="flex-1">
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMaximized(!isMaximized)}
              type="button"
            >
              {isMaximized ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
              <span className="sr-only">
                {isMaximized ? 'Minimizar' : 'Maximizar'}
              </span>
            </Button>
          </div>
        </DialogHeader>

        <div
          className={cn(
            'overflow-y-auto',
            isMaximized ? 'h-[calc(100%-8rem)] px-6 py-4' : 'max-h-[calc(90vh-10rem)]'
          )}
        >
          {children}
        </div>

        {footer && (
          <div
            className={cn(
              'flex justify-end gap-2',
              isMaximized ? 'px-6 py-4 border-t bg-muted/50' : 'pt-4'
            )}
          >
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
