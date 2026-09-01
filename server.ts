import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';

import { initDatabase } from './src/db';
import { createApp } from './src/api/app';

async function startServer() {
  await initDatabase();

  const app = createApp();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST ?? '127.0.0.1';

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving of static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch(console.error);
