import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/index";

export const generateToken = (id: string, role: string) => {
  return jwt.sign({ id, role }, jwtSecret, { expiresIn: "7d" });
};
