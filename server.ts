import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ConnectedPlayer {
  id: string;
  name: string;
  team: 'CT' | 'T';
  weapon: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  armor: number;
  kills: number;
  deaths: number;
  region: string;
  ws: WebSocket;
  lastSeen: number;
}

const rooms = new Map<string, Map<string, ConnectedPlayer>>();

function getRoom(region: string): Map<string, ConnectedPlayer> {
  let room = rooms.get(region);
  if (!room) {
    room = new Map();
    rooms.set(region, room);
  }
  return room;
}

function broadcastToRoom(region: string, payload: unknown, excludeId?: string) {
  const room = rooms.get(region);
  if (!room) return;
  const msg = JSON.stringify(payload);
  for (const [id, client] of room.entries()) {
    if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // Dedicated server status endpoint
  app.get('/api/servers', (_req, res) => {
    const regionCounts: Record<string, number> = {};
    for (const [reg, map] of rooms.entries()) {
      regionCounts[reg] = map.size;
    }
    res.json({
      status: 'online',
      tickRate: 128,
      regions: regionCounts,
      serverTime: Date.now(),
    });
  });

  // WebSocket Dedicated Low-Latency Server on /ws
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    let playerId = `op_${Math.random().toString(36).slice(2, 9)}`;
    let currentRegion = 'sa-east-1';

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(String(raw));

        if (data.type === 'ping') {
          ws.send(
            JSON.stringify({
              type: 'pong',
              clientTs: data.clientTs,
              serverTs: Date.now(),
              tickRate: 128,
            })
          );
          return;
        }

        if (data.type === 'player:join') {
          if (data.id && typeof data.id === 'string') {
            playerId = data.id;
          }
          currentRegion = data.region || 'sa-east-1';
          const room = getRoom(currentRegion);

          // Idempotency guard
          const existing = room.get(playerId);
          const playerObj: ConnectedPlayer = {
            id: playerId,
            name: data.name || 'Operador',
            team: data.team === 'T' ? 'T' : 'CT',
            weapon: data.weapon || 'm4a1',
            x: typeof data.x === 'number' ? data.x : 0,
            y: typeof data.y === 'number' ? data.y : 0,
            z: typeof data.z === 'number' ? data.z : -33,
            yaw: typeof data.yaw === 'number' ? data.yaw : 0,
            hp: existing ? existing.hp : 100,
            armor: existing ? existing.armor : 100,
            kills: existing ? existing.kills : 0,
            deaths: existing ? existing.deaths : 0,
            region: currentRegion,
            ws,
            lastSeen: Date.now(),
          };
          room.set(playerId, playerObj);

          // Send initial snapshot of active remote peers in the room
          const peers = Array.from(room.values())
            .filter((p) => p.id !== playerId)
            .map((p) => ({
              id: p.id,
              name: p.name,
              team: p.team,
              weapon: p.weapon,
              x: p.x,
              y: p.y,
              z: p.z,
              yaw: p.yaw,
              hp: p.hp,
              armor: p.armor,
              kills: p.kills,
              deaths: p.deaths,
            }));

          ws.send(
            JSON.stringify({
              type: 'room:init',
              selfId: playerId,
              region: currentRegion,
              tickRate: 128,
              peers,
            })
          );

          broadcastToRoom(
            currentRegion,
            {
              type: 'player:joined',
              player: {
                id: playerObj.id,
                name: playerObj.name,
                team: playerObj.team,
                weapon: playerObj.weapon,
                x: playerObj.x,
                y: playerObj.y,
                z: playerObj.z,
                yaw: playerObj.yaw,
                hp: playerObj.hp,
                armor: playerObj.armor,
                kills: playerObj.kills,
                deaths: playerObj.deaths,
              },
            },
            playerId
          );
          return;
        }

        if (data.type === 'player:state') {
          const room = getRoom(currentRegion);
          const p = room.get(playerId);
          if (p) {
            p.x = typeof data.x === 'number' ? data.x : p.x;
            p.y = typeof data.y === 'number' ? data.y : p.y;
            p.z = typeof data.z === 'number' ? data.z : p.z;
            p.yaw = typeof data.yaw === 'number' ? data.yaw : p.yaw;
            p.hp = typeof data.hp === 'number' ? data.hp : p.hp;
            p.armor = typeof data.armor === 'number' ? data.armor : p.armor;
            p.weapon = data.weapon || p.weapon;
            p.lastSeen = Date.now();

            broadcastToRoom(
              currentRegion,
              {
                type: 'player:moved',
                id: playerId,
                x: p.x,
                y: p.y,
                z: p.z,
                yaw: p.yaw,
                hp: p.hp,
                armor: p.armor,
                weapon: p.weapon,
              },
              playerId
            );
          }
          return;
        }

        if (data.type === 'player:shoot') {
          broadcastToRoom(
            currentRegion,
            {
              type: 'player:shot',
              id: playerId,
              weapon: data.weapon,
              origin: data.origin,
              dir: data.dir,
            },
            playerId
          );
          return;
        }
      } catch {
        // Ignore malformed packets
      }
    });

    ws.on('close', () => {
      const room = rooms.get(currentRegion);
      if (room && room.has(playerId)) {
        room.delete(playerId);
        broadcastToRoom(currentRegion, {
          type: 'player:left',
          id: playerId,
        });
      }
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Strikepoint 5v5 Dedicated Server [128-Tick WS] listening on http://localhost:${PORT}`);
  });
}

startServer();
