import { useState, useEffect } from 'react';
import type { Mass } from '@/react-app/types';

export function useMasses() {
  const [masses, setMasses] = useState<Mass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMasses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/masses');
      if (!response.ok) throw new Error('Failed to fetch masses');
      const data = await response.json();
      setMasses(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasses();
  }, []);

  const createMass = async (massData: Omit<Mass, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Creating mass with data:', massData);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/masses', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(massData),
      });
      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to create mass');
      }
      const newMass = await response.json();
      console.log('Created mass:', newMass);
      setMasses([...masses, newMass]);
      return newMass;
    } catch (err) {
      console.error('Create mass error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const updateMass = async (id: number, massData: Omit<Mass, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Updating mass', id, 'with data:', massData);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/masses/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(massData),
      });
      console.log('Update response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to update mass');
      }
      const updatedMass = await response.json();
      console.log('Updated mass:', updatedMass);
      setMasses(masses.map((m) => (m.id === id ? updatedMass : m)));
      return updatedMass;
    } catch (err) {
      console.error('Update mass error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteMass = async (id: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/masses/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to delete mass');
      setMasses(masses.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const updateAssignments = async (
    massId: number,
    assignments: {
      first_reader_id?: number | null;
      second_reader_id?: number | null;
      psalm_reader_id?: number | null;
      commentator_reader_id?: number | null;
      first_reader_custom?: string | null;
      second_reader_custom?: string | null;
      psalm_reader_custom?: string | null;
      commentator_reader_custom?: string | null;
    }
  ) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/masses/${massId}/assignments`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(assignments),
      });
      if (!response.ok) throw new Error('Failed to update assignments');
      const updatedMass = await response.json();
      setMasses(masses.map((m) => (m.id === massId ? updatedMass : m)));
      return updatedMass;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const copySchedule = async (
    sourceStartDate: string,
    sourceEndDate: string,
    destStartDate: string,
    destEndDate: string,
    includeReaders: boolean
  ) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/masses/copy-schedule', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          source_start_date: sourceStartDate,
          source_end_date: sourceEndDate,
          dest_start_date: destStartDate,
          dest_end_date: destEndDate,
          include_readers: includeReaders,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to copy schedule');
      }
      await fetchMasses();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return {
    masses,
    loading,
    error,
    createMass,
    updateMass,
    deleteMass,
    updateAssignments,
    copySchedule,
    refetch: fetchMasses,
  };
}
