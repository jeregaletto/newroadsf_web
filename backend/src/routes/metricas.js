import { Router } from 'express';
import { requireAdmin } from '../auth.js';
import { normalizarDias, tablero } from '../metricas.js';

const router = Router();

// GET /api/metricas?dias=30   (solo admin)
router.get('/', requireAdmin, async (req, res) => {
  res.json(await tablero(normalizarDias(req.query.dias, 30)));
});

export default router;
