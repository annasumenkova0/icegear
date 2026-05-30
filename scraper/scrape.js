const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('Script starting...');

const BASE_URL = 'https://www.hind.ee';
const MAIN_CATEGORY_URL = BASE_URL + '/c/talvesport/';
const DB_PATH = path.join(__dirname, 'products.db');

const db = new sqlite3.Database(DB_PATH);

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function dbClose() {
  return new Promise((resolve, reject) => {
    db.close(err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    category TEXT,
    brand TEXT,
    details TEXT,
    image_links TEXT,
    product_url TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS sellers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    store_name TEXT,
    price TEXT,
    store_url TEXT,
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS price_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    price      REAL    NOT NULL,
    year       INTEGER NOT NULL,
    month      INTEGER NOT NULL,
    day        INTEGER NOT NULL,
    FOREIGN KEY(product_id) REFERENCES products(id)
  )`);
  db.run('CREATE INDEX IF NOT EXISTS idx_products_product_url ON products(product_url)');
  db.run('CREATE INDEX IF NOT EXISTS idx_sellers_product_id ON sellers(product_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id)');
});

async function fetchHTML(url) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5'
    }
  });
  return cheerio.load(response.data);
}

function normalizeWhitespace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function normalizeProductUrl(url) {
  try {
    const parsed = new URL(url, BASE_URL);
    parsed.hash = '';
    parsed.search = '';
    let result = parsed.toString();
    if (result.endsWith('/')) result = result.slice(0, -1);
    return result;
  } catch {
    return String(url || '').trim();
  }
}

function absolutizeUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return BASE_URL + url;
  return url;
}

function extractSellers($) {
  const sellers = [];
  const seen = new Set();

  $('#section-sellers .seller-item-table tr').each((i, row) => {
    const storeName = normalizeWhitespace(
      $(row).find('td.col-1 img').attr('alt') ||
      $(row).find('td.col-7 .info-link [itemprop="seller"]').first().text() ||
      $(row).find('[itemprop="seller"]').first().text()
    );

    const rawPrice = normalizeWhitespace(
      $(row).find('td.col-6 [itemprop="price"]').first().text() ||
      $(row).find('td.col-6 .price').first().text() ||
      $(row).find('td.col-7 .price').first().text()
    );
    const price = rawPrice ? rawPrice.replace(/\s*\*+$/, '').trim() : '';

    const storeUrl = absolutizeUrl(
      $(row).find('td.col-7 [itemprop="url"]').attr('href') ||
      $(row).find('td.col-7 .button-green').attr('href') ||
      $(row).find('td.col-1 a').attr('href')
    );

    if (!storeName || !price) return;

    const key = `${storeName}::${price}::${storeUrl}`;
    if (seen.has(key)) return;
    seen.add(key);

    sellers.push({ storeName, price, storeUrl });
  });

  return sellers;
}

async function getCategoryLinks() {
  console.log('Fetching main category page:', MAIN_CATEGORY_URL);
  const $ = await fetchHTML(MAIN_CATEGORY_URL);
  const links = [];
  $('.cat-listing-big a, .block-content a').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (href.startsWith(BASE_URL + '/c/') && !href.includes('talvesport')) {
      links.push(href);
    } else if (href.startsWith('/c/') && !href.includes('talvesport')) {
      links.push(BASE_URL + href);
    }
  });
  console.log('Found category links:', links.length);
  return [...new Set(links)];
}

async function getProductLinks(categoryUrl) {
  const MAX_PAGES = 50;
  let page = 1;
  let productLinks = new Set();
  while (page <= MAX_PAGES) {
    const url = categoryUrl + (categoryUrl.endsWith('/') ? '' : '/') + '?page=' + page;
    const $ = await fetchHTML(url);
    const prevSize = productLinks.size;
    $('.product-item-h a, .product-item a, .main-content a').each((i, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      if (href.startsWith(BASE_URL + '/p/')) {
        productLinks.add(normalizeProductUrl(href));
      } else if (href.startsWith('/p/')) {
        productLinks.add(normalizeProductUrl(BASE_URL + href));
      }
    });
    // If no new products found on this page, stop
    if (productLinks.size === prevSize) {
      console.log('No new products on page', page, '- stopping pagination');
      break;
    }
    page++;
  }
  return [...productLinks];
}

async function fetchPriceHistory($, productUrl) {
  const scriptHtml = $.html('#section-price-history script') || '';
  const match = scriptHtml.match(/getScript\("([^"]+price-graph[^"]+)"/);
  if (!match) return [];
  const graphUrl = match[1].replace(/&amp;/g, '&');
  try {
    const resp = await axios.get(graphUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const js = String(resp.data);
    const dataRe = /min\.push\(\[gd\((\d{4}),\s*(\d+),\s*(\d+)\),\s*([\d.]+)/g;
    const points = [];
    let m;
    while ((m = dataRe.exec(js)) !== null) {
      points.push({
        year: Number(m[1]),
        month: Number(m[2]),
        day: Number(m[3]),
        price: Number(m[4]),
      });
    }
    return points;
  } catch {
    return [];
  }
}

async function getProductInfo(productUrl, category) {
  const $ = await fetchHTML(productUrl);
  const name = normalizeWhitespace($('h1').first().text());
  let brand = '';
  let details = '';

  const fullImage = $('a.show-gallery-popup').first().attr('href');
  let imageLinks = fullImage ? [fullImage] : [];

  $('table, .product-details, .product-info').each((i, el) => {
    details += normalizeWhitespace($(el).text()) + ' ';
    if ($(el).text().toLowerCase().includes('bränd')) {
      brand = $(el).find('td:contains("Bränd")').next().text().trim();
    }
  });

  if (imageLinks.length === 0) {
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('https://images.hind.ee/')) imageLinks.push(src);
    });
  }

  imageLinks = [...new Set(imageLinks)].join(',');
  const sellers = extractSellers($);
  const priceHistory = await fetchPriceHistory($, productUrl);
  return { name, category, brand: normalizeWhitespace(brand), details: normalizeWhitespace(details), imageLinks, productUrl: normalizeProductUrl(productUrl), sellers, priceHistory };
}

async function saveProduct(product) {
  const existing = await dbGet(
    'SELECT id FROM products WHERE product_url = ? ORDER BY id LIMIT 1',
    [product.productUrl]
  );

  let productId;
  if (existing) {
    productId = existing.id;
    await dbRun(
      `UPDATE products
       SET name = ?, category = ?, brand = ?, details = ?, image_links = ?
       WHERE id = ?`,
      [
        product.name,
        product.category,
        product.brand,
        product.details,
        product.imageLinks,
        productId,
      ]
    );
  } else {
    const inserted = await dbRun(
      `INSERT INTO products (name, category, brand, details, image_links, product_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [product.name, product.category, product.brand, product.details, product.imageLinks, product.productUrl]
    );
    productId = inserted.lastID;
  }

  await dbRun('DELETE FROM sellers WHERE product_id = ?', [productId]);
  for (const seller of product.sellers || []) {
    await dbRun(
      `INSERT INTO sellers (product_id, store_name, price, store_url) VALUES (?, ?, ?, ?)`,
      [productId, seller.storeName, seller.price, seller.storeUrl]
    );
  }

  await dbRun('DELETE FROM price_history WHERE product_id = ?', [productId]);
  for (const point of product.priceHistory || []) {
    await dbRun(
      `INSERT INTO price_history (product_id, price, year, month, day) VALUES (?, ?, ?, ?, ?)`,
      [productId, point.price, point.year, point.month, point.day]
    );
  }

  return { productId, created: !existing };
}

async function main() {
  console.log('Starting scraper...');
  let createdCount = 0;
  let updatedCount = 0;

  const categoryLinks = await getCategoryLinks();
  console.log('Category links to process:', categoryLinks.length);
  if (categoryLinks.length === 0) {
    console.log('No category links found. Exiting.');
    await dbClose();
    return;
  }

  await dbRun('BEGIN');

  for (const categoryUrl of categoryLinks) {
    const category = categoryUrl.split('/').filter(Boolean).pop();
    console.log('Processing category:', category, categoryUrl);
    const productLinks = await getProductLinks(categoryUrl);
    console.log('Found products in category:', productLinks.length);
    for (const productUrl of productLinks) {
      try {
        const product = await getProductInfo(productUrl, category);
        const result = await saveProduct(product);
        if (result.created) {
          createdCount += 1;
          console.log('Created:', product.name);
        } else {
          updatedCount += 1;
          console.log('Updated:', product.name);
        }
      } catch (e) {
        console.error('Error:', productUrl, e.message);
      }
    }
  }

  await dbRun('COMMIT');
  console.log(`Scrape complete. Created: ${createdCount}, Updated: ${updatedCount}`);
  await dbClose();
}

main().catch(err => {
  console.error('Main error:', err);
  db.run('ROLLBACK', () => {
    db.close();
  });
});
