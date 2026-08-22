import { useState, useCallback } from 'react';

export interface Assignment {
  mass_id: number;
  mass_date: string;
  mass_time: string;
  mass_type: string;
  original: {
    first_reader_id: number | null;
    second_reader_id: number | null;
    psalm_reader_id: number | null;
    commentator_reader_id: number | null;
  };
  proposed: {
    first_reader_id: number | null;
    second_reader_id: number | null;
    psalm_reader_id: number | null;
    commentator_reader_id: number | null;
  };
  proposed_names: {
    first_reader: string | null;
    second_reader: string | null;
    psalm_reader: string | null;
    commentator: string | null;
  };
}

export interface AutoAssignResult {
  success: boolean;
  preview: boolean;
  total_masses: number;
  assignments: Assignment[];
}

export function useAutoAssign() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AutoAssignResult | null>(null);

  const generateAssignments = useCallback(async (
    startDate: string,
    endDate: string,
    preview: boolean = true
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/auto-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          preview,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al generar asignaciones');
      }
      
      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const applyAssignments = useCallback(async (
    startDate: string,
    endDate: string
  ) => {
    return generateAssignments(startDate, endDate, false);
  }, [generateAssignments]);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    result,
    generateAssignments,
    applyAssignments,
    clearResult,
  };
}
