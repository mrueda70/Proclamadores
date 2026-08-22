import { useState, useEffect } from 'react';
import type { SpecialCelebration, CelebrationRole } from '@/react-app/types';

export function useSpecialCelebrations() {
  const [celebrations, setCelebrations] = useState<SpecialCelebration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCelebrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/special-celebrations');
      if (!response.ok) throw new Error('Failed to fetch celebrations');
      const data = await response.json();
      setCelebrations(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCelebrations();
  }, []);

  const createCelebration = async (celebrationData: Omit<SpecialCelebration, 'id' | 'created_at' | 'updated_at' | 'roles'>) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/special-celebrations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(celebrationData),
      });
      if (!response.ok) throw new Error('Failed to create celebration');
      const newCelebration = await response.json();
      setCelebrations([...celebrations, newCelebration]);
      return newCelebration;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const updateCelebration = async (id: number, celebrationData: Omit<SpecialCelebration, 'id' | 'created_at' | 'updated_at' | 'roles'>) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/special-celebrations/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(celebrationData),
      });
      if (!response.ok) throw new Error('Failed to update celebration');
      const updatedCelebration = await response.json();
      setCelebrations(celebrations.map((c) => (c.id === id ? updatedCelebration : c)));
      return updatedCelebration;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteCelebration = async (id: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/special-celebrations/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to delete celebration');
      setCelebrations(celebrations.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const updateRoles = async (celebrationId: number, roles: Omit<CelebrationRole, 'id' | 'celebration_id' | 'created_at' | 'updated_at'>[]) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/special-celebrations/${celebrationId}/roles`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ roles }),
      });
      if (!response.ok) throw new Error('Failed to update roles');
      await fetchCelebrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return {
    celebrations,
    loading,
    error,
    createCelebration,
    updateCelebration,
    deleteCelebration,
    updateRoles,
    refetch: fetchCelebrations,
  };
}
