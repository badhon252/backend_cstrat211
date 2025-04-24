"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAdmin = checkAdmin;
function checkAdmin(req, res, next) {
    if (!req.user) {
        res.status(401).json({ message: "No user found" });
        return;
    }
    if (req.user.role !== "admin") {
        res.status(403).json({ message: "Access denied admins only" });
        return;
    }
    next();
}
