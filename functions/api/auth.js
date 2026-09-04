export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const password = String(body.password || '').trim();

    // Check against Cloudflare secret CMS_PASSWORD (or fallback to 0324)
    const expectedPassword = env.CMS_PASSWORD ? String(env.CMS_PASSWORD).trim() : '0324';

    if (password === expectedPassword) {
      return new Response(JSON.stringify({
        success: true,
        token: `cf_auth_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Mật khẩu không chính xác'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
