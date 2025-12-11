import { promises as fs } from 'fs';
import path from 'path';

const BASE_DIR = process.cwd();
const PROFILES_DIR = path.join(BASE_DIR, 'config/profiles');

async function migrateProfile(profileDir: string, profileName: string): Promise<void> {
  const oldUiPath = path.join(profileDir, 'display-settings.json');
  const oldEnginePath = path.join(profileDir, 'search-engines.json');
  const oldWdimsUiPath = path.join(profileDir, 'wdims_ui.json');
  const oldWdimsEnginePath = path.join(profileDir, 'wdims_engine.json');
  const newUiPath = path.join(profileDir, `${profileName}.wdims_ui.json`);
  const newEnginePath = path.join(profileDir, `${profileName}.wdims_engine.json`);

  // UI設定ファイルの移行
  try {
    // 新しい命名規則のファイルが既に存在する場合はスキップ
    await fs.access(newUiPath);
    console.log(`  ✓ ${profileName}/${profileName}.wdims_ui.json already exists`);
  } catch {
    // wdims_ui.json が存在すれば移行
    try {
      await fs.access(oldWdimsUiPath);
      await fs.rename(oldWdimsUiPath, newUiPath);
      console.log(`  ✓ Migrated ${profileName}/wdims_ui.json → ${profileName}.wdims_ui.json`);
    } catch {
      // 古いdisplay-settings.jsonが存在すれば移行
      try {
        await fs.access(oldUiPath);
        await fs.rename(oldUiPath, newUiPath);
        console.log(`  ✓ Migrated ${profileName}/display-settings.json → ${profileName}.wdims_ui.json`);
      } catch {
        console.log(`  ⚠ ${profileName}/${profileName}.wdims_ui.json not found`);
      }
    }
  }

  // エンジン設定ファイルの移行
  try {
    // 新しい命名規則のファイルが既に存在する場合はスキップ
    await fs.access(newEnginePath);
    console.log(`  ✓ ${profileName}/${profileName}.wdims_engine.json already exists`);
  } catch {
    // wdims_engine.json が存在すれば移行
    try {
      await fs.access(oldWdimsEnginePath);
      await fs.rename(oldWdimsEnginePath, newEnginePath);
      console.log(`  ✓ Migrated ${profileName}/wdims_engine.json → ${profileName}.wdims_engine.json`);
    } catch {
      // 古いsearch-engines.jsonが存在すれば移行
      try {
        await fs.access(oldEnginePath);
        await fs.rename(oldEnginePath, newEnginePath);
        console.log(`  ✓ Migrated ${profileName}/search-engines.json → ${profileName}.wdims_engine.json`);
      } catch {
        console.log(`  ⚠ ${profileName}/${profileName}.wdims_engine.json not found`);
      }
    }
  }

  return;
}

async function main() {
  console.log('🔄 Starting profile files migration...\n');

  try {
    const entries = await fs.readdir(PROFILES_DIR, { withFileTypes: true });
    const profiles = entries.filter(entry => entry.isDirectory());

    if (profiles.length === 0) {
      console.log('No profiles found.');
      return;
    }

    for (const profile of profiles) {
      const profileDir = path.join(PROFILES_DIR, profile.name);
      console.log(`📁 Processing profile: ${profile.name}`);
      await migrateProfile(profileDir, profile.name);
      console.log('');
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('Note: You can now safely delete the following old files if they still exist:');
    console.log('  - display-settings.json');
    console.log('  - search-engines.json');
    console.log('  - wdims_ui.json');
    console.log('  - wdims_engine.json');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
