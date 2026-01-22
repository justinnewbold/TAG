import { Router } from 'express';
import { db, isPostgres } from '../db/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Check database connectivity
async function checkDatabase() {
  try {
    if (isPostgres()) {
      await db.query('SELECT 1');
    } else {
      db.prepare('SELECT 1').get();
    }
    return { status: 'connected', type: isPostgres() ? 'postgresql' : 'sqlite' };
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
    return { status: 'error', error: error.message };
  }
}

// Comprehensive health check endpoint
router.get('/health', async (req, res) => {
  const dbStatus = await checkDatabase();
  const errorStats = logger.getErrorStats();
  const memoryUsage = process.memoryUsage();

  // Determine overall health
  let overallStatus = 'healthy';
  const issues = [];

  if (dbStatus.status !== 'connected') {
    overallStatus = 'unhealthy';
    issues.push('Database connection failed');
  }

  if (errorStats.recentErrors >= 10) {
    overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
    issues.push(`High error rate: ${errorStats.recentErrors} errors in last minute`);
  }

  // Memory warning if using more than 512MB
  const memoryMB = memoryUsage.heapUsed / 1024 / 1024;
  if (memoryMB > 512) {
    overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
    issues.push(`High memory usage: ${memoryMB.toFixed(0)}MB`);
  }

  const healthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    checks: {
      database: dbStatus,
      errors: errorStats,
      memory: {
        heapUsedMB: Math.round(memoryMB),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
      },
    },
  };

  if (issues.length > 0) {
    healthData.issues = issues;
  }

  // Return appropriate status code
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(healthData);
});

// Ready check for load balancers (lightweight, just checks if server is accepting requests)
router.get('/ready', async (req, res) => {
  const dbStatus = await checkDatabase();

  if (dbStatus.status === 'connected') {
    res.json({ status: 'ready', database: dbStatus.type });
  } else {
    res.status(503).json({ status: 'not_ready', reason: 'Database unavailable' });
  }
});

// Live check for Kubernetes/Railway (just checks if process is running)
router.get('/live', (req, res) => {
  res.status(200).send('OK');
});

// Detailed metrics endpoint (for monitoring dashboards)
router.get('/metrics', async (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  res.json({
    timestamp: Date.now(),
    process: {
      uptime: process.uptime(),
      pid: process.pid,
      nodeVersion: process.version,
    },
    memory: {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    errors: logger.getErrorStats(),
  });
});

export default router;
