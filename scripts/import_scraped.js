import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pickBestCategoryImages } from './categoryImagePicker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCRAPER_DB = join(__dirname, '../scraper/products.db');
const ICEGEAR_DB = join(__dirname, '../icegear.db');

const scraperDb = new DatabaseSync(SCRAPER_DB);
const icegearDb = new DatabaseSync(ICEGEAR_DB);

const selProducts = scraperDb.prepare(`
  SELECT * FROM products
  WHERE id IN (
    SELECT id FROM (
      SELECT p.id,
             rtrim(
               CASE WHEN instr(p.product_url,'#') > 0
                    THEN substr(p.product_url, 1, instr(p.product_url,'#') - 1)
                    ELSE p.product_url END,
               '/'
             ) AS canon,
             COALESCE(s.cnt, 0) AS seller_cnt
      FROM products p
      LEFT JOIN (SELECT product_id, COUNT(*) cnt FROM sellers GROUP BY product_id) s
             ON s.product_id = p.id
    ) ranked
    GROUP BY canon
    HAVING seller_cnt = MAX(seller_cnt)
  )
  ORDER BY id
`);
const selSellersByProduct = scraperDb.prepare('SELECT * FROM sellers WHERE product_id = ?');
const selPriceHistoryByProduct = scraperDb.prepare(`
  SELECT year, month, MIN(price) AS price
  FROM price_history
  WHERE product_id = ?
  GROUP BY year, month
  ORDER BY year, month
`);

const selCategoryByName = icegearDb.prepare('SELECT id FROM categories WHERE lower(name) = lower(?)');
const insCategory = icegearDb.prepare('INSERT INTO categories (name, image_url) VALUES (?, ?)');
const updCategoryImage = icegearDb.prepare('UPDATE categories SET image_url = ? WHERE id = ?');

const selProductByKey = icegearDb.prepare(
  'SELECT id, description, image_url, badge FROM products WHERE name = ? AND brand = ? LIMIT 1'
);
const insProduct = icegearDb.prepare(`
  INSERT INTO products (name, description, brand, category_id, image_url, specs, badge)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const updProduct = icegearDb.prepare(`
  UPDATE products
  SET description = ?, category_id = ?, image_url = ?, specs = ?, badge = ?
  WHERE id = ?
`);

const selStoreByName = icegearDb.prepare('SELECT id FROM stores WHERE name = ?');
const insStore = icegearDb.prepare('INSERT INTO stores (name, location) VALUES (?, ?)');

const upsertInventory = icegearDb.prepare(`
  INSERT INTO inventory (store_id, product_id, price, original_price, stock, shelf_note)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(store_id, product_id) DO UPDATE SET
    price = excluded.price,
    original_price = excluded.original_price,
    shelf_note = excluded.shelf_note
`);

const insPriceHistoryIfMissing = icegearDb.prepare(`
  INSERT INTO price_history (product_id, price, month, year)
  SELECT ?, ?, ?, ?
  WHERE NOT EXISTS (
    SELECT 1 FROM price_history WHERE product_id = ? AND month = ? AND year = ?
  )
`);

function canonicalizeUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    let result = parsed.toString();
    if (result.endsWith('/')) result = result.slice(0, -1);
    return result;
  } catch {
    return String(url).trim();
  }
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function formatCategoryName(rawCategory) {
  const slug = normalizeWhitespace(rawCategory).toLowerCase();
  if (!slug) return 'Other';
  return slug
    .split(/[-_\s]+/)
    .map(part => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function parseLowestPrice(text) {
  const match = String(text || '').match(/alates\s+(\d+(?:[.,]\d+)?)/i);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function parsePriceText(priceText) {
  const number = String(priceText || '').match(/\d+(?:[.,]\d+)?/);
  if (!number) return { price: null, originalPrice: null };
  const price = Number(number[0].replace(',', '.'));
  return { price: Number.isFinite(price) ? price : null, originalPrice: null };
}

function buildSpecs(product) {
  const specs = [];
  if (product.category) {
    specs.push({ key: 'Kategooria', value: formatCategoryName(product.category) });
  }
  return JSON.stringify(specs);
}

function getOrCreateCategoryId(categoryName, imageUrl) {
  let row = selCategoryByName.get(categoryName);
  if (!row) {
    row = { id: insCategory.run(categoryName, imageUrl).lastInsertRowid };
  } else if (imageUrl) {
    updCategoryImage.run(imageUrl, row.id);
  }
  return row.id;
}

function getOrCreateStoreId(storeName, storeUrl) {
  const normalizedName = normalizeWhitespace(storeName) || 'hind.ee';
  let row = selStoreByName.get(normalizedName);
  if (row) return row.id;

  let location = 'Online';
  if (storeUrl) {
    try {
      location = new URL(storeUrl, 'https://www.hind.ee').hostname;
    } catch {
      location = 'Online';
    }
  }

  return insStore.run(normalizedName, location).lastInsertRowid;
}

function getOrCreateProductId(product, categoryId, imageUrl, specs, badge) {
  const brand = normalizeWhitespace(product.brand) || 'Unknown';
  const description = normalizeWhitespace(product.name);

  const existing = selProductByKey.get(product.name, brand);
  if (!existing) {
    return insProduct.run(
      product.name,
      description,
      brand,
      categoryId,
      imageUrl,
      specs,
      badge
    ).lastInsertRowid;
  }

  updProduct.run(
    description,
    categoryId,
    imageUrl || existing.image_url,
    specs,
    badge || existing.badge,
    existing.id
  );
  return existing.id;
}

async function importProducts() {
  const products = selProducts.all();
  let imported = 0;

  // 1. Pick best images for each category
  const bestImages = await pickBestCategoryImages(products);

  for (const prod of products) {
    const canonicalUrl = canonicalizeUrl(prod.product_url);
    const imageUrl = normalizeWhitespace((prod.image_links || '').split(',')[0]) || null;
    const categoryName = formatCategoryName(prod.category);
    // Use best image for this category if available
    const bestImage = bestImages[categoryName] || imageUrl;
    const categoryId = getOrCreateCategoryId(categoryName, bestImage);
    const specs = buildSpecs(prod);
    const sellers = selSellersByProduct.all(prod.id);
    const badge = sellers.length >= 8 ? 'Populaarne' : null;
    const productId = getOrCreateProductId(prod, categoryId, imageUrl, specs, badge);

    const pricesForHistory = [];
    for (const seller of sellers) {
      const { price, originalPrice } = parsePriceText(seller.price);
      if (price === null) continue;

      const storeId = getOrCreateStoreId(seller.store_name, seller.store_url);
      upsertInventory.run(
        storeId,
        productId,
        price,
        originalPrice,
        0,
        seller.store_url || null
      );
      pricesForHistory.push(price);
    }

    if (pricesForHistory.length > 0) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const minPrice = Math.min(...pricesForHistory);
      insPriceHistoryIfMissing.run(productId, minPrice, month, year, productId, month, year);
    }

    // Import scraped price history (min price per month from the chart endpoint).
    const pricePoints = selPriceHistoryByProduct.all(prod.id);
    for (const point of pricePoints) {
      insPriceHistoryIfMissing.run(
        productId, point.price, point.month, point.year,
        productId, point.month, point.year
      );
    }

    imported += 1;
  }

  console.log(`Import finished. Imported/updated: ${imported}`);
}

try {
  icegearDb.exec('BEGIN');
  await importProducts();
  icegearDb.exec('COMMIT');
} catch (error) {
  try {
    icegearDb.exec('ROLLBACK');
  } catch {
    // Ignore rollback failures and rethrow original error.
  }
  console.error('Import failed:', error);
  process.exitCode = 1;
} finally {
  scraperDb.close();
  icegearDb.close();
}
