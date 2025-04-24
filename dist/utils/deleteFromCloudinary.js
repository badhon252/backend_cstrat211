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
const cloudinary_1 = require("cloudinary");
const deleteFromCloudinary = (imageUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const publicId = imageUrl
            .split("/")
            .slice(7)
            .join("/")
            .replace(/\..+$/, "");
        if (!publicId) {
            throw new Error("invalid cloudinary URL format");
        }
        const result = yield cloudinary_1.v2.uploader.destroy(publicId);
        if (result.result !== "ok") {
            throw new Error(`cloudinary deletion failed: ${result.result}`);
        }
        return true;
    }
    catch (error) {
        console.error("error deleting Cloudinary asset:", error);
        throw error;
    }
});
exports.default = deleteFromCloudinary;
