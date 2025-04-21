import { Request, Response } from 'express';
import { Content } from '../models/content.model';

export const createContent = async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }
    const contentDoc = await Content.create({ content });
    res.status(201).json(contentDoc);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/contents
export const getAllContents = async (_req: Request, res: Response) => {
  try {
    const contents = await Content.find().sort({ createdAt: -1 });
    res.status(200).json(contents);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};