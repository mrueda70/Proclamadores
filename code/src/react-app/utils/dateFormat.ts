const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_SEMANA_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a date to Spanish with proper lowercase formatting
 * Manually constructs the date string to avoid browser locale issues
 */
export function formatSpanishDate(
  date: Date,
  options: Intl.DateTimeFormatOptions
): string {
  const dia = date.getDate();
  const mes = date.getMonth();
  const año = date.getFullYear();
  const diaSemana = date.getDay();

  // Weekday only
  if (options.weekday && !options.month && !options.day) {
    if (options.weekday === 'long') {
      return DIAS_SEMANA[diaSemana];
    } else if (options.weekday === 'short') {
      return DIAS_SEMANA_CORTOS[diaSemana];
    }
  }

  // Numeric date format (DD/MM/YYYY)
  if (options.day === '2-digit' && options.month === '2-digit' && options.year === 'numeric') {
    const diaStr = dia.toString().padStart(2, '0');
    const mesStr = (mes + 1).toString().padStart(2, '0');
    return `${diaStr}/${mesStr}/${año}`;
  }

  // Weekday + date formats
  if (options.weekday === 'long' && options.month === 'long') {
    // Format: "Lunes, 3 de febrero de 2026"
    return `${capitalize(DIAS_SEMANA[diaSemana])}, ${dia} de ${MESES[mes]} de ${año}`;
  } else if (options.weekday === 'short' && options.month === 'short' && options.day) {
    // Format: "Lun, 3 de feb de 2026"
    if (options.year === 'numeric') {
      return `${capitalize(DIAS_SEMANA_CORTOS[diaSemana])}, ${dia} de ${MESES_CORTOS[mes]} de ${año}`;
    }
    // Format: "Lun, 3 de feb"
    return `${capitalize(DIAS_SEMANA_CORTOS[diaSemana])}, ${dia} de ${MESES_CORTOS[mes]}`;
  }

  // Date only formats
  if (options.month === 'long' && options.year === 'numeric') {
    // Format: "3 de febrero de 2026"
    return `${dia} de ${MESES[mes]} de ${año}`;
  } else if (options.month === 'long') {
    // Format: "3 de febrero"
    return `${dia} de ${MESES[mes]}`;
  }

  // Default fallback
  return `${dia} de ${MESES[mes]} de ${año}`;
}
