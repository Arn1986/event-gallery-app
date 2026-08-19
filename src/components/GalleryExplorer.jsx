import { useEffect, useMemo, useState } from 'react';
import FilterBar from './FilterBar.jsx';
import GalleryGrid from './GalleryGrid.jsx';

const DEFAULT_FILTERS = {
  eventName: '',
  eventType: '',
  eventDate: '',
};

const DEFAULT_EVENT_TYPES = ['Events', 'Races', 'Training', 'Party', 'Sports'];

export default function GalleryExplorer() {
  const [photos, setPhotos] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadPhotos() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/photos.json', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || `Gallery request failed (${response.status})`);
        }

        setPhotos(Array.isArray(payload.photos) ? payload.photos : []);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Unknown gallery error');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadPhotos();
    return () => controller.abort();
  }, []);

  const eventNames = useMemo(
    () => [...new Set(photos.map((photo) => photo.eventName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [photos],
  );

  const eventTypes = useMemo(() => {
    const dynamicTypes = photos.map((photo) => photo.eventType).filter(Boolean);
    return [...new Set([...DEFAULT_EVENT_TYPES, ...dynamicTypes])].sort((a, b) => a.localeCompare(b));
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    const eventName = filters.eventName.trim().toLocaleLowerCase();

    return photos.filter((photo) => {
      const matchesName = !eventName || (photo.eventName || '').toLocaleLowerCase().includes(eventName);
      const matchesType = !filters.eventType || photo.eventType === filters.eventType;
      const matchesDate = !filters.eventDate || photo.eventDate === filters.eventDate;
      return matchesName && matchesType && matchesDate;
    });
  }, [filters, photos]);

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
        eventNames={eventNames}
        eventTypes={eventTypes}
        visibleCount={filteredPhotos.length}
        totalCount={photos.length}
      />
      <GalleryGrid photos={filteredPhotos} loading={loading} error={error} />
    </div>
  );
}
