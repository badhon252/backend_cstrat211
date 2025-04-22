"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Content = void 0;
const mongoose_1 = require("mongoose");
const contentSchema = new mongoose_1.Schema({
    content: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['about', 'terms', 'privacy'],
        required: true,
        unique: true, // Ensure only one document per type
    },
}, {
    strict: true,
});
exports.Content = (0, mongoose_1.model)('Content', contentSchema);
