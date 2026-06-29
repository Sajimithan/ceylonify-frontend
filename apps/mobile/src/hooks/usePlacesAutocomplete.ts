import { useEffect, useRef, useState } from 'react';
import { fetchPlaceSuggestions, type PlaceSuggestion } from '../lib/googlePlaces';

export function usePlacesAutocomplete(input: string, enabled = true, debounceMs = 350) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || input.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const results = await fetchPlaceSuggestions(input);
        if (requestIdRef.current !== requestId) return;
        setSuggestions(results);
      } catch {
        if (requestIdRef.current === requestId) setSuggestions([]);
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [input, enabled, debounceMs]);

  function clearSuggestions() {
    setSuggestions([]);
    setLoading(false);
  }

  return { suggestions, loading, clearSuggestions };
}
