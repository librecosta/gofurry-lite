import maintenancePage from '../dist/index.html';

export default {
  fetch(request) {
    if (new URL(request.url).pathname === '/healthz') {
      return new Response(request.method === 'HEAD' ? null : 'maintenance\n', {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, {
        status: 405,
        headers: { allow: 'GET, HEAD', 'cache-control': 'no-store' },
      });
    }

    return new Response(request.method === 'HEAD' ? null : maintenancePage, {
      status: 503,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'retry-after': '3600',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  },
};
