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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.uploadToCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const promises_1 = __importDefault(require("fs/promises"));
const config_1 = require("../config");
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: config_1.cloudinaryCloudName,
    api_key: config_1.cloudinaryApiKey,
    api_secret: config_1.cloudinaryApiSecret,
    secure: true
});
const uploadToCloudinary = (filePath, folder) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!config_1.cloudinaryCloudName || !config_1.cloudinaryApiKey || !config_1.cloudinaryApiSecret) {
            throw new Error("Cloudinary configuration is missing");
        }
        const options = {
            folder,
            use_filename: true,
            unique_filename: false,
            overwrite: true,
            resource_type: "auto",
        };
        const result = yield cloudinary_1.v2.uploader.upload(filePath, options);
        return result.secure_url;
    }
    catch (error) {
        console.error("Cloudinary upload error:", error);
        throw new Error("Failed to upload file to Cloudinary");
    }
    finally {
        yield promises_1.default.unlink(filePath).catch(error => {
            console.error("Error deleting temporary file:", error);
        });
    }
});
exports.uploadToCloudinary = uploadToCloudinary;
const deleteFromCloudinary = (url) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!config_1.cloudinaryCloudName || !config_1.cloudinaryApiKey || !config_1.cloudinaryApiSecret) {
            throw new Error("Cloudinary configuration is missing");
        }
        const publicId = url.split('/').slice(-2).join('/').split('.')[0];
        if (publicId) {
            yield cloudinary_1.v2.uploader.destroy(publicId, {
                resource_type: url.includes('/video/upload/') ? 'video' : 'image'
            });
        }
    }
    catch (error) {
        console.error("Cloudinary delete error:", error);
        throw new Error("Failed to delete file from Cloudinary");
    }
});
exports.deleteFromCloudinary = deleteFromCloudinary;
