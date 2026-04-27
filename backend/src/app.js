const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors());
app.use(express.json());

// Swagger UI - dynamic server URL
const swaggerDoc = require('./swagger.json');
if (process.env.RENDER_EXTERNAL_URL) {
  swaggerDoc.servers = [
    { url: process.env.RENDER_EXTERNAL_URL, description: 'Render deployment' },
    { url: 'http://localhost:3000', description: 'Local dev server' }
  ];
}
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customSiteTitle: 'Admin API Docs',
  customCss: '.swagger-ui .topbar { display: none }'
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 404, message: `Route ${req.method} ${req.path} not found` }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: { code: 500, message: 'Internal server error' }
  });
});

module.exports = app;
