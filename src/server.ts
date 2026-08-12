import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/**', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.get('/api/youtube', async (_req, res) => {
  try {
    const { fetchYoutubeData } = await import('./app/services/youtube-data');
    const data = await fetchYoutubeData();
    return res.json(data);
  } catch (error) {
    const typedError = error as { status?: number; message?: string; url?: string };
    const details = {
      keyConfigured: Boolean(process.env['YOUTUBE_API_KEY']?.trim()),
      status: typedError.status || 500,
      message: typedError.message || 'Unable to load YouTube data.',
      url: typedError.url ? new URL(typedError.url).toString() : undefined,
    };

    console.error('[YouTube API] Express route failed:', details);

    const isDevelopment = process.env['NODE_ENV'] === 'development' || !process.env['NODE_ENV'];

    if (isDevelopment) {
      return res.status(details.status).json({ error: details });
    }

    return res.status(500).json({ message: 'Unable to load YouTube data.' });
  }
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use('/**', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
