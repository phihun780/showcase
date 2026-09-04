export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (env.PORTFOLIO_ASSETS) {
      const object = await env.PORTFOLIO_ASSETS.get('data/portfolio.json');
      if (object) {
        const data = await object.text();
        return new Response(data, {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          },
        });
      }
    }
  } catch (e) {}
  return new Response(JSON.stringify({ empty: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const payload = await request.json();
    if (env.PORTFOLIO_ASSETS) {
      await env.PORTFOLIO_ASSETS.put('data/portfolio.json', JSON.stringify(payload, null, 2), {
        httpMetadata: { contentType: 'application/json' },
      });
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    return new Response(JSON.stringify({ error: 'R2 binding not configured' }), { status: 500 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
