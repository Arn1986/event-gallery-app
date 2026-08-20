import { useState, useEffect } from 'react';

const DEFAULT_EVENT_TYPES = ['Races', 'Training', 'Party', 'Sports', 'Community'];

export default function FilterBar({
  filters,
  onChange,
  onReset,
  eventNames = [],
  eventTypes = DEFAULT_EVENT_TYPES,
  visibleCount = 0,
  totalCount = 0,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const setFilter = (key, value) => onChange({ ...filters, [key]: value });
  const hasFilters = Boolean(filters.eventName || filters.eventType || filters.eventDate);

  // Smart Sticky Scroll Logic
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide filter bar if scrolling down and passed 100px. Show if scrolling up.
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
        // Optional: Automatically close the mobile menu when scrolling down
        setIsExpanded(false);
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <section
      aria-label="Gallery filters"
      className={`sticky top-3 z-20 mb-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-sm backdrop-blur transition-all duration-300 md:p-5 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-[150%] opacity-0'
      }`}
    >
      {/* Mobile Toggle Button */}
      <div className="flex items-center justify-between md:hidden">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-semibold transition hover:opacity-80"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {hasFilters ? 'Filters Active' : 'Filter Photos'}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`size-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <p className="text-xs text-[var(--muted)]" aria-live="polite">
          {visibleCount} / {totalCount} photos
        </p>
      </div>

      {/* Form Container (Hidden on mobile unless expanded) */}
      <div className={`mt-4 grid gap-4 md:mt-0 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end ${isExpanded ? 'grid' : 'hidden md:grid'}`}>
        <label className="grid gap-1.5 text-sm font-medium">
          <span>Event name</span>
          <input
            type="search"
            list="event-name-options"
            value={filters.eventName}
            onChange={(event) => setFilter('eventName', event.target.value)}
            placeholder="Search events"
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text)] placeholder:text-[var(--muted)]"
          />
          <datalist id="event-name-options">
            {eventNames.map((name) => (
              <option value={name} key={name} />
            ))}
          </datalist>
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          <span>Event type</span>
          <select
            value={filters.eventType}
            onChange={(event) => setFilter('eventType', event.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text)]"
          >
            <option value="">All types</option>
            {eventTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium">
          <span>Event date</span>
          <input
            type="date"
            value={filters.eventDate}
            onChange={(event) => setFilter('eventDate', event.target.value)}
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text)]"
          />
        </label>

        <button
          type="button"
          onClick={() => {
            onReset();
            setIsExpanded(false); // Collapse mobile menu when reset is clicked
          }}
          disabled={!hasFilters}
          className="h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>
      </div>

      {/* Desktop counter (Hidden on mobile since it lives in the toggle bar) */}
      <p className="mt-3 hidden text-xs text-[var(--muted)] md:block" aria-live="polite">
        Showing {visibleCount} of {totalCount} photos
      </p>
    </section>
  );
}