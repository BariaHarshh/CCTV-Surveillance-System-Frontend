import { createServer, type IncomingMessage, type ServerResponse } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { authenticateSocketSession } from "./src/lib/monitoring/socket-auth";
import { orgChannel } from "./src/lib/monitoring/constants";
import { setSocketIO } from "./src/lib/monitoring/socket-emitter";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? hostname}`);
    handle(req, res, {
      pathname: url.pathname,
      query: Object.fromEntries(url.searchParams),
      href: url.href,
      path: url.pathname + url.search,
      search: url.search,
    });
  });

  const io = new SocketIOServer(httpServer, {
    path: "/api/socket",
    cors: { origin: dev, credentials: true },
  });

  setSocketIO(io);

  io.use(async (socket, nextFn) => {
    try {
      const user = await authenticateSocketSession(socket.handshake.headers.cookie);
      if (!user) return nextFn(new Error("Unauthorized"));
      socket.data.user = user;
      if (user.role !== "SUPER_ADMIN" && user.organizationId) {
        socket.data.organizationId = user.organizationId.toString();
      }
      nextFn();
    } catch (e) {
      nextFn(e instanceof Error ? e : new Error("Auth failed"));
    }
  });

  io.on("connection", (socket) => {
    const orgId = socket.data.organizationId as string | undefined;
    if (orgId) socket.join(orgChannel(orgId));
    socket.emit("connected", { organizationId: orgId ?? null });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} (Socket.IO enabled)`);
  });
});
