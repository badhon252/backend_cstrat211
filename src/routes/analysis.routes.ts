import express from 'express';
import { getAnalytics } from '../controllers/analysis.controller';

const router = express.Router();

router.get('/dashboard', getAnalytics);

export default router;
