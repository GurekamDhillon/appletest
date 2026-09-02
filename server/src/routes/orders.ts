import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { getOrder, insertOrder, listOrders, updateOrder } from '../db';
import { ORDER_STAGES, OrderStage } from '../types';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(__dirname, '..', '..', 'uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${req.params.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

export const ordersRouter = Router();

ordersRouter.get('/', (_req, res) => {
  res.json(listOrders());
});

ordersRouter.post('/', (req, res) => {
  const { orderRef, client, notes } = req.body ?? {};
  if (!orderRef || !client) {
    res.status(400).json({ error: 'orderRef and client are required.' });
    return;
  }
  const now = new Date().toISOString();
  const order = {
    id: randomUUID(),
    orderRef: String(orderRef),
    client: String(client),
    stage: 'requested' as OrderStage,
    stageHistory: [{ stage: 'requested' as OrderStage, at: now }],
    notes: notes ? String(notes) : undefined,
    createdAt: now,
  };
  insertOrder(order);
  res.status(201).json(getOrder(order.id));
});

ordersRouter.patch('/:id', (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  const { client, notes } = req.body ?? {};
  if (client !== undefined) order.client = String(client);
  if (notes !== undefined) order.notes = notes ? String(notes) : undefined;
  updateOrder(order);
  res.json(getOrder(order.id));
});

ordersRouter.patch('/:id/stage', (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  const { stage } = req.body ?? {};
  if (!ORDER_STAGES.includes(stage)) {
    res.status(400).json({ error: 'Invalid stage.' });
    return;
  }
  if (stage === 'pod_submitted') {
    res.status(400).json({ error: 'Use POST /:id/pod to submit proof of delivery.' });
    return;
  }
  order.stage = stage as OrderStage;
  order.stageHistory.push({ stage: stage as OrderStage, at: new Date().toISOString() });
  updateOrder(order);
  res.json(getOrder(order.id));
});

ordersRouter.post('/:id/pod', upload.single('photo'), (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'photo file is required.' });
    return;
  }
  order.podPhotoUri = `/uploads/${req.file.filename}`;
  order.stage = 'pod_submitted';
  order.stageHistory.push({ stage: 'pod_submitted', at: new Date().toISOString() });
  updateOrder(order);
  res.json(getOrder(order.id));
});
