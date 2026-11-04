import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { apiRouter } from './routes';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Express {
  const app = express();

  // CORS configuration
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, PowerShell Invoke-RestMethod, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (config.CORS_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      // Disallow origin (omits Access-Control-Allow-Origin header)
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };

  app.use(cors(corsOptions));

  // JSON Body Parser with configurable limit
  app.use(express.json({ limit: config.JSON_BODY_LIMIT }));

  // API Routes mounted under /api
  app.use('/api', apiRouter);

  // 404 Route Handler for unmatched paths
  app.use(notFound);

  // Centralized Error Middleware (4-arg)
  app.use(errorHandler);

  return app;
}

export const app = createApp();
