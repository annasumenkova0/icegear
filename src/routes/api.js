import db from '../lib/db.js';

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

function parseQuery(url) {
  return Object.fromEntries(new URL(url, 'http://x').searchParams);
}

export function getCategories(req, res) {
  json(res, 200, db.prepare('SELECT * FROM categories').all());
}

export function getBrands(req, res) {
  const rows = db.prepare('SELECT DISTINCT brand FROM products ORDER BY brand').all();
  json(res, 200, rows.map(r => r.brand));
}

export function getProducts(req, res) {
  const { category_id, brand, search, page = '1', limit = '8' } = parseQuery(req.url);
  const offset = (Number(page) - 1) * Number(limit);

  const clauses = [];
  const params = [];

  if (category_id) { clauses.push('p.category_id = ?'); params.push(Number(category_id)); }
  if (brand) { clauses.push('p.brand = ?'); params.push(brand); }
  if (search) { clauses.push('(p.name LIKE ? OR p.brand LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT p.id, p.name, p.brand, p.image_url, p.badge, c.name AS category
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ${where}
    ORDER BY p.id
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  json(res, 200, rows);
}

export function getProductById(req, res, id) {
  const product = db.prepare(`
    SELECT p.*, c.name AS category
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(Number(id));

  if (!product) return json(res, 404, { error: 'Not found' });

  product.specs = JSON.parse(product.specs);

  product.stores = db.prepare(`
    SELECT s.name AS store_name, s.location, i.price, i.original_price, i.stock, i.shelf_note
    FROM inventory i
    JOIN stores s ON i.store_id = s.id
    WHERE i.product_id = ?
    ORDER BY i.stock DESC
  `).all(Number(id));

  product.price_history = db.prepare(`
    SELECT month, year, price FROM price_history
    WHERE product_id = ?
    ORDER BY year, month
  `).all(Number(id));

  json(res, 200, product);
}

export const routes = {
  'GET /api/categories': getCategories,
  'GET /api/brands': getBrands,
  'GET /api/products': getProducts,
  'GET /api/products/:id': getProductById,
};
