import { Request, Response } from 'express';
import { Content } from '../models/content.model';

export const createContent = async (req: Request, res: Response) => {
  try {
    const { content, type } = req.body;
    if (!content || !type) {
      return res.status(400).json({ status: false, message: 'Content and type are required' });
    }
    if (!['about', 'terms', 'privacy'].includes(type)) {
      return res.status(400).json({ status: false, message: 'Invalid type. Must be about, terms, or privacy' });
    }
    // Check if content of this type already exists
    const existingContent = await Content.findOne({ type });
    if (existingContent) {
      return res.status(400).json({ status: false, message: `Content for ${type} already exists` });
    }
    const contentDoc = await Content.create({ content, type });
    res.status(201).json({ status: true, message: `${type} content created successfully`, data: contentDoc });
  } catch (error: any) {
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

export const updateContent = async (req: Request, res: Response) => {
  try {
    const { content, type } = req.body;
    if (!content || !type) {
      return res.status(400).json({ status: false, message: 'Content and type are required' });
    }
    if (!['about', 'terms', 'privacy'].includes(type)) {
      return res.status(400).json({ status: false, message: 'Invalid type. Must be about, terms, or privacy' });
    }
    const contentDoc = await Content.findOneAndUpdate(
      { type },
      { content },
      { new: true, upsert: true } // Create if doesn't exist
    );
    res.status(200).json({ status: true, message: `${type} content updated successfully`, data: contentDoc });
  } catch (error: any) {
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

export const getContentByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    if (!['about', 'terms', 'privacy'].includes(type)) {
      return res.status(400).json({ status: false, message: 'Invalid type. Must be about, terms, or privacy' });
    }
    const content = await Content.findOne({ type });
    if (!content) {
      return res.status(404).json({ status: false, message: `${type} content not found` });
    }
    res.status(200).json({ status: true, message: `${type} content retrieved successfully`, data: content });
  } catch (error: any) {
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

export const getAllContents = async (_req: Request, res: Response) => {
  try {
    const contents = await Content.find();
    res.status(200).json({ status: true, message: 'All contents retrieved successfully', data: contents });
  } catch (error: any) {
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};