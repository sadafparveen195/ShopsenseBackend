import dotenv from "dotenv";
import connectDB from "./src/db/index.js";
import app from "./src/app.js";

dotenv.config({ path: "./.env" });

connectDB().catch((err) => console.error("DB connection error:", err));

export default app;
