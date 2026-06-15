import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_usd REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT,
    service_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    amount_usd REAL NOT NULL,
    invoice_id TEXT,
    payment_id TEXT,
    payment_url TEXT,
    pay_address TEXT,
    pay_amount REAL,
    pay_currency TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    paid_at TEXT,
    FOREIGN KEY (service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS vouches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    review_text TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function getActiveServices() {
  return db
    .prepare(
      `SELECT id, name, description, price_usd
       FROM services
       WHERE active = 1
       ORDER BY name ASC`
    )
    .all();
}

export function getServiceById(id) {
  return db
    .prepare(
      `SELECT id, name, description, price_usd, active
       FROM services
       WHERE id = ?`
    )
    .get(id);
}

export function addService(name, description, priceUsd) {
  const result = db
    .prepare(
      `INSERT INTO services (name, description, price_usd)
       VALUES (?, ?, ?)`
    )
    .run(name, description, priceUsd);
  return Number(result.lastInsertRowid);
}

export function createOrder({ userId, username, serviceId, amountUsd }) {
  const result = db
    .prepare(
      `INSERT INTO orders (user_id, username, service_id, amount_usd, status)
       VALUES (?, ?, ?, ?, 'pending')`
    )
    .run(userId, username || null, serviceId, amountUsd);
  return Number(result.lastInsertRowid);
}

export function updateOrderPayment(orderId, paymentData) {
  db.prepare(
    `UPDATE orders
     SET invoice_id = ?,
         payment_id = ?,
         payment_url = ?,
         pay_address = ?,
         pay_amount = ?,
         pay_currency = ?
     WHERE id = ?`
  ).run(
    paymentData.invoiceId ?? null,
    paymentData.paymentId ?? null,
    paymentData.paymentUrl ?? null,
    paymentData.payAddress ?? null,
    paymentData.payAmount ?? null,
    paymentData.payCurrency ?? null,
    orderId
  );
}

export function getOrderById(id) {
  return db
    .prepare(
      `SELECT o.*, s.name AS service_name
       FROM orders o
       JOIN services s ON s.id = o.service_id
       WHERE o.id = ?`
    )
    .get(id);
}

export function getOrderByPaymentId(paymentId) {
  return db
    .prepare(
      `SELECT o.*, s.name AS service_name
       FROM orders o
       JOIN services s ON s.id = o.service_id
       WHERE o.payment_id = ? OR o.invoice_id = ?`
    )
    .get(paymentId, paymentId);
}

export function markOrderPaid(orderId) {
  const result = db
    .prepare(
      `UPDATE orders
       SET status = 'paid', paid_at = datetime('now')
       WHERE id = ? AND status != 'paid'`
    )
    .run(orderId);
  return result.changes > 0;
}

export function getOrders({ status, limit = 20 } = {}) {
  if (status) {
    return db
      .prepare(
        `SELECT o.*, s.name AS service_name
         FROM orders o
         JOIN services s ON s.id = o.service_id
         WHERE o.status = ?
         ORDER BY o.created_at DESC
         LIMIT ?`
      )
      .all(status, limit);
  }

  return db
    .prepare(
      `SELECT o.*, s.name AS service_name
       FROM orders o
       JOIN services s ON s.id = o.service_id
       ORDER BY o.created_at DESC
       LIMIT ?`
    )
    .all(limit);
}

export function getVouches(limit = 20) {
  return db
    .prepare(
      `SELECT id, customer_name, review_text, rating, created_at
       FROM vouches
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit);
}

export function addVouch(customerName, reviewText, rating = 5) {
  const result = db
    .prepare(
      `INSERT INTO vouches (customer_name, review_text, rating)
       VALUES (?, ?, ?)`
    )
    .run(customerName, reviewText, rating);
  return Number(result.lastInsertRowid);
}

export default db;
