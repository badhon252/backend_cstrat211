import express from 'express';
import {
  createContent,
  getAllContents,

} from '../controllers/content.controller';

const router = express.Router();

// Create a new content
router.post('/post', createContent as express.RequestHandler);

// Get all content
router.get('/', getAllContents as express.RequestHandler);



export default router;