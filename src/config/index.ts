import { config } from "dotenv";

config({ path: ".env" });

export const port: number = parseInt(process.env.PORT || "8001", 10);
export const mongodbUrl: string = process.env.MONGODB_URI || "";
export const jwtSecret: string = process.env.JWT_SECRET || "defaultsecret";
export const emailUser: string = process.env.EMAIL_USER || "";
export const emailPass: string = process.env.EMAIL_PASS || "";
export { config };

