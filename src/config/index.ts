import { config } from "dotenv";

config({ path: ".env" });

const port = process.env.PORT;
const mongodbUrl = process.env.MONGODB_URI as string;

export { port, mongodbUrl };
