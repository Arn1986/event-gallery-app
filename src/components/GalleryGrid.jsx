import { useEffect, useRef, useState } from 'react';

const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;

function encodePublicId(publicId = '') {
  return publicId
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

function cloudinaryUrl(photo, width, extra = '') {
  if (!CLOUD_NAME || !photo?.publicId) return photo?.secureUrl || '';

  const transformations = [
    'f_auto',
    'q_auto',
    'c_limit',
    `w_${width}`,
    extra,
  ]
    .filter(Boolean)
    .join(',');

  const version = photo.version ? `v${photo.version}/` : '';
  const format = photo.format ? `.${photo.format}` : '';
  return `https://res.cloudinary.com/${encodeURIComponent(CLOUD_NAME)}/image/upload/${transformations}/${version}${encodePublicId(photo.publicId)}${format}`;
}

function getDownloadUrl(secureUrl) {
  if (!secureUrl) return '';
  return secureUrl.replace('/upload/', '/upload/fl_attachment/');
}

function formatDate(value) {
  if (!value) return 'Date not set';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function PhotoCard({ photo, onOpen }) {
  const [loaded, setLoaded] = useState(false);
  const alt = photo.eventName
    ? `${photo.eventName}${photo.eventType ? ` — ${photo.eventType}` : ''}`
    : 'Event photo';
  const ratio = photo.width && photo.height ? `${photo.width} / ${photo.height}` : '4 / 3';
  
  const downloadName = photo.eventName
    ? `${photo.eventName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-photo.jpg`
    : 'event-photo.jpg';

  // Smart download/share handler for mobile and desktop
  const handleDownloadOrShare = async (e) => {
    e.stopPropagation(); // Prevents lightbox from opening

    const imageUrl = getDownloadUrl(photo.secureUrl);

    // Check if the browser supports mobile Web Share API with files
    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], downloadName, { type: blob.type });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: photo.eventName || 'Event Photo',
            text: `Photo from ${photo.eventName || 'Event'}`,
          });
          return;
        }
      } catch (err) {
        // Ignore if user cancels the share drawer
        if (err.name !== 'AbortError') {
          console.error('Mobile share failed, falling back to download link', err);
        } else {
          return;
        }
      }
    }

    // Fallback for desktop or unsupported browsers
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <article className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={`Open ${alt} in lightbox`}
      >
        <div
          className="relative overflow-hidden bg-[var(--border)]"
          style={{
            aspectRatio: ratio,
            backgroundImage: `url(${cloudinaryUrl(photo, 80, 'e_blur:1000,q_1')})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        >
          <img
            src={cloudinaryUrl(photo, 900)}
            srcSet={`${cloudinaryUrl(photo, 480)} 480w, ${cloudinaryUrl(photo, 768)} 768w, ${cloudinaryUrl(photo, 1200)} 1200w`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
            width={photo.width || undefined}
            height={photo.height || undefined}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.015] ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 via-black/30 to-transparent p-4 pt-12 text-white opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100">
            <p className="font-semibold">{photo.eventName || 'Untitled event'}</p>
            <p className="mt-1 text-xs text-white/80">
              {[photo.eventType, formatDate(photo.eventDate)].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </button>

      {/* Download / Share Button Overlay */}
      <button
        type="button"
        onClick={handleDownloadOrShare}
        className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg bg-black/60 text-white opacity-40 backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-black/90 hover:opacity-100"
        aria-label="Download or share high-resolution photo"
        title="Download Photo"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
          <path d="M19 15v4H5v-4H3v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4h-2zm-6 2.414l5.707-5.707-1.414-1.414L13 14.586V2h-2v12.586l-4.293-4.293-1.414 1.414L13 17.414z"/>
        </svg>
      </button>
    </article>
  );
}

function Lightbox({ photos, index, onClose, onChange }) {
  const photo = photos[index];
  const closeRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && photos.length > 1) onChange((index + 1) % photos.length);
      if (event.key === 'ArrowLeft' && photos.length > 1) onChange((index - 1 + photos.length) % photos.length);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [index, onChange, onClose, photos.length]);

  if (!photo) return null;

  const alt = photo.eventName
    ? `${photo.eventName}${photo.eventType ? ` — ${photo.eventType}` : ''}`
    : 'Event photo';

  return (
    <div
      className="fixed inset-0 z-50 grid bg-black/90 p-3 backdrop-blur-sm md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative m-auto flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-zinc-950 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{photo.eventName || 'Untitled event'}</p>
            <p className="truncate text-xs text-zinc-400">
              {[photo.eventType, formatDate(photo.eventDate)].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-white/15 text-white hover:bg-white/10"
            aria-label="Close lightbox"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="relative grid min-h-0 flex-1 place-items-center bg-black">
          <img
            src={cloudinaryUrl(photo, 2200)}
            srcSet={`${cloudinaryUrl(photo, 1200)} 1200w, ${cloudinaryUrl(photo, 1800)} 1800w, ${cloudinaryUrl(photo, 2400)} 2400w`}
            sizes="100vw"
            alt={alt}
            className="max-h-[78vh] max-w-full object-contain"
          />

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onChange((index - 1 + photos.length) % photos.length)}
                className="absolute left-3 grid size-11 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/15 hover:bg-black/80"
                aria-label="Previous photo"
              >
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  <path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onChange((index + 1) % photos.length)}
                className="absolute right-3 grid size-11 place-items-center rounded-full bg-black/60 text-white ring-1 ring-white/15 hover:bg-black/80"
                aria-label="Next photo"
              >
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GalleryGrid({ photos = [], loading = false, error = '' }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading gallery">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[4/3] animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)]"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm" role="alert">
        <p className="font-semibold">The gallery could not be loaded.</p>
        <p className="mt-1 text-[var(--muted)]">{error}</p>
      </div>
    );
  }

  if (!photos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-elevated)] p-10 text-center">
        <p className="font-semibold">No photos match these filters.</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Try clearing one or more filters.</p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
        {photos.map((photo, index) => (
          <PhotoCard
            photo={photo}
            key={photo.assetId || photo.publicId}
            onOpen={() => setLightboxIndex(index)}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onChange={setLightboxIndex}
        />
      )}
    </>
  );
}
