"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const content_controller_1 = require("../controllers/content.controller");
const router = express_1.default.Router();
// Create new content (About Us, Terms, Privacy)
router.post('/create', content_controller_1.createContent);
// Update existing content by type
router.put('/update', content_controller_1.updateContent);
// Get content by type (about, terms, privacy)
router.get('/:type', content_controller_1.getContentByType);
// Get all contents
router.get('/', content_controller_1.getAllContents);
exports.default = router;
