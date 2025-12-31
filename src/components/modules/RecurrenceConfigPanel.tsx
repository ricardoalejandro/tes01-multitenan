'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  days?: string[];
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
}

interface Props {
  value: RecurrenceConfig;
  onChange: (config: RecurrenceConfig) => void;
}

const DAYS = [
  { value: 'monday', label: 'L' },
  { value: 'tuesday', label: 'M' },
  { value: 'wednesday', label: 'X' },
  { value: 'thursday', label: 'J' },
  { value: 'friday', label: 'V' },
  { value: 'saturday', label: 'S' },
  { value: 'sunday', label: 'D' },
];

export default function RecurrenceConfigPanel({ value, onChange }: Props) {
  const toggleDay = (day: string) => {
    const days = value.days || [];
    const newDays = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    onChange({ ...value, days: newDays });
  };

  // Validación: debe tener criterio de fin
  const hasEndDate = value.endDate && value.endDate.trim().length > 0;
  const hasMaxOccurrences = value.maxOccurrences && value.maxOccurrences > 0;
  const hasEndCriteria = hasEndDate || hasMaxOccurrences;
  
  // Validación: fecha de fin debe ser posterior a fecha de inicio
  const isEndDateInvalid = hasEndDate && value.startDate && value.endDate && value.endDate <= value.startDate;

  return (
    <div className="space-y-4 border border-neutral-4 rounded-lg p-4">
      <h3 className="font-semibold">Recurrencia Personalizada</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Frecuencia</Label>
          <Select
            value={value.frequency}
            onValueChange={(val) => onChange({ ...value, frequency: val as any })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar frecuencia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diario</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Repetir cada</Label>
          <Input
            type="number"
            min={1}
            value={value.interval}
            onChange={(e) => onChange({ ...value, interval: Number(e.target.value) })}
          />
        </div>
      </div>

      {value.frequency === 'weekly' && (
        <div>
          <Label>Días de la semana</Label>
          <div className="flex gap-2 mt-2">
            {DAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={`w-10 h-10 rounded-full font-semibold transition-colors ${value.days?.includes(day.value)
                    ? 'bg-accent-9 text-white'
                    : 'bg-neutral-3 text-neutral-10 hover:bg-neutral-4'
                  }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Fecha de inicio *</Label>
        <Input
          type="date"
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fecha de fin *</Label>
          <Input
            type="date"
            value={value.endDate || ''}
            min={value.startDate || undefined}
            onChange={(e) => onChange({ ...value, endDate: e.target.value || undefined })}
            className={isEndDateInvalid ? 'border-red-500' : ''}
          />
        </div>

        <div>
          <Label>O después de N sesiones *</Label>
          <Input
            type="number"
            min={1}
            placeholder="Ej: 10"
            value={value.maxOccurrences || ''}
            onChange={(e) => onChange({ ...value, maxOccurrences: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </div>

      {/* Mensaje de validación: fecha inválida */}
      {isEndDateInvalid && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <span>❌</span>
          <span>La fecha de fin debe ser posterior a la fecha de inicio.</span>
        </div>
      )}

      {/* Mensaje de validación: criterio de fin requerido */}
      {!hasEndCriteria && !isEndDateInvalid && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <span>⚠️</span>
          <span>Debes especificar una fecha de fin O un número de sesiones para continuar.</span>
        </div>
      )}
    </div>
  );
}
