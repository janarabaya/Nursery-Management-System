const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests to backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      secure: false,
      timeout: 30000, // 30 seconds timeout
      proxyTimeout: 30000,
      // Add logging
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[PROXY] Forwarding ${req.method} ${req.url} to http://localhost:5000${req.url}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`[PROXY] Response ${proxyRes.statusCode} for ${req.url}`);
      },
      onError: (err, req, res) => {
        console.error(`[PROXY] Error proxying ${req.url}:`, err.message);
        res.status(500).json({
          success: false,
          error: 'Proxy error: Backend server may not be running',
          details: err.message
        });
      },
      // Handle connection errors
      logLevel: 'debug',
      // Increase buffer size for large responses
      buffer: false,
    })
  );

  // Handle Chrome DevTools requests (prevents 404 errors)
  app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(204).end();
  });
};
