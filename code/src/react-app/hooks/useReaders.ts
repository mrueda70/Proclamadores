import { useState, useEffect } from 'react';
import type { Reader } from '@/react-app/types';

export function useReaders() {
  const [readers, setReaders] = useState<Reader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReaders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/readers');
      if (!response.ok) throw new Error('Failed to fetch readers');
      const data = await response.json();
      setReaders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReaders();
  }, []);

  const createReader = async (readerData: Omit<Reader, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/readers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(readerData),
      });
      if (!response.ok) throw new Error('Failed to create reader');
      const newReader = await response.json();
      setReaders([...readers, newReader]);
      return newReader;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const updateReader = async (id: number, readerData: Omit<Reader, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/readers/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(readerData),
      });
      if (!response.ok) throw new Error('Failed to update reader');
      const updatedReader = await response.json();
      setReaders(readers.map((r) => (r.id === id ? updatedReader : r)));
      return updatedReader;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  const deleteReader = async (id: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/readers/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to delete reader');
      setReaders(readers.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  };

  return {
    readers,
    loading,
    error,
    createReader,
    updateReader,
    deleteReader,
    refetch: fetchReaders,
  };
}
