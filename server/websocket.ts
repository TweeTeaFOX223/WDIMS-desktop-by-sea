import type { Server as SocketIOServer } from 'socket.io';
import { updateDisplaySettings, updateSearchEngines } from './utils/profileManager.js';
import type { DisplaySettings, SearchEnginesConfig } from './types/index.js';

interface DisplaySettingsUpdateData {
  profileName: string;
  settings: DisplaySettings;
}

interface SearchEnginesUpdateData {
  profileName: string;
  engines: SearchEnginesConfig;
}

interface ProfileSwitchData {
  profileName: string;
}

export function setupWebSocket(io: SocketIOServer): SocketIOServer {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 表示設定更新
    socket.on('display-settings-update', async (data: DisplaySettingsUpdateData) => {
      try {
        const { profileName, settings } = data;
        await updateDisplaySettings(profileName, settings);

        // 他のクライアントにブロードキャスト（送信者以外）
        socket.broadcast.emit('display-settings-changed', { profileName, settings });

        // 送信者に成功を通知
        socket.emit('display-settings-update-success', { profileName });
      } catch (error) {
        console.error('Display settings update error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        socket.emit('error', { message: 'Failed to update display settings', error: errorMessage });
      }
    });

    // 検索エンジン設定更新
    socket.on('search-engines-update', async (data: SearchEnginesUpdateData) => {
      try {
        const { profileName, engines } = data;
        await updateSearchEngines(profileName, engines);

        // 他のクライアントにブロードキャスト
        socket.broadcast.emit('search-engines-changed', { profileName, engines });

        // 送信者に成功を通知
        socket.emit('search-engines-update-success', { profileName });
      } catch (error) {
        console.error('Search engines update error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        socket.emit('error', { message: 'Failed to update search engines', error: errorMessage });
      }
    });

    // プロファイル切り替え
    socket.on('profile-switch', async (data: ProfileSwitchData) => {
      try {
        const { profileName } = data;
        // 全てのクライアントに通知（送信者含む）
        io.emit('profile-switched', { profileName });
      } catch (error) {
        console.error('Profile switch error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        socket.emit('error', { message: 'Failed to switch profile', error: errorMessage });
      }
    });

    // プロファイル一覧の変更通知（作成・削除・リネーム時）
    socket.on('profiles-changed', () => {
      // 全てのクライアントに通知
      io.emit('profiles-list-changed');
    });

    // 切断処理
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // エラーハンドリング
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
}
