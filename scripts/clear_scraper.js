// Clear all scraped rows from scraper/products.db while keeping schema.
// Run: node scripts/clear_scraper.js

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCRAPER_DB = join(__dirname, '../scraper/products.db');

const db = new DatabaseSync(SCRAPER_DB);

try {
  db.exec('BEGIN');

  db.exec(`
    DELETE FROM sellers;
    DELETE FROM products;
    DELETE FROM sqlite_sequence
    WHERE name IN ('sellers', 'products');
  `);

  db.exec('COMMIT');
  console.log('Cleared all records from scraper/products.db');
} catch (error) {
  try {
    db.exec('ROLLBACK');
  } catch {
    // Ignore rollback failures and surface the original error.
  }
  console.error('Failed to clear scraper/products.db:', error);
  process.exitCode = 1;
} finally {
  db.close();
}
