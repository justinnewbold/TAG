import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Ready check for load balancers
router.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

// Live check for Kubernetes/Railway
router.get('/live', (req, res) => {
  res.status(200).send('OK');
});

export default router;
