import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  if (env.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  app.use('/', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
