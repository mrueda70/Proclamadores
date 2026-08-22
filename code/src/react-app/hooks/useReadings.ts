import { useState, useEffect } from 'react';

interface Readings {
  first_reading: string | null;
  psalm: string | null;
  second_reading: string | null;
  gospel: string | null;
  mass_type: string | null;
  liturgical_day: string | null;
  first_reading_text: string | null;
  psalm_text: string | null;
  second_reading_text: string | null;
  gospel_text: string | null;
}

interface ReadingsResponse {
  date: string;
  readings: Readings;
}

/**
 * Fetch with retry for network resilience
 */
async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Fetch attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      
      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError || new Error('Fetch failed');
}

export function useReadings(dates: string[]) {
  const [readings, setReadings] = useState<Map<string, Readings>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dates.length === 0) return;

    const fetchReadings = async () => {
      setLoading(true);
      setError(null);
      
      const newReadings = new Map<string, Readings>();

      try {
        // Fetch readings for each date
        const promises = dates.map(async (date) => {
          try {
            const response = await fetchWithRetry(`/api/readings/${date}`);
            
            if (response.ok) {
              const data: ReadingsResponse = await response.json();
              return { date, readings: data.readings };
            } else {
              // If readings not available, return null readings
              return {
                date,
                readings: {
                  first_reading: null,
                  psalm: null,
                  second_reading: null,
                  gospel: null,
                  mass_type: null,
                  liturgical_day: null,
                  first_reading_text: null,
                  psalm_text: null,
                  second_reading_text: null,
                  gospel_text: null
                }
              };
            }
          } catch (err) {
            console.error(`Error fetching readings for ${date}:`, err);
            return {
              date,
              readings: {
                first_reading: null,
                psalm: null,
                second_reading: null,
                gospel: null,
                mass_type: null,
                liturgical_day: null,
                first_reading_text: null,
                psalm_text: null,
                second_reading_text: null,
                gospel_text: null
              }
            };
          }
        });

        const results = await Promise.all(promises);
        
        results.forEach(({ date, readings }) => {
          newReadings.set(date, readings);
        });

        setReadings(newReadings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar lecturas');
      } finally {
        setLoading(false);
      }
    };

    fetchReadings();
  }, [dates.join(',')]);

  return { readings, loading, error };
}
