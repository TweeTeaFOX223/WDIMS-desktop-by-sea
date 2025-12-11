import { exec } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import type { Browser, BrowsersConfig } from "../types/index.js";

// SEA環境では、実行ファイルのディレクトリを基準にする
const BASE_DIR = process.cwd();

const BROWSERS_CONFIG_FILE = path.join(BASE_DIR, "config/browsers.json");

// ブラウザ設定の読み込み
export async function loadBrowsersConfig(): Promise<BrowsersConfig> {
  try {
    const content = await fs.readFile(BROWSERS_CONFIG_FILE, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to load browsers config:", error);
    return {
      browsers: [],
      defaultPort: 3000,
    };
  }
}

// ブラウザ設定の保存
export async function saveBrowsersConfig(
  config: BrowsersConfig
): Promise<void> {
  try {
    await fs.writeFile(BROWSERS_CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Failed to save browsers config:", error);
    throw error;
  }
}

// ブラウザを起動
async function launchBrowser(
  browserConfig: Browser,
  port: number
): Promise<boolean> {
  const url = `http://localhost:${port}`;

  // OSのデフォルトブラウザの場合
  if (browserConfig.name === "OSのデフォルトブラウザ") {
    return new Promise((resolve) => {
      const isWindows = process.platform === "win32";
      const command = isWindows ? `start "" "${url}"` : `open "${url}"`;

      exec(command, { encoding: "utf8", windowsHide: true }, (error) => {
        if (error) {
          console.error(`Failed to launch default browser`);
          resolve(false);
        } else {
          console.log(`✓ Launched default browser`);
          resolve(true);
        }
      });
    });
  }

  // パスの妥当性チェック
  try {
    // ファイルが存在するかチェック
    await fs.access(browserConfig.path);

    // .exeファイルかチェック（Windowsの場合）
    const isWindows = process.platform === "win32";
    if (isWindows && !browserConfig.path.toLowerCase().endsWith(".exe")) {
      console.error(
        `Failed to launch ${browserConfig.name}: Path is not an executable file (.exe)`
      );
      return false;
    }
  } catch (error) {
    console.log(error);
    console.error(
      `Failed to launch ${browserConfig.name}: File does not exist at path "${browserConfig.path}"`
    );
    return false;
  }

  // ブラウザを起動
  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    let command: string;

    if (isWindows) {
      // Windowsでは指定されたブラウザパスを使用
      const args = browserConfig.args.join(" ");
      command = `"${browserConfig.path}" ${args} ${url}`;
    } else {
      // Mac/Linuxでもブラウザパスを直接指定
      const args = browserConfig.args.join(" ");
      command = `"${browserConfig.path}" ${args} ${url}`;
    }

    exec(command, { encoding: "utf8", windowsHide: true }, (error) => {
      if (error) {
        console.error(
          `Failed to launch ${browserConfig.name}: Browser executable not found or failed to start`
        );
        resolve(false);
      } else {
        console.log(`✓ Launched ${browserConfig.name}`);
        resolve(true);
      }
    });
  });
}

// 有効なブラウザを全て起動
export async function launchBrowsers(port?: number): Promise<void> {
  const config = await loadBrowsersConfig();
  const portToUse = port || config.defaultPort || 3000;

  const enabledBrowsers = config.browsers.filter((b) => b.enabled);

  if (enabledBrowsers.length === 0) {
    console.log("No browsers configured to auto-launch");
    return;
  }

  console.log(`\nLaunching browsers at http://localhost:${portToUse}...\n`);

  const results = await Promise.all(
    enabledBrowsers.map((browser) => launchBrowser(browser, portToUse))
  );

  const successCount = results.filter((r) => r).length;
  console.log(
    `\nLaunched ${successCount}/${enabledBrowsers.length} browsers successfully`
  );
}

// 特定のブラウザを起動（名前で指定）
export async function launchSpecificBrowser(
  browserName: string,
  port?: number
): Promise<boolean> {
  const config = await loadBrowsersConfig();
  const portToUse = port || config.defaultPort || 3000;

  const browser = config.browsers.find((b) => b.name === browserName);

  if (!browser) {
    throw new Error(`Browser "${browserName}" not found in configuration`);
  }

  console.log(
    `\nLaunching ${browserName} at http://localhost:${portToUse}...\n`
  );

  const success = await launchBrowser(browser, portToUse);

  if (success) {
    console.log(`\n✓ Successfully launched ${browserName}`);
  } else {
    throw new Error(`Failed to launch ${browserName}`);
  }

  return success;
}
