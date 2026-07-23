import "dotenv/config";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "@/config/index.js";
import { logger } from "@/config/logger.js";
import { corsMiddleware } from "@/middlewares/cors.middleware.js";
import { reqLogger } from "@/middlewares/req.middleware.js";
import { errorHandler } from "@/middlewares/error.middleware.js";

const app = express();

app.use(corsMiddleware);
app.use(
  helmet({
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(reqLogger);
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req: Request, res: Response) => {
  res.send(`Hello from index.ts of ${config.SERVICE_NAME}`);
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ message: "ok" });
});

app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(
    `${config.SERVICE_NAME} is running on http://localhost:${config.PORT}`,
  );
});