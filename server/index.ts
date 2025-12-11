import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Server as SocketIOServer } from "socket.io";
import { readFileSync } from "fs";
import path from "path";
import { launchBrowsers } from "./utils/browserLauncher.js";
import { setupWebSocket } from "./websocket.js";
import api from "./routes.js";

// SEA環境では、実行ファイルのディレクトリを基準にする
const BASE_DIR = process.cwd();

const app = new Hono()
  // ローカルホストのみからのアクセス制限（セキュリティ対策）
  .use("*", async (c, next) => {
    const host = c.req.header("host");
    if (host && (host.startsWith("localhost") || host.startsWith("127.0.0.1"))) {
      await next();
    } else {
      return c.text("Forbidden: Access only allowed from localhost", 403);
    }
  })
  // CORS設定
  .use("*", async (c, next) => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type");

    if (c.req.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    await next();
  })
  // APIルートをマウント
  .route("/api", api)
  // 静的ファイル配信
  .use("/*", serveStatic({ root: "./dist" }))
  // SPAのフォールバック
  .get("*", (c) => {
    return c.html(
      readFileSync(path.join(BASE_DIR, "dist/index.html"), "utf8")
    );
  });

// サーバー起動
const PORT = Number(process.env.PORT) || 3000;

const server = serve({
  fetch: app.fetch,
  port: PORT,
});

// Socket.io設定
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

setupWebSocket(io);

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     World Dev Info Meta Searcher - Local Server Version     ║
║                      Powered by Hono.js                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

🚀 Server running at: http://localhost:${PORT}

📁 Config directory: ${path.join(BASE_DIR, "config")}
📦 Profiles: ${path.join(BASE_DIR, "config/profiles")}

✓ Server started successfully
✓ WebSocket enabled for real-time sync
✓ API endpoints available at /api/*

Press Ctrl+C to stop the server
`);

// ブラウザ自動起動
setTimeout(() => {
  launchBrowsers(PORT).catch((err) => {
    console.error("Failed to launch browsers:", err);
  });
}, 1000);

// グレースフルシャットダウン
process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM signal, shutting down gracefully...");
  io.close();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\nReceived SIGINT signal, shutting down gracefully...");
  io.close();
  process.exit(0);
});

// エラーハンドリング
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Hono RPC用に型をエクスポート
export type AppType = typeof app;
