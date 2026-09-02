import path from 'node:path';
import express from 'express';
import { login, requireAccessCode } from './auth';
import { ordersRouter } from './routes/orders';
import { requestsRouter } from './routes/requests';

const PORT = Number(process.env.PORT ?? 8080);
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(__dirname, '..', 'uploads');

const app = express();
app.use(express.json());

app.post('/api/login', login);
app.use('/api/orders', requireAccessCode, ordersRouter);
app.use('/api/requests', requireAccessCode, requestsRouter);

app.use('/uploads', requireAccessCode, express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`FieldOps server listening on port ${PORT}`);
});
