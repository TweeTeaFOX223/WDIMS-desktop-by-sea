import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  listProfiles,
  getProfile,
  createProfile,
  updateDisplaySettings,
  updateSearchEngines,
  deleteProfile,
  cloneProfile,
  renameProfile,
  getActiveProfile,
  setActiveProfile,
} from "./utils/profileManager.js";
import {
  loadBrowsersConfig,
  saveBrowsersConfig,
  launchSpecificBrowser,
} from "./utils/browserLauncher.js";
import { exec } from "child_process";
import { appSettingsSchema, configSchema, browsersConfigSchema } from "./schemas.js";

const api = new Hono()
  // ===== プロファイル管理API =====
  // プロファイル一覧取得
  .get("/profiles", async (c) => {
    try {
      const profiles = await listProfiles();
      return c.json(profiles);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: errorMessage }, 500);
    }
  })
  // 特定プロファイル取得
  .get(
    "/profiles/:name",
    zValidator("param", z.object({ name: z.string() })),
    async (c) => {
      try {
        const { name } = c.req.valid("param");
        const profile = await getProfile(name);
        return c.json(profile);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: errorMessage }, 404);
      }
    }
  )
  // 新規プロファイル作成
  .post(
    "/profiles",
    zValidator(
      "json",
      z.object({
        name: z.string(),
        copyFrom: z.string().optional(),
      })
    ),
    async (c) => {
      try {
        const { name, copyFrom } = c.req.valid("json");
        await createProfile(name, copyFrom || null);
        return c.json({ message: `Profile "${name}" created successfully` }, 201);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: errorMessage }, 400);
      }
    }
  )
  // 表示設定更新
  .put(
    "/profiles/:name/display-settings",
    zValidator("param", z.object({ name: z.string() })),
    zValidator("json", appSettingsSchema),
    async (c) => {
      try {
        const { name } = c.req.valid("param");
        const settings = c.req.valid("json");
        await updateDisplaySettings(name, settings);
        return c.json({ message: `Display settings updated for "${name}"` });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: errorMessage }, 400);
      }
    }
  )
  // 検索エンジン設定更新
  .put(
    "/profiles/:name/search-engines",
    zValidator("param", z.object({ name: z.string() })),
    zValidator("json", configSchema),
    async (c) => {
      try {
        const { name } = c.req.valid("param");
        const engines = c.req.valid("json");
        await updateSearchEngines(name, engines);
        return c.json({ message: `Search engines updated for "${name}"` });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: errorMessage }, 400);
      }
    }
  )
  // プロファイル削除
  .delete(
    "/profiles/:name",
    zValidator("param", z.object({ name: z.string() })),
    async (c) => {
      try {
        const { name } = c.req.valid("param");
        await deleteProfile(name);
        return c.json({
          message: `Profile "${name}" deleted successfully`,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: errorMessage }, 400);
      }
    }
  )
  // プロファイル複製
  .post(
    "/profiles/:name/clone",
    zValidator("param", z.object({ name: z.string() })),
    zValidator("json", z.object({ newName: z.string() })),
    async (c) => {
      try {
        const { name } = c.req.valid("param");
        const { newName } = c.req.valid("json");
        await cloneProfile(name, newName);
        return c.json({ message: `Profile cloned to "${newName}"` }, 201);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: errorMessage }, 400);
      }
    }
  )
  // プロファイル名変更
  .put(
    "/profiles/:name/rename",
    zValidator("param", z.object({ name: z.string() })),
    zValidator("json", z.object({ newName: z.string() })),
    async (c) => {
      try {
        const { name } = c.req.valid("param");
        const { newName } = c.req.valid("json");
        await renameProfile(name, newName);
        return c.json({ message: `Profile renamed to "${newName}"` });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: errorMessage }, 400);
      }
    }
  )
  // アクティブプロファイル取得
  .get("/profiles/active/current", async (c) => {
    try {
      const activeProfile = await getActiveProfile();
      return c.json({ profileName: activeProfile });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: errorMessage }, 500);
    }
  })
  // アクティブプロファイル変更
  .put(
    "/profiles/active/current",
    zValidator("json", z.object({ profileName: z.string() })),
    async (c) => {
      try {
        const { profileName } = c.req.valid("json");
        await setActiveProfile(profileName);
        return c.json({ message: `Active profile set to "${profileName}"` });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: errorMessage }, 400);
      }
    }
  )
  // ===== ブラウザ設定API =====
  // ブラウザ設定取得
  .get("/browsers", async (c) => {
    try {
      const config = await loadBrowsersConfig();
      return c.json(config);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: errorMessage }, 500);
    }
  })
  // ブラウザ設定更新
  .put("/browsers", zValidator("json", browsersConfigSchema), async (c) => {
    try {
      const config = c.req.valid("json");
      await saveBrowsersConfig(config);
      return c.json({ message: "Browser settings updated successfully" });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: errorMessage }, 400);
    }
  })
  // 特定のブラウザを起動
  .post(
    "/browsers/launch/:browserName",
    zValidator("param", z.object({ browserName: z.string() })),
    async (c) => {
      try {
        const { browserName } = c.req.valid("param");
        const config = await loadBrowsersConfig();
        await launchSpecificBrowser(browserName, config.defaultPort);
        return c.json({ message: `${browserName} launched successfully` });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: errorMessage }, 400);
      }
    }
  )
  // エクスプローラーでフォルダを開く
  .post(
    "/explorer/open",
    zValidator("json", z.object({ folderPath: z.string() })),
    async (c) => {
      try {
        const { folderPath } = c.req.valid("json");

        const isWindows = process.platform === "win32";
        const command = isWindows
          ? `explorer "${folderPath}"`
          : `open "${folderPath}"`;

        exec(command, (error) => {
          if (error) {
            console.error("Failed to open folder:", error);
          }
        });

        return c.json({ message: "Folder opened successfully" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return c.json({ error: errorMessage }, 400);
      }
    }
  );

export default api;
export type ApiType = typeof api;
