"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllContents = exports.getContentByType = exports.updateContent = exports.createContent = void 0;
const content_model_1 = require("../models/content.model");
const createContent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { content, type } = req.body;
        if (!content || !type) {
            return res.status(400).json({ status: false, message: 'Content and type are required' });
        }
        if (!['about', 'terms', 'privacy'].includes(type)) {
            return res.status(400).json({ status: false, message: 'Invalid type. Must be about, terms, or privacy' });
        }
        // Check if content of this type already exists
        const existingContent = yield content_model_1.Content.findOne({ type });
        if (existingContent) {
            return res.status(400).json({ status: false, message: `Content for ${type} already exists` });
        }
        const contentDoc = yield content_model_1.Content.create({ content, type });
        res.status(201).json({ status: true, message: `${type} content created successfully`, data: contentDoc });
    }
    catch (error) {
        res.status(500).json({ status: false, message: 'Server error', error: error.message });
    }
});
exports.createContent = createContent;
const updateContent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { content, type } = req.body;
        if (!content || !type) {
            return res.status(400).json({ status: false, message: 'Content and type are required' });
        }
        if (!['about', 'terms', 'privacy'].includes(type)) {
            return res.status(400).json({ status: false, message: 'Invalid type. Must be about, terms, or privacy' });
        }
        const contentDoc = yield content_model_1.Content.findOneAndUpdate({ type }, { content }, { new: true, upsert: true } // Create if doesn't exist
        );
        res.status(200).json({ status: true, message: `${type} content updated successfully`, data: contentDoc });
    }
    catch (error) {
        res.status(500).json({ status: false, message: 'Server error', error: error.message });
    }
});
exports.updateContent = updateContent;
const getContentByType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type } = req.params;
        if (!['about', 'terms', 'privacy'].includes(type)) {
            return res.status(400).json({ status: false, message: 'Invalid type. Must be about, terms, or privacy' });
        }
        const content = yield content_model_1.Content.findOne({ type });
        if (!content) {
            return res.status(404).json({ status: false, message: `${type} content not found` });
        }
        res.status(200).json({ status: true, message: `${type} content retrieved successfully`, data: content });
    }
    catch (error) {
        res.status(500).json({ status: false, message: 'Server error', error: error.message });
    }
});
exports.getContentByType = getContentByType;
const getAllContents = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const contents = yield content_model_1.Content.find();
        res.status(200).json({ status: true, message: 'All contents retrieved successfully', data: contents });
    }
    catch (error) {
        res.status(500).json({ status: false, message: 'Server error', error: error.message });
    }
});
exports.getAllContents = getAllContents;
