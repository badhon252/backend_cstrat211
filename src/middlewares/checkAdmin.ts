import { Request, Response, NextFunction } from "express";
import { IUser } from "../models/user.model";

export function checkAdmin(
  req: Request & { user?: IUser },
  res: Response,
  next: NextFunction
) {
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
