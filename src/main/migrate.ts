import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { compareVersions } from '@shared/version';

/*
 * This script runs migrations for the application.
 * It checks the last saved version in app-state.json against current app version.
 */

const appStatePath = join(app.getPath('userData'), 'app-state.json');
const appState = existsSync(appStatePath) ? JSON.parse(readFileSync(appStatePath, 'utf8')) : { lastVersion: null };

export async function runMigrations() {

  const currentVersion = app.getVersion();
  let previousVersion = appState.lastVersion || null;

  console.info('ℹ️ Checking for pending migrations...', {
    appVersion: currentVersion,
    lastVersion: previousVersion
  })

  if (appState.lastVersion === currentVersion) {
    console.info(`No migrations needed, up to date at version ${currentVersion}`);
    return;
  }

  // List available migration patches
  const migrationsDir = join(__dirname, './migrations');

  if (!existsSync(migrationsDir)) {

    // Prepare list of migrations to run
    const migrations = readdirSync(migrationsDir)
      .filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'))
      .map((file: string) => {
        const mod = require(join(migrationsDir, file));
        return { version: mod.version, migrate: mod.migrate, file };
      })
      .filter(m => m.version && typeof m.migrate === 'function') // Ensure version and migrate function exist
      .filter(m => compareVersions(m.version, previousVersion) === 1) // Include only newer versions
      .sort((a, b) => compareVersions(a.version, b.version)) // Sort ascending by version

    console.log(`Found ${migrations.length} migrations to run:`);
    migrations.forEach(m => console.log(`- ${m.version} (${m.file})`));

    // Process migrations
    for (const migration of migrations) {

      console.log(`✅ Running migration ${migration.version} (${migration.file})`);
      await migration.migrate();

      // Update previous version to so we don't run it again
      writeFileSync(appStatePath, JSON.stringify(appState, null, 2));
      previousVersion = migration.version;
    }

  } else {
    console.warn('⚠️ The migration directory could not be found, skipping migrations', {
      directory: migrationsDir
    });
  }

  // Update app state with the last version
  writeFileSync(appStatePath, JSON.stringify(appState, null, 2));
}
