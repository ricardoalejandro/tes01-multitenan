'use client';

import * as React from 'react';
import { LayoutGrid, List, Rows3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type ViewMode = 'cards' | 'list' | 'compact';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}

const viewOptions: { value: ViewMode; icon: React.ElementType; label: string }[] = [
  { value: 'cards', icon: LayoutGrid, label: 'Vista de tarjetas' },
  { value: 'list', icon: List, label: 'Vista de lista' },
  { value: 'compact', icon: Rows3, label: 'Vista compacta' },
];

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <TooltipProvider>
      <div className={cn('inline-flex items-center rounded-lg border bg-muted p-1 gap-0.5', className)}>
        {viewOptions.map((option) => (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(option.value)}
                className={cn(
                  'h-8 w-8 p-0 transition-all',
                  value === option.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <option.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{option.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

// Hook para persistir preferencia de vista en localStorage
export function useViewPreference(key: string, defaultValue: ViewMode = 'list'): [ViewMode, (value: ViewMode) => void] {
  const storageKey = `view-preference-${key}`;

  // Usar useState con inicializador lazy para evitar hydration mismatch
  const [viewMode, setViewModeState] = React.useState<ViewMode>(defaultValue);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    // Solo en cliente
    const stored = localStorage.getItem(storageKey);
    if (stored && ['cards', 'list', 'compact'].includes(stored)) {
      setViewModeState(stored as ViewMode);
    }
    setIsHydrated(true);
  }, [storageKey]);

  const setViewMode = React.useCallback((value: ViewMode) => {
    setViewModeState(value);
    localStorage.setItem(storageKey, value);
  }, [storageKey]);

  return [isHydrated ? viewMode : defaultValue, setViewMode];
}
