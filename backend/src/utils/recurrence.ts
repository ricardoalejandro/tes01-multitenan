/**
 * Utilidad para calcular fechas de recurrencia
 * Inspirado en Google Calendar
 */

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  interval: number; // Repetir cada N días/semanas/meses
  days?: string[]; // Para weekly: ['monday', 'thursday']
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (opcional)
  maxOccurrences?: number; // Número máximo de ocurrencias (opcional)
}

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Genera array de fechas según configuración de recurrencia
 */
export function generateRecurrenceDates(config: RecurrenceConfig): string[] {
  const dates: string[] = [];
  const startDate = new Date(config.startDate);
  const endDate = config.endDate ? new Date(config.endDate) : null;
  const maxOccurrences = config.maxOccurrences || 1000; // Límite de seguridad

  let currentDate = new Date(startDate);
  let occurrenceCount = 0;

  while (occurrenceCount < maxOccurrences) {
    // Verificar si llegamos a la fecha de fin
    if (endDate && currentDate > endDate) {
      break;
    }

    // Añadir fecha según el tipo de recurrencia
    if (config.frequency === 'daily') {
      dates.push(formatDate(currentDate));
      currentDate = addDays(currentDate, config.interval);
      occurrenceCount++;
    } else if (config.frequency === 'weekly') {
      // Para semanal, buscar los días de la semana especificados
      const weekStart = new Date(currentDate);
      const weekDates = getWeeklyDates(weekStart, config.days || []);

      for (const date of weekDates) {
        if (endDate && date > endDate) break;
        if (date >= startDate) {
          dates.push(formatDate(date));
          occurrenceCount++;
          if (occurrenceCount >= maxOccurrences) break;
        }
      }

      // Avanzar N semanas
      currentDate = addWeeks(currentDate, config.interval);
    } else if (config.frequency === 'monthly') {
      dates.push(formatDate(currentDate));
      currentDate = addMonths(currentDate, config.interval);
      occurrenceCount++;
    }

    // Protección contra bucles infinitos
    if (occurrenceCount >= maxOccurrences) {
      break;
    }
  }

  return dates;
}

/**
 * Obtiene las fechas de los días especificados en una semana
 */
function getWeeklyDates(weekStart: Date, days: string[]): Date[] {
  const dates: Date[] = [];
  const dayIndexes = days.map(day => DAY_NAMES.indexOf(day.toLowerCase()));

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();

    if (dayIndexes.includes(dayOfWeek)) {
      dates.push(date);
    }
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Añade días a una fecha
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Añade semanas a una fecha
 */
function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Añade meses a una fecha
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Formatea fecha a YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Recalcula fechas de sesiones manteniendo el orden y ajustando según recurrencia
 */
export function recalculateSessionDates(
  sessions: Array<{ sessionNumber: number; sessionDate: string }>,
  config: RecurrenceConfig
): Array<{ sessionNumber: number; sessionDate: string }> {
  // Generar todas las fechas posibles
  const allDates = generateRecurrenceDates(config);

  // Mapear sesiones a las nuevas fechas
  return sessions
    .sort((a, b) => a.sessionNumber - b.sessionNumber)
    .map((session, index) => ({
      sessionNumber: index + 1,
      sessionDate: allDates[index] || session.sessionDate, // Fallback a fecha original si no hay más fechas
    }));
}
