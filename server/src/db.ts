import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { PaperworkRequest, SalesOrder, StageTransition } from './types';

const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '..', 'data', 'fieldops.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    orderRef TEXT NOT NULL,
    client TEXT NOT NULL,
    stage TEXT NOT NULL,
    stageHistory TEXT NOT NULL,
    podPhotoUri TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    vehicleLabel TEXT,
    note TEXT,
    dueDate TEXT,
    status TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    fulfilledAt TEXT
  )
`);

interface OrderRow {
  id: string;
  orderRef: string;
  client: string;
  stage: string;
  stageHistory: string;
  podPhotoUri: string | null;
  notes: string | null;
  createdAt: string;
}

function rowToOrder(row: OrderRow): SalesOrder {
  return {
    id: row.id,
    orderRef: row.orderRef,
    client: row.client,
    stage: row.stage as SalesOrder['stage'],
    stageHistory: JSON.parse(row.stageHistory) as StageTransition[],
    podPhotoUri: row.podPhotoUri ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function listOrders(): SalesOrder[] {
  const rows = db.prepare('SELECT * FROM orders ORDER BY createdAt DESC').all() as OrderRow[];
  return rows.map(rowToOrder);
}

export function getOrder(id: string): SalesOrder | undefined {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRow | undefined;
  return row ? rowToOrder(row) : undefined;
}

export function insertOrder(order: SalesOrder & { createdAt: string }): void {
  db.prepare(
    `INSERT INTO orders (id, orderRef, client, stage, stageHistory, podPhotoUri, notes, createdAt)
     VALUES (@id, @orderRef, @client, @stage, @stageHistory, @podPhotoUri, @notes, @createdAt)`
  ).run({
    id: order.id,
    orderRef: order.orderRef,
    client: order.client,
    stage: order.stage,
    stageHistory: JSON.stringify(order.stageHistory),
    podPhotoUri: order.podPhotoUri ?? null,
    notes: order.notes ?? null,
    createdAt: order.createdAt,
  });
}

interface RequestRow {
  id: string;
  type: string;
  vehicleLabel: string | null;
  note: string | null;
  dueDate: string | null;
  status: string;
  createdAt: string;
  fulfilledAt: string | null;
}

function rowToRequest(row: RequestRow): PaperworkRequest {
  return {
    id: row.id,
    type: row.type as PaperworkRequest['type'],
    vehicleLabel: row.vehicleLabel ?? undefined,
    note: row.note ?? undefined,
    dueDate: row.dueDate ?? undefined,
    status: row.status as PaperworkRequest['status'],
    createdAt: row.createdAt,
    fulfilledAt: row.fulfilledAt ?? undefined,
  };
}

export function listRequests(): PaperworkRequest[] {
  const rows = db.prepare('SELECT * FROM requests ORDER BY createdAt DESC').all() as RequestRow[];
  return rows.map(rowToRequest);
}

export function getRequest(id: string): PaperworkRequest | undefined {
  const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(id) as RequestRow | undefined;
  return row ? rowToRequest(row) : undefined;
}

export function insertRequest(request: PaperworkRequest): void {
  db.prepare(
    `INSERT INTO requests (id, type, vehicleLabel, note, dueDate, status, createdAt, fulfilledAt)
     VALUES (@id, @type, @vehicleLabel, @note, @dueDate, @status, @createdAt, @fulfilledAt)`
  ).run({
    id: request.id,
    type: request.type,
    vehicleLabel: request.vehicleLabel ?? null,
    note: request.note ?? null,
    dueDate: request.dueDate ?? null,
    status: request.status,
    createdAt: request.createdAt,
    fulfilledAt: request.fulfilledAt ?? null,
  });
}

export function updateRequest(request: PaperworkRequest): void {
  db.prepare(
    `UPDATE requests SET status = @status, fulfilledAt = @fulfilledAt WHERE id = @id`
  ).run({
    id: request.id,
    status: request.status,
    fulfilledAt: request.fulfilledAt ?? null,
  });
}

export function updateOrder(order: SalesOrder): void {
  db.prepare(
    `UPDATE orders SET orderRef = @orderRef, client = @client, stage = @stage,
       stageHistory = @stageHistory, podPhotoUri = @podPhotoUri, notes = @notes
     WHERE id = @id`
  ).run({
    id: order.id,
    orderRef: order.orderRef,
    client: order.client,
    stage: order.stage,
    stageHistory: JSON.stringify(order.stageHistory),
    podPhotoUri: order.podPhotoUri ?? null,
    notes: order.notes ?? null,
  });
}
