import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const app = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));

/**
 * Your good and bad marks (notes.ts), kept in a file as well as the browser, so Claude can read
 * them. docs/ is local only (never committed).
 */
const NOTES = app('docs/loc-studio-notes.json');
function notesFile(): Plugin {
  const handle = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.url !== '/__loc-notes') return next();
    res.setHeader('content-type', 'application/json');
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          mkdirSync(dirname(NOTES), { recursive: true });
          writeFileSync(NOTES, `${JSON.stringify(JSON.parse(body), null, 2)}\n`);
          res.end('{}');
        } catch {
          res.statusCode = 400;
          res.end('{}');
        }
      });
      return;
    }
    try {
      res.end(readFileSync(NOTES, 'utf8'));
    } catch {
      res.end('{}');
    }
  };
  return {
    name: 'loc-notes-file',
    configureServer: (server) => void server.middlewares.use(handle),
    configurePreviewServer: (server) => void server.middlewares.use(handle),
  };
}

/**
 * The Loc studio as its own browser app (`npm run studio` from the repo root). It imports Loc's
 * rig and the studio straight from the app's src/, so what plays here is exactly what ships; it
 * just skips Expo, the router and onboarding.
 */
export default defineConfig({
  plugins: [react(), notesFile()],
  resolve: {
    alias: [
      { find: /^@\/assets\//, replacement: app('assets/') },
      { find: /^@\//, replacement: app('src/') },
      // The studio is a 'use dom' component in the app; here it's just the page.
      { find: /^expo\/dom$/, replacement: fileURLToPath(new URL('./src/expo-dom.ts', import.meta.url)) },
    ],
    dedupe: ['react', 'react-dom'],
  },
  // `npm run studio` serves a production build: React's development build made playback stutter.
  // `npm run studio:dev` is the live-reloading one, for working on the studio itself.
  server: { port: 5174, open: true, fs: { allow: ['..'] } },
  preview: { port: 5174, open: true },
});
