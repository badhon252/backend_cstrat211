import express from 'express';
import { getAnalytics,dashboardAnalysis} from '../controllers/analysis.controller';

const router = express.Router();

router.get('/dashboard', getAnalytics);

router.get('/dashboard-analysis', dashboardAnalysis)

export default router;
