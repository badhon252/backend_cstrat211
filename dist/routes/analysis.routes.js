"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analysis_controller_1 = require("../controllers/analysis.controller");
const router = express_1.default.Router();
router.get('/dashboard', analysis_controller_1.getAnalytics);
router.get('/dashboard-analysis', analysis_controller_1.dashboardAnalysis);
exports.default = router;
