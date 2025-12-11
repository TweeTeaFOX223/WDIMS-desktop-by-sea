import type { AppSettings, Config } from "../types";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let isConnected = false;

// WebSocket接続初期化
export function initializeWebSocket(): Socket {
  if (socket) {
    return socket;
  }

  socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  });

  socket.on("connect", () => {
    console.log("✓ WebSocket connected");
    isConnected = true;
  });

  socket.on("disconnect", () => {
    console.log("✗ WebSocket disconnected");
    isConnected = false;
  });

  socket.on("connect_error", (error) => {
    console.error("WebSocket connection error:", error);
  });

  socket.on("error", (data) => {
    console.error("WebSocket error:", data);
  });

  return socket;
}

// WebSocket接続を取得
export function getSocket(): Socket | null {
  return socket;
}

// 接続状態を取得
export function isSocketConnected(): boolean {
  return isConnected && socket?.connected === true;
}

// 表示設定変更を送信
export function broadcastDisplaySettingsUpdate(
  profileName: string,
  settings: AppSettings
): void {
  if (socket && isConnected) {
    socket.emit("display-settings-update", { profileName, settings });
  }
}

// 検索エンジン設定変更を送信
export function broadcastSearchEnginesUpdate(
  profileName: string,
  engines: Config
): void {
  if (socket && isConnected) {
    socket.emit("search-engines-update", { profileName, engines });
  }
}

// プロファイル切り替えを送信
export function broadcastProfileSwitch(profileName: string): void {
  if (socket && isConnected) {
    socket.emit("profile-switch", { profileName });
  }
}

// プロファイル一覧変更を送信
export function broadcastProfilesChanged(): void {
  if (socket && isConnected) {
    socket.emit("profiles-changed");
  }
}

// 表示設定変更リスナーを登録
export function onDisplaySettingsChanged(
  callback: (data: { profileName: string; settings: AppSettings }) => void
): void {
  if (socket) {
    socket.on("display-settings-changed", callback);
  }
}

// 検索エンジン設定変更リスナーを登録
export function onSearchEnginesChanged(
  callback: (data: { profileName: string; engines: Config }) => void
): void {
  if (socket) {
    socket.on("search-engines-changed", callback);
  }
}

// プロファイル切り替えリスナーを登録（非推奨: ウィンドウごとに独立したプロファイル管理を使用）
// この関数は後方互換性のために残していますが、使用しないでください
export function onProfileSwitched(
  callback: (data: { profileName: string }) => void
): void {
  if (socket) {
    socket.on("profile-switched", callback);
  }
}

// プロファイル一覧変更リスナーを登録
export function onProfilesListChanged(callback: () => void): void {
  if (socket) {
    socket.on("profiles-list-changed", callback);
  }
}

// リスナーを削除
export function removeListener(
  event: string,
  callback?: (...args: unknown[]) => void
): void {
  if (socket) {
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }
}

// WebSocket接続をクローズ
export function closeWebSocket(): void {
  if (socket) {
    socket.close();
    socket = null;
    isConnected = false;
  }
}
