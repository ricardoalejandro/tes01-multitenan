"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TimePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minTime?: string // HH:MM format
  maxTime?: string // HH:MM format
  error?: boolean
}

// Genera las opciones de tiempo de 6:00 AM a 11:00 PM en intervalos de 15 minutos
function generateTimeOptions(minTime?: string, maxTime?: string): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const startHour = 6 // 6:00 AM
  const endHour = 23 // 11:00 PM
  
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeValue = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      
      // Filtrar por minTime y maxTime si se proporcionan
      if (minTime && timeValue < minTime) continue
      if (maxTime && timeValue > maxTime) continue
      
      // Convertir a formato 12 horas para mostrar
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const period = hour >= 12 ? 'PM' : 'AM'
      const displayMinute = String(minute).padStart(2, '0')
      const label = `${displayHour}:${displayMinute} ${period}`
      
      options.push({ value: timeValue, label })
    }
  }
  
  return options
}

// Convierte HH:MM a formato de visualización
function formatTimeDisplay(time: string): string {
  if (!time) return ''
  const [hourStr, minuteStr] = time.split(':')
  const hour = parseInt(hourStr, 10)
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  const period = hour >= 12 ? 'PM' : 'AM'
  return `${displayHour}:${minuteStr} ${period}`
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Seleccionar hora",
  disabled = false,
  className,
  minTime,
  maxTime,
  error = false,
}: TimePickerProps) {
  const options = React.useMemo(
    () => generateTimeOptions(minTime, maxTime),
    [minTime, maxTime]
  )

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger 
        className={cn(
          "w-full",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder={placeholder}>
            {value ? formatTimeDisplay(value) : placeholder}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-[280px]">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Componente para seleccionar rango de tiempo (inicio y fin)
interface TimeRangePickerProps {
  startTime?: string
  endTime?: string
  onStartTimeChange?: (value: string) => void
  onEndTimeChange?: (value: string) => void
  disabled?: boolean
  className?: string
  error?: string
}

export function TimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  disabled = false,
  className,
  error,
}: TimeRangePickerProps) {
  const isEndTimeInvalid = startTime && endTime && endTime <= startTime

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Hora de Inicio
          </label>
          <TimePicker
            value={startTime}
            onChange={onStartTimeChange}
            placeholder="Hora inicio"
            disabled={disabled}
            maxTime={endTime}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Hora de Fin
          </label>
          <TimePicker
            value={endTime}
            onChange={onEndTimeChange}
            placeholder="Hora fin"
            disabled={disabled}
            minTime={startTime}
            error={!!isEndTimeInvalid}
          />
        </div>
      </div>
      {(error || isEndTimeInvalid) && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <span>⚠️</span>
          {error || "La hora de fin debe ser mayor a la hora de inicio"}
        </p>
      )}
    </div>
  )
}

export { generateTimeOptions, formatTimeDisplay }
