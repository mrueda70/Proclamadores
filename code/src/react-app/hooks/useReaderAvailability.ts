import { useState, useCallback } from 'react';
import type { ReaderAvailability } from '@/react-app/types';

interface AvailabilitySlot {
  day_of_week: number;
  mass_time: string;
}

export function useReaderAvailability() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async (readerId: number): Promise<ReaderAvailability[]> => {
    try {
      setLoading(true);
      const response = await fetch(`/api/readers/${readerId}/availability`);
      if (!response.ok) throw new Error('Error al obtener disponibilidad');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAvailability = useCallback(async (
    readerId: number,
    availability: AvailabilitySlot[]
  ): Promise<ReaderAvailability[]> => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/readers/${readerId}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ availability }),
      });
      if (!response.ok) throw new Error('Error al actualizar disponibilidad');
      setError(null);
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllAvailability = useCallback(async (): Promise<ReaderAvailability[]> => {
    try {
      setLoading(true);
      const response = await fetch('/api/reader-availability');
      if (!response.ok) throw new Error('Error al obtener disponibilidad');
      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchAvailability,
    updateAvailability,
    fetchAllAvailability,
  };
}
