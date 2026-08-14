export const prerender = false;

const SEARCH_ENDPOINT = (cloudName) =>
  `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/search`;

function getEnv(locals) {
  const runtimeEnv = locals?.runtime?.env || {};

  return {
    cloudName:
      runtimeEnv.PUBLIC_CLOUDINARY_CLOUD_NAME ||
      import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME,
    apiKey: runtimeEnv.CLOUDINARY_API_KEY || import.meta.env.CLOUDINARY_API_KEY,
    apiSecret:
      runtimeEnv.CLOUDINARY_API_SECRET || import.meta.env.CLOUDINARY_API_SECRET,
  };
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  });
}

function normalizeResource(resource) {
  const context = resource.context?.custom || resource.context || {};

  return {
    assetId: resource.asset_id,
    publicId: resource.public_id,
    version: resource.version,
    format: resource.format,
    width: resource.width,
    height: resource.height,
    secureUrl: resource.secure_url,
    createdAt: resource.created_at,
    eventName: context.event_name || '',
    eventType: context.event_type || '',
    eventDate: context.event_date || '',
  };
}

export async function GET({ locals, request }) {
  const { cloudName, apiKey, apiSecret } = getEnv(locals);

  if (!cloudName || !apiKey || !apiSecret || cloudName === 'your_cloud_name') {
    return json(
      {
        error:
          'Cloudinary server credentials are not configured. Set the Cloudinary environment variables in Cloudflare Pages and local development.',
      },
      { status: 500 },
    );
  }

  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request(request.url, { method: 'GET' });

  if (cache) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) return cachedResponse;
  }

  try {
    const auth = btoa(`${apiKey}:${apiSecret}`);
    const cloudinaryResponse = await fetch(SEARCH_ENDPOINT(cloudName), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expression: 'resource_type:image AND type:upload AND tags=event-gallery',
        sort_by: [{ created_at: 'desc' }],
        fields: ['context', 'tags'],
        max_results: 500,
      }),
    });

    if (!cloudinaryResponse.ok) {
      const detail = await cloudinaryResponse.text();
      console.error('Cloudinary Search API error', cloudinaryResponse.status, detail);
      return json(
        { error: 'Cloudinary returned an error while loading the gallery.' },
        { status: 502 },
      );
    }

    const data = await cloudinaryResponse.json();
    const photos = (data.resources || [])
      .map(normalizeResource)
      .filter((photo) => photo.publicId && photo.eventName && photo.eventType && photo.eventDate);

    const response = json(
      {
        photos,
        count: photos.length,
        truncated: Boolean(data.next_cursor),
      },
      {
        headers: {
          'cache-control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );

    if (cache) {
      try {
        await cache.put(cacheKey, response.clone());
      } catch (cacheError) {
        console.warn('Gallery cache write failed', cacheError);
      }
    }

    return response;
  } catch (error) {
    console.error('Gallery API failure', error);
    return json(
      { error: 'Unexpected error while loading photos.' },
      { status: 500 },
    );
  }
}
