import cors from "cors";
import { config } from "@/config/index.js";

export const corsMiddleware = cors({
  origin(origin, callback) {
    // non-browser tools (curl/Postman) often send no Origin
    if (!origin) {
      return callback(null, true);
    }

    if (config.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});