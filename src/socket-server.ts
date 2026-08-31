import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";

const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("subscribe-class", (usualClasseId: string) => {
    socket.join(`class:${usualClasseId}`);
    console.log(`Socket ${socket.id} subscribed to class:${usualClasseId}`);
  });

  socket.on("unsubscribe-class", (usualClasseId: string) => {
    socket.leave(`class:${usualClasseId}`);
    console.log(`Socket ${socket.id} unsubscribed from class:${usualClasseId}`);
  });

  socket.on("subscribe-enseignant", (enseignantId: string) => {
    socket.join(`enseignant:${enseignantId}`);
    console.log(`Socket ${socket.id} subscribed to enseignant:${enseignantId}`);
  });

  socket.on("unsubscribe-enseignant", (enseignantId: string) => {
    socket.leave(`enseignant:${enseignantId}`);
    console.log(`Socket ${socket.id} unsubscribed from enseignant:${enseignantId}`);
  });

  socket.on("subscribe-eleve", (eleveId: string) => {
    socket.join(`eleve:${eleveId}`);
    console.log(`Socket ${socket.id} subscribed to eleve:${eleveId}`);
  });

  socket.on("unsubscribe-eleve", (eleveId: string) => {
    socket.leave(`eleve:${eleveId}`);
    console.log(`Socket ${socket.id} unsubscribed from eleve:${eleveId}`);
  });

  socket.on("join-chat", (classeId: string) => {
    socket.join(`chat:${classeId}`);
    console.log(`Socket ${socket.id} joined chat:${classeId}`);
  });

  socket.on("leave-chat", (classeId: string) => {
    socket.leave(`chat:${classeId}`);
    console.log(`Socket ${socket.id} left chat:${classeId}`);
  });

  socket.on("send-chat-message", (data: { id: string; classeId: string; userName: string; userRole: string; content: string; createdAt: string }) => {
    io.to(`chat:${data.classeId}`).emit("new-chat-message", data);
  });

  socket.on("teacher-chat-class-changed", (data: { classeId: string; libelle: string }) => {
    console.log("[SocketServer] Received teacher-chat-class-changed from", socket.id, data);
    io.emit("teacher-chat-class-changed", data);
  });

  socket.on("broadcast-lecon-image", (data: { classeId: string; url: string; name: string }) => {
    console.log("[SocketServer] Received broadcast-lecon-image from", socket.id, data);
    io.to(`class:${data.classeId}`).emit("new-lecon-image", data);
  });

  socket.on("stop-lecon-image", (data: { classeId: string }) => {
    console.log("[SocketServer] Received stop-lecon-image from", socket.id, data);
    io.to(`class:${data.classeId}`).emit("stop-lecon-image");
  });

  socket.on("broadcast-media", (data: { mediaId: string; classeId: string; title: string; url: string; type: string; thumbnailUrl?: string }) => {
    console.log("[SocketServer] Received broadcast-media from", socket.id, data);
    io.to(`class:${data.classeId}`).emit("new-media-broadcast", data);
  });

  socket.on("media-control", (data: { classeId: string; action: "play" | "pause" | "seek" | "mute" | "unmute"; currentTime?: number }) => {
    console.log("[SocketServer] Received media-control from", socket.id, data);
    io.to(`class:${data.classeId}`).emit("media-control", data);
  });

  socket.on("media-sync", (data: { classeId: string; currentTime: number; isPlaying: boolean }) => {
    console.log("[SocketServer] Received media-sync from", socket.id, data);
    io.to(`class:${data.classeId}`).emit("media-sync", data);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

  export function startSocketServer() {
    const httpServer = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/broadcast") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          console.log("[SocketServer] /broadcast body:", body);
          try {
            const { event, room, payload } = JSON.parse(body) as {
              event?: string;
              room?: string;
              payload?: any;
            };

            if (event === "quiz-activation-changed" && typeof room === "string" && typeof payload?.enabled === "boolean") {
              io.to(`class:${room}`).emit("quiz-activation-changed", { usualClasseId: room, enabled: payload.enabled });
              res.writeHead(200);
              res.end(JSON.stringify({ success: true }));
              return;
            }

            if (event === "exercice-created" && typeof room === "string" && payload?.exerciceId) {
              console.log("[SocketServer] Broadcasting exercice-created to class:", room, payload);
              io.to(`class:${room}`).emit("exercice-created", { exerciceId: payload.exerciceId });
              res.writeHead(200);
              res.end(JSON.stringify({ success: true }));
              return;
            }

            if (event === "exercice-termine" && typeof room === "string" && payload?.exerciceId && payload?.eleveId) {
              console.log("[SocketServer] Broadcasting exercice-termine to enseignant:", room, payload);
              io.to(`enseignant:${room}`).emit("exercice-termine", { exerciceId: payload.exerciceId, eleveId: payload.eleveId });
              res.writeHead(200);
              res.end(JSON.stringify({ success: true }));
              return;
            }

            if (event === "exercice-corrige" && typeof room === "string" && payload?.exerciceId) {
              console.log("[SocketServer] Broadcasting exercice-corrige to eleve:", room, payload);
              io.to(`eleve:${room}`).emit("exercice-corrige", { exerciceId: payload.exerciceId });
              res.writeHead(200);
              res.end(JSON.stringify({ success: true }));
              return;
            }

            if (event === "exercice-debloque" && typeof room === "string" && typeof payload?.debloque === "boolean" && payload?.exerciceId) {
              console.log("[SocketServer] Broadcasting exercice-debloque to class:", room, payload);
              io.to(`class:${room}`).emit("exercice-debloque", { exerciceId: payload.exerciceId, debloque: payload.debloque });
              res.writeHead(200);
              res.end(JSON.stringify({ success: true }));
              return;
            }

            res.writeHead(400);
            res.end(JSON.stringify({ error: "Invalid payload" }));
          } catch {
            res.writeHead(400);
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Not found" }));
      }
    });

    io.attach(httpServer);

    const PORT = process.env.WS_PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`Socket.io server running on port ${PORT}`);
    });
  }

const isMain = process.argv[1] === fileURLToPath(new URL(import.meta.url));
if (isMain) {
  startSocketServer();
}

