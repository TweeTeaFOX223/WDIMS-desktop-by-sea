import { z } from "zod";

// 検索エンジンスキーマ
export const searchEngineSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  icon: z.string().optional(),
  description: z.string().optional(),
});

// タブ設定スキーマ
export const tabConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  engines: z.array(searchEngineSchema),
});

// 検索エンジン設定スキーマ
export const configSchema = z.object({
  tabs: z.array(tabConfigSchema),
});

// アプリ設定スキーマ
export const appSettingsSchema = z.object({
  theme: z.enum(["light", "dark"]),
  cardScale: z.number(),
  fontSize: z.number(),
  cardsPerRowMode: z.enum(["fixed", "auto"]),
  minCardsPerRow: z.number(),
  showName: z.boolean(),
  showDescription: z.boolean(),
  showUrl: z.boolean(),
});

// ブラウザスキーマ
export const browserSchema = z.object({
  name: z.string(),
  path: z.string(),
  enabled: z.boolean(),
  args: z.array(z.string()),
});

// ブラウザ設定スキーマ
export const browsersConfigSchema = z.object({
  browsers: z.array(browserSchema),
  defaultPort: z.number(),
});
