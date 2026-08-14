const DEFAULT_EVENT_TYPES = ['Wedding', 'Concert', 'Corporate', 'Party', 'Sports'];

export default function FilterBar({
  filters,
  onChange,
  onReset,
  eventNames = [],
  eventTypes = DEFAULT_EVENT_TYPES,
  visibleCount = 0,
  totalCount = 0,
}) {
  const setFilter = (key, value) => onChange({ ...filters, [key]: value });
  const hasFilters = Boolean(filters.eventName || filters.eventType || filters.eventDate);

  return (
    <section
      aria-label="Gallery filters"
      className="sticky top-3 z-20 mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-sm backdrop-blur md:p-5"
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
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
          onClick={onReset}
          disabled={!hasFilters}
          className="h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>
      </div>

      <p className="mt-3 text-xs text-[var(--muted)]" aria-live="polite">
        Showing {visibleCount} of {totalCount} photos
      </p>
    </section>
  );
}
