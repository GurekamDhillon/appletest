import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { getRequest, insertRequest, listRequests, updateRequest } from '../db';
import { REQUEST_TYPES, RequestType } from '../types';

export const requestsRouter = Router();

requestsRouter.get('/', (_req, res) => {
  res.json(listRequests());
});

requestsRouter.post('/', (req, res) => {
  const { type, vehicleLabel, note, dueDate } = req.body ?? {};
  if (!REQUEST_TYPES.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${REQUEST_TYPES.join(', ')}` });
    return;
  }
  const request = {
    id: randomUUID(),
    type: type as RequestType,
    vehicleLabel: vehicleLabel ? String(vehicleLabel) : undefined,
    note: note ? String(note) : undefined,
    dueDate: dueDate ? String(dueDate) : undefined,
    status: 'open' as const,
    createdAt: new Date().toISOString(),
  };
  insertRequest(request);
  res.status(201).json(getRequest(request.id));
});

requestsRouter.patch('/:id/fulfill', (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) {
    res.status(404).json({ error: 'Request not found.' });
    return;
  }
  if (request.status === 'cancelled') {
    res.status(400).json({ error: 'Request is cancelled.' });
    return;
  }
  request.status = 'fulfilled';
  request.fulfilledAt = new Date().toISOString();
  updateRequest(request);
  res.json(getRequest(request.id));
});

requestsRouter.patch('/:id/cancel', (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) {
    res.status(404).json({ error: 'Request not found.' });
    return;
  }
  request.status = 'cancelled';
  updateRequest(request);
  res.json(getRequest(request.id));
});
