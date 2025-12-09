import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

const app = express();

// ✅ Proper CORS setup
app.use(
  cors({
    origin: [
     
      "http://localhost:5173", // local frontend
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // allow all necessary methods
    credentials: true, // allow cookies / auth headers
  })
);

// ✅ Handle preflight OPTIONS requests globally
app.options("*", cors());

// ✅ Body parsers and static files
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(express.static(path.resolve("public")));

// ✅ Import user routes
import userRouter from "./routers/user.routes.js";
app.use("/api/v1/users", userRouter);

// ✅ Root route test
app.get("/", (req, res) => {
  res.json({ success: true, message: "Backend is live 🚀" });
});

export default app;
