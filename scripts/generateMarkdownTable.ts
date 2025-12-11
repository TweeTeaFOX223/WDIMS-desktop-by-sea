import * as fs from "fs";
import * as path from "path";
import type { Config } from "../client/types";

/**
 * JSONデータをマークダウンの表形式に変換
 */
export function generateMarkdownTable(data: Config): string {
  let markdown = "";

  data.tabs.forEach((tab) => {
    // タブ名をヘッダーとして追加
    markdown += `## ${tab.name}\n\n`;

    // 表のヘッダー
    markdown += "| サイト名 | 説明 | URL |\n";
    markdown += "| --- | --- | --- |\n";

    // 各検索エンジンのデータを追加
    tab.engines.forEach((engine) => {
      const name = engine.name;
      const description = engine.description;
      const url = engine.url;

      markdown += `| ${name} | ${description} | ${url} |\n`;
    });

    // タブの間に空行を追加
    markdown += "\n";
  });

  return markdown;
}

/**
 * メイン処理
 * CLI実行用のNode.jsスクリプト
 */
async function main() {
  try {
    // JSONファイルを読み込み（プロジェクトルートからの相対パス）
    const jsonPath = path.resolve(process.cwd(), "src/data/searchEngines.json");
    const jsonData = fs.readFileSync(jsonPath, "utf-8");
    const data: Config = JSON.parse(jsonData);

    // マークダウン表を生成
    const markdownTable = generateMarkdownTable(data);

    // 出力ファイルパスを設定（プロジェクトルートに出力）
    const outputPath = path.resolve(process.cwd(), "search-engines-table.md");

    // ファイルに書き出し
    fs.writeFileSync(outputPath, markdownTable, "utf-8");

    console.log("✅ マークダウン表の生成が完了しました！");
    console.log(`📄 出力先: ${outputPath}`);
    console.log(`📊 タブ数: ${data.tabs.length}`);
    console.log(
      `🔍 検索エンジン総数: ${data.tabs.reduce(
        (sum, tab) => sum + tab.engines.length,
        0
      )}`
    );
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

// メイン処理を実行
main();
