// Clear all data rows from the main icegear database while keeping schema.
// Run: node scripts/clear_icegear.js

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ICEGEAR_DB = join(__dirname, '../icegear.db');

const db = new DatabaseSync(ICEGEAR_DB);

try {
  db.exec('BEGIN');

  db.exec(`
    DELETE FROM price_history;
    DELETE FROM inventory;
    DELETE FROM products;
    DELETE FROM stores;
    DELETE FROM categories;
    DELETE FROM sqlite_sequence
    WHERE name IN ('price_history', 'inventory', 'products', 'stores', 'categories');
  `);

  db.exec('COMMIT');
  console.log('Cleared all records from icegear.db');
} catch (error) {
  try {
    db.exec('ROLLBACK');
  } catch {
    // Ignore rollback failures and surface the original error.
  }
  console.error('Failed to clear icegear.db:', error);
  process.exitCode = 1;
} finally {
  db.close();
}
