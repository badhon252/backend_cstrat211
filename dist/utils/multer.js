"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const fileFilter = (req, file, cb) => {
    const filetypes = /mp4|mov|avi|webm/;
    const extname = path_1.default.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype;
    // Check if it's a video file
    if (filetypes.test(extname)) {
        if (filetypes.test(mimetype)) {
            return cb(null, true);
        }
        else {
            return cb(new Error("Invalid video file type!"));
        }
    }
    // If it's not a video, check if it's an image (any image type)
    if (mimetype.startsWith('image/')) {
        return cb(null, true);
    }
    // If neither image nor allowed video
    cb(new Error("Only image files and video files (mp4, mov, avi, webm) are allowed!"));
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024,
    },
});
exports.default = upload;
