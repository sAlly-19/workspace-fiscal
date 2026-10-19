import { Router, Request, Response } from 'express';
import { folderWatcherService } from '../services/folder-watcher.service';

const router = Router();

// Armazena conexões ativas de clientes SSE
const clients = new Set<Response>();

// Encaminha eventos do FolderWatcherService diretamente para os clientes conectados
folderWatcherService.on('event', (payload: { event: string; data: any }) => {
  const message = `event: ${payload.event}\ndata: ${JSON.stringify(payload.data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
});

/**
 * Função utilitária para emitir eventos arbitrários via SSE
 */
export function broadcastSse(event: string, data: any): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}

/**
 * GET /api/events
 * Conexão persistente Server-Sent Events com heartbeat a cada 30 segundos.
 */
router.get('/', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  clients.add(res);

  // Handshake inicial
  res.write(':connected\n\n');

  // Se houver arquivos aguardando confirmação no modo prompt, envia de imediato para o novo cliente
  const allPending = folderWatcherService.getAllPending();
  for (const [folderId, pending] of Object.entries(allPending)) {
    if (pending.files.length > 0) {
      res.write(
        `event: WATCH_PROMPT_IMPORT\ndata: ${JSON.stringify({
          folderId,
          folderName: pending.folderName,
          pendingCount: pending.files.length,
          files: pending.files,
        })}\n\n`
      );
    }
  }

  // Heartbeat a cada 30s para manter viva a conexão através de proxies/Electron
  const heartbeat = setInterval(() => {
    try {
      res.write(':keep-alive\n\n');
    } catch {
      clearInterval(heartbeat);
      clients.delete(res);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

export default router;

