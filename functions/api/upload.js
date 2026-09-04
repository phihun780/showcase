export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ext = file.name ? file.name.split('.').pop() : 'webp';
    const key = `uploads/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    if (env.PORTFOLIO_ASSETS) {
      await env.PORTFOLIO_ASSETS.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || 'image/webp' },
      });
      const publicUrl = `https://pub-92c2aa5ead2a411ebfe8b083d3ce67d1.r2.dev/${key}`;
      return new Response(JSON.stringify({ success: true, url: publicUrl, key }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response(JSON.stringify({ error: 'R2 binding not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
