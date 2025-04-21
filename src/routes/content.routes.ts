import express from 'express';
import {
  createContent,
  updateContent,
  getContentByType,
  getAllContents,
} from '../controllers/content.controller';

const router = express.Router();

// Create new content (About Us, Terms, Privacy)
router.post('/create', createContent as express.RequestHandler);

// Update existing content by type
router.put('/update', updateContent as express.RequestHandler);

// Get content by type (about, terms, privacy)
router.get('/:type', getContentByType as express.RequestHandler);

// Get all contents
router.get('/', getAllContents as express.RequestHandler);

export default router;