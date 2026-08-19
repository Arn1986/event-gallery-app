import { useEffect, useRef, useState } from 'react';

const EVENT_TYPES = ['Races', 'Training', 'Party', 'Sports', 'Community'];

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function loadCloudinaryWidget() {
  return new Promise((resolve, reject) => {
    if (window.cloudinary?.createUploadWidget) {
      resolve(window.cloudinary);
      return;
    }

    const existing = document.querySelector('script[data-cloudinary-upload-widget]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.cloudinary), { once: true });
      existing.addEventListener('error', () => reject(new Error('Cloudinary Upload Widget failed to load.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/latest/global/all.js';
    script.async = true;
    script.dataset.cloudinaryUploadWidget = 'true';
    script.onload = () => resolve(window.cloudinary);
    script.onerror = () => reject(new Error('Cloudinary Upload Widget failed to load.'));
    document.head.appendChild(script);
  });
}

export default function UploadWidget({ cloudName, uploadPreset }) {
  const [metadata, setMetadata] = useState({
    eventName: '',
    eventType: '',
    eventDate: '',
  });
  const [widgetReady, setWidgetReady] = useState(false);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [uploadedCount, setUploadedCount] = useState(0);
  const [toast, setToast] = useState('');
  const widgetRef = useRef(null);
  const metadataRef = useRef(metadata);

  metadataRef.current = metadata;

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;

    if (!cloudName || !uploadPreset || cloudName === 'your_cloud_name' || uploadPreset === 'your_unsigned_upload_preset') {
      setStatus({
        type: 'error',
        message: 'Set PUBLIC_CLOUDINARY_CLOUD_NAME and PUBLIC_CLOUDINARY_UPLOAD_PRESET before uploading.',
      });
      return undefined;
    }

    loadCloudinaryWidget()
      .then((cloudinary) => {
        if (!active) return;

        widgetRef.current = cloudinary.createUploadWidget(
          {
            cloudName,
            uploadPreset,
            resourceType: 'image',
            multiple: true,
            maxFiles: 50,
            sources: ['local', 'camera', 'url'],
            showAdvancedOptions: false,
            showCompletedButton: true,
            prepareUploadParams: (cb) => {
              const current = metadataRef.current;
              const eventName = current.eventName.trim();

              if (!eventName || !current.eventType || !current.eventDate) {
                cb({ cancel: true });
                setStatus({ type: 'error', message: 'Complete all event metadata before uploading.' });
                return;
              }

              cb({
                uploadPreset,
                // CORRECT: Formatted as a pipe-separated string
                context: `event_name=${encodeURIComponent(eventName)}|event_type=${encodeURIComponent(current.eventType)}|event_date=${encodeURIComponent(current.eventDate)}`,
                tags: [
                  'event-gallery',
                  `event-type-${slugify(current.eventType)}`,
                  `event-${slugify(eventName)}`,
                ],
              });
            },
          },
          (error, result) => {
            if (!active) return;

            if (error) {
              setStatus({
                type: 'error',
                message: error?.statusText || error?.message || 'Upload failed. Check the Cloudinary preset and try again.',
              });
              return;
            }

            if (!result?.event) return;

            if (result.event === 'queues-start') {
              setStatus({ type: 'uploading', message: 'Uploading photos…' });
            }

            if (result.event === 'success') {
              setUploadedCount((count) => count + 1);
              setStatus({ type: 'success', message: 'Photo uploaded successfully.' });
              setToast('Photo uploaded successfully.');
            }

            if (result.event === 'queues-end') {
              setStatus({ type: 'success', message: 'Upload queue completed.' });
              setToast('Upload queue completed.');
            }
          },
        );

        setWidgetReady(true);
      })
      .catch((loadError) => {
        if (active) setStatus({ type: 'error', message: loadError.message });
      });

    return () => {
      active = false;
      widgetRef.current?.destroy?.();
      widgetRef.current = null;
    };
  }, [cloudName, uploadPreset]);

  const canUpload = Boolean(
    widgetReady && metadata.eventName.trim() && metadata.eventType && metadata.eventDate,
  );

  const updateMetadata = (key, value) => {
    setMetadata((current) => ({ ...current, [key]: value }));
    if (status.type === 'error') setStatus({ type: 'idle', message: '' });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.55fr)]">
      <form
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-sm md:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (canUpload) widgetRef.current?.open();
        }}
      >
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Upload metadata</p>
          <h2 className="mt-2 text-xl font-semibold">Describe this event</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            These values are written to every selected image as Cloudinary contextual metadata.
          </p>
        </div>

        <div className="grid gap-5">
          <label className="grid gap-1.5 text-sm font-medium">
            <span>Event name</span>
            <input
              required
              type="text"
              value={metadata.eventName}
              onChange={(event) => updateMetadata('eventName', event.target.value)}
              placeholder="Annual Tech Summit 2026"
              maxLength={120}
              className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text)] placeholder:text-[var(--muted)]"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">
              <span>Event type</span>
              <select
                required
                value={metadata.eventType}
                onChange={(event) => updateMetadata('eventType', event.target.value)}
                className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text)]"
              >
                <option value="" disabled>Select a type</option>
                {EVENT_TYPES.map((type) => (
                  <option value={type} key={type}>{type}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-medium">
              <span>Event date</span>
              <input
                required
                type="date"
                value={metadata.eventDate}
                onChange={(event) => updateMetadata('eventDate', event.target.value)}
                className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--text)]"
              />
            </label>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canUpload}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-text)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Choose & upload photos
          </button>
          <span className="text-xs text-[var(--muted)]">Up to 50 images per batch</span>
        </div>
      </form>

      <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-sm md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Upload status</p>

        {status.type === 'uploading' && (
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[var(--border)]" aria-hidden="true">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-500" />
          </div>
        )}

        <div className="mt-5 flex items-start gap-3" aria-live="polite" aria-atomic="true">
          <span
            className={`mt-1 size-2.5 shrink-0 rounded-full ${
              status.type === 'error'
                ? 'bg-red-500'
                : status.type === 'success'
                  ? 'bg-emerald-500'
                  : status.type === 'uploading'
                    ? 'animate-pulse bg-amber-500'
                    : widgetReady
                      ? 'bg-emerald-500'
                      : 'bg-zinc-400'
            }`}
          />
          <div>
            <p className="text-sm font-semibold">
              {status.message || (widgetReady ? 'Ready to upload' : 'Loading uploader…')}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              {uploadedCount > 0 ? `${uploadedCount} photo${uploadedCount === 1 ? '' : 's'} uploaded in this session.` : 'No photos uploaded in this session yet.'}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 text-sm">
          <div>
            <dt className="text-[var(--muted)]">Context key</dt>
            <dd className="mt-1 font-mono text-xs">event_name</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Context key</dt>
            <dd className="mt-1 font-mono text-xs">event_type</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Context key</dt>
            <dd className="mt-1 font-mono text-xs">event_date</dd>
          </div>
        </dl>
      </aside>

      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-medium shadow-xl"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
