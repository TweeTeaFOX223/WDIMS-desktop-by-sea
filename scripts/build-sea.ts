import { execSync } from 'child_process';
import { writeFileSync, copyFileSync, statSync, existsSync, mkdirSync, rmSync, cpSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 出力ディレクトリ
const OUTPUT_DIR = 'WDIMS_desktop';
const RELEASE_NAME = `WDIMS_desktop_${process.platform}_${process.arch}`;

interface SEAConfig {
  main: string;
  output: string;
  disableExperimentalSEAWarning: boolean;
  useCodeCache: boolean;
  assets?: Record<string, string>;
}

console.log('Building Node.js SEA (Single Executable Application)...\n');

// 0. TypeScriptをビルド (esbuildでバンドル & CommonJS形式)
console.log('Step 0: Bundling TypeScript files for SEA (CommonJS)...');
try {
  // esbuildでバンドル（CommonJS形式、すべての依存関係を含める）
  // CommonJSでは __filename と __dirname が自動的に利用可能
  execSync('npx esbuild server/index.ts --bundle --platform=node --target=node18 --format=cjs --outfile=server/dist/index.js --packages=bundle', { stdio: 'inherit' });
  console.log('✓ TypeScript bundled to CommonJS\n');
} catch (error) {
  console.error('✗ Failed to bundle TypeScript');
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}

// サーバーのメインファイルパス（バンドル後）
const serverMainPath = 'server/dist/index.js';

// ファイルが存在するか確認
if (!existsSync(serverMainPath)) {
  console.error(`✗ Compiled server file not found: ${serverMainPath}`);
  process.exit(1);
}

// 1. SEA設定ファイル作成
console.log('Step 1: Creating SEA configuration...');
const seaConfig: SEAConfig = {
  main: serverMainPath,
  output: 'sea-prep.blob',
  disableExperimentalSEAWarning: true,
  useCodeCache: true
  // Note: assets (dist, config) は実行ファイルと同じディレクトリに配置する必要があります
};

writeFileSync('sea-config.json', JSON.stringify(seaConfig, null, 2));
console.log('✓ SEA config created\n');

// 2. Blob生成
console.log('Step 2: Generating SEA blob...');
try {
  execSync('node --experimental-sea-config sea-config.json', { stdio: 'inherit' });
  console.log('✓ SEA blob generated\n');
} catch (error) {
  console.error('✗ Failed to generate SEA blob');
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}

// 3. Node.jsバイナリコピー
console.log('Step 3: Copying Node.js binary...');
const platform = process.platform;
const ext = platform === 'win32' ? '.exe' : '';
const nodePath = process.execPath;
const outputPath = `wdims${ext}`;

try {
  copyFileSync(nodePath, outputPath);
  console.log(`✓ Node.js binary copied to ${outputPath}\n`);
} catch (error) {
  console.error('✗ Failed to copy Node.js binary');
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}

// 4. 署名削除（macOS/Windowsのみ）
if (platform === 'darwin') {
  console.log('Step 4: Removing signature (macOS)...');
  try {
    execSync(`codesign --remove-signature ${outputPath}`, { stdio: 'inherit' });
    console.log('✓ Signature removed\n');
  } catch (error) {
    console.error('✗ Failed to remove signature');
    if (error instanceof Error) {
      console.error(error.message);
    }
    process.exit(1);
  }
} else if (platform === 'win32') {
  console.log('Step 4: Skipping signature removal on Windows\n');
} else {
  console.log('Step 4: Skipping signature removal on Linux\n');
}

// 5. Blob注入
console.log('Step 5: Injecting blob into executable...');
try {
  const postjectCmd = platform === 'darwin'
    ? `npx postject ${outputPath} NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`
    : `npx postject ${outputPath} NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;

  execSync(postjectCmd, { stdio: 'inherit' });
  console.log('✓ Blob injected\n');
} catch (error) {
  console.error('✗ Failed to inject blob');
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}

// 6. 配布用ディレクトリの作成
console.log('Step 6: Creating distribution directory...');
try {
  // 既存のディレクトリを削除（リトライ機能付き）
  if (existsSync(OUTPUT_DIR)) {
    console.log('  ⚠ Warning: WDIMS_desktop directory already exists');
    console.log('  Attempting to remove...');
    try {
      rmSync(OUTPUT_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 });
      console.log('  ✓ Existing directory removed');
    } catch (error) {
      console.error('  ✗ Failed to remove existing directory');
      console.error('  Please manually delete the WDIMS_desktop folder and try again');
      console.error('  Or close any programs that might be using files in that folder');
      throw error;
    }
  }

  // ディレクトリ作成
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // 実行ファイルをコピー
  copyFileSync(outputPath, path.join(OUTPUT_DIR, outputPath));

  // distディレクトリをコピー
  if (existsSync('dist')) {
    cpSync('dist', path.join(OUTPUT_DIR, 'dist'), { recursive: true });
  }

  // configディレクトリをコピー
  if (existsSync('config')) {
    cpSync('config', path.join(OUTPUT_DIR, 'config'), { recursive: true });
  }

  // Note: node_modulesは不要（すべてバンドルに含まれている）

  // README.txtを作成
  const readmeContent = `WDIMS Desktop - Local Server Version
========================================

起動方法:
  ${platform === 'win32' ? 'start.bat をダブルクリック' : './start.sh を実行'}

ディレクトリ構造:
  WDIMS_desktop/
  ├── ${outputPath}      (実行ファイル - すべての依存関係を含む)
  ├── ${platform === 'win32' ? 'start.bat' : 'start.sh'}          (起動スクリプト - 推奨)
  ├── dist/              (Webクライアント)
  └── config/            (設定ファイル)

設定ファイル:
  - config/browsers.json     ブラウザ起動設定
  - config/profiles/         プロファイル設定

サーバーは http://localhost:3000 で起動します。
ブラウザが自動的に開きます。

トラブルシューティング:
  エラーが発生した場合は error.log を確認してください。
  ${platform === 'win32' ? 'start.bat' : 'start.sh'} を使用すると、エラーメッセージが表示されます。

重要:
  - 必ず ${platform === 'win32' ? 'start.bat' : 'start.sh'} から起動してください
  - 実行ファイルを直接起動するとエラー内容が確認できません
  - すべての出力は error.log に記録されます
`;

  writeFileSync(path.join(OUTPUT_DIR, 'README.txt'), readmeContent);

  // Windowsの場合、起動用バッチファイルを作成
  if (platform === 'win32') {
    const batchContent = `@echo off
echo WDIMS Desktop - Starting server...
echo.
echo Logging output to error.log...
echo.

${outputPath} > error.log 2>&1

if errorlevel 1 (
    echo.
    echo ERROR: Server failed to start. Check error.log for details.
    echo.
    type error.log
) else (
    echo.
    echo Server closed. Check error.log for details.
    echo.
    type error.log
)

echo.
pause
`;
    writeFileSync(path.join(OUTPUT_DIR, 'start.bat'), batchContent);
  } else {
    // Mac/Linuxの場合、起動用シェルスクリプトを作成
    const shellContent = `#!/bin/bash
echo "WDIMS Desktop - Starting server..."
echo
echo "Logging output to error.log..."
echo

./${outputPath} 2>&1 | tee error.log

if [ $? -ne 0 ]; then
    echo
    echo "ERROR: Server failed to start. Check error.log for details."
    echo
else
    echo
    echo "Server closed. Check error.log for details."
    echo
fi

read -p "Press Enter to continue..."
`;
    writeFileSync(path.join(OUTPUT_DIR, 'start.sh'), shellContent);
    // 実行権限を付与
    execSync(`chmod +x ${path.join(OUTPUT_DIR, 'start.sh')}`);
  }

  console.log(`✓ Distribution directory created: ${OUTPUT_DIR}\n`);
} catch (error) {
  console.error('✗ Failed to create distribution directory');
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}

// 7. ZIPアーカイブ作成（リリース用）
console.log('Step 7: Creating release archive...');
try {
  const archiveName = `${RELEASE_NAME}.zip`;

  if (platform === 'win32') {
    // Windowsでは tar.exe (bsdtar) の方が環境差分で失敗しにくい
    execSync(`tar -a -c -f ${archiveName} ${OUTPUT_DIR}`, { stdio: 'inherit' });
  } else {
    // Mac/Linuxの場合はzipコマンド
    execSync(`zip -r ${archiveName} ${OUTPUT_DIR}`, { stdio: 'inherit' });
  }

  const archiveSize = (statSync(archiveName).size / 1024 / 1024).toFixed(2);
  console.log(`✓ Release archive created: ${archiveName} (${archiveSize} MB)\n`);
} catch (error) {
  console.warn('⚠ Could not create release archive (zip not available)');
  console.warn('  You can manually compress the WDIMS_desktop folder\n');
}

// 8. 完了
const fileSize = (statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           Build completed successfully!                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

📦 Executable: ${outputPath} (${fileSize} MB)
📁 Distribution: ${OUTPUT_DIR}/
🗜️  Release: ${RELEASE_NAME}.zip

You can now run the application:
  cd ${OUTPUT_DIR}
  ${platform === 'win32' ? `.\\${outputPath}` : `./${outputPath}`}

For GitHub Release:
  - Upload ${RELEASE_NAME}.zip to GitHub Releases
  - Use GitHub Actions Artifact Attestations for verification
  - Tag format: v1.0.0
`);

// 9. クリーンアップ
console.log('Step 9: Cleaning up temporary files...');
try {
  if (existsSync('sea-config.json')) {
    rmSync('sea-config.json');
  }
  if (existsSync('sea-prep.blob')) {
    rmSync('sea-prep.blob');
  }
  if (existsSync(outputPath)) {
    rmSync(outputPath);
  }
  console.log('✓ Cleanup completed\n');
} catch (error) {
  console.warn('⚠ Some temporary files could not be cleaned up\n');
}
