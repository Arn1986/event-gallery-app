# Event Gallery — Astro + React + Tailwind + Cloudinary

A fast public event-photo gallery with a Cloudinary-backed upload admin. The public page is prerendered, while `/api/photos.json` is rendered on demand through the Cloudflare adapter so newly uploaded images can appear without rebuilding the site.

## Architecture note: Astro 5 for Cloudflare Pages

This project intentionally pins **Astro 5** and `@astrojs/cloudflare` 12.x. Astro 6 removed Cloudflare Pages support from the Cloudflare adapter and targets Cloudflare Workers for on-demand rendering. Astro 5 supports the requested Cloudflare Pages + mixed static/on-demand architecture.

Astro 5 no longer needs the legacy `output: "hybrid"` mode. The equivalent setup is:

- static output by default,
- `export const prerender = true` for `/` and `/admin`,
- `export const prerender = false` for `/api/photos.json`.

## Features

- `/` public gallery, prerendered by Astro.
- React island with event-name search, event-type filter, date filter, and reset.
- Responsive masonry layout using CSS columns.
- Lazy-loaded Cloudinary images using `f_auto`, `q_auto`, responsive widths, and blurred low-resolution placeholders.
- Keyboard-accessible lightbox with Escape and left/right arrow navigation.
- `/admin` upload panel intended to be protected by Cloudflare Zero Trust Access.
- Cloudinary Upload Widget with multi-image uploads.
- Every upload receives contextual metadata:
  - `event_name`
  - `event_type`
  - `event_date`
- Every upload also receives the `event-gallery` tag so the public API can isolate gallery assets.
- Upload status, indeterminate progress feedback, and completion toast.

## 1. Install

Use Node.js 22 or newer.

```bash
npm install
```

## 2. Environment variables

The requested `.env` file is included with placeholders and is ignored by Git.

```bash
PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloud_name"
PUBLIC_CLOUDINARY_UPLOAD_PRESET="your_unsigned_upload_preset"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

For Cloudflare-adapter runtime testing, copy `.dev.vars.example` to `.dev.vars` and use the same values:

```bash
cp .dev.vars.example .dev.vars
```

On Windows PowerShell:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Never commit `.env` or `.dev.vars` with real secrets.

## 3. Cloudinary setup

1. Create an **unsigned upload preset** in Cloudinary.
2. Put the preset name in `PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
3. Put your Cloudinary product environment name in `PUBLIC_CLOUDINARY_CLOUD_NAME`.
4. Add the Cloudinary API key and secret for the server-side Search API route.
5. Uploads from this app are tagged with `event-gallery`; `/api/photos.json` searches only images carrying that tag.

The Upload Widget sends the event fields as Cloudinary contextual metadata through `prepareUploadParams`:

```js
context: {
  event_name: eventName,
  event_type: eventType,
  event_date: eventDate,
}
```
all must be present
The preset name is public by design for unsigned uploads. Cloudinary notes that unsigned presets embedded in client-side applications can be inspected. Cloudflare Access protects the admin route, but if you need stronger upload authorization later, switch the widget to a signed-upload flow.

## 4. Local development

```bash
npm run dev
```

Open:

- Gallery: `http://localhost:4321/`
- Admin: `http://localhost:4321/admin`

Run validation/build:

```bash
npm run check
npm run build
```

## 5. Cloudflare Pages deployment

Create a GitHub repository and connect it to **Cloudflare Pages**.

Recommended Pages build settings:

- Production branch: `main`
- Build command: `npm run build`
- Build directory: `dist`
- Node version: `22`

Set all four environment variables in the Pages project. Treat `CLOUDINARY_API_SECRET` as a secret. `PUBLIC_CLOUDINARY_CLOUD_NAME` and `PUBLIC_CLOUDINARY_UPLOAD_PRESET` are intentionally client-visible.

The API route reads credentials from the Cloudflare runtime first and falls back to Astro/Vite environment variables for local development.

## 6. Protect `/admin` with Cloudflare Zero Trust Access

In Cloudflare Zero Trust:

1. Go to **Access controls → Applications**.
2. Create a **Self-hosted and private** application.
3. Add your public hostname and scope the application path to `/admin` (or `/admin/*` depending on your hostname/path configuration).
4. Add an **Allow** policy for the users or identity groups that should upload photos.
5. Keep the public `/` and `/api/photos.json` paths outside the protected application path.

There is intentionally no application-layer login form.

## Gallery data flow

1. The public HTML shell is prerendered.
2. `GalleryExplorer.jsx` hydrates in the browser.
3. It fetches `/api/photos.json` from the same origin.
4. The API route authenticates server-side to Cloudinary's Search API.
5. It requests the newest 500 `event-gallery` images and returns only public asset data plus event context.
6. The browser filters that in-memory list instantly without further requests.

The API response uses short cache headers and the Cloudflare Cache API when available to reduce pressure on Cloudinary's rate-limited Admin/Search API.

## Cloudinary delivery transformations

Thumbnail and lightbox URLs are generated from each Cloudinary `public_id` with transformations such as:

```text
f_auto,q_auto,c_limit,w_768
```

Responsive `srcset` variants are generated for several widths, and the placeholder uses a tiny blurred transformation.

## Project structure

```text
src/
├── components/
│   ├── FilterBar.jsx
│   ├── GalleryExplorer.jsx
│   ├── GalleryGrid.jsx
│   └── UploadWidget.jsx
├── layouts/
│   └── BaseLayout.astro
├── pages/
│   ├── api/
│   │   └── photos.json.js
│   ├── admin/
│   │   └── index.astro
│   └── index.astro
└── styles/
    └── global.css
```

## Scaling note

The current endpoint returns the newest 500 gallery images in one request. If the library grows beyond that, the next step is cursor-based pagination/infinite loading using Cloudinary's `next_cursor` rather than increasing the single response indefinitely.
