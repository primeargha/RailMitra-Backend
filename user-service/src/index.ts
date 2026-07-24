import "dotenv/config";
import cookieParser from "cookie-parser";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { config } from "@/config/index.js";
import { logger } from "@/config/logger.js";
import { corsMiddleware } from "@/middlewares/cors.middleware.js";
import { errorHandler } from "@/middlewares/error.middleware.js";
import { reqLogger } from "@/middlewares/req.middleware.js";
import { emailService } from "@/services/email.service.js";
import { BadRequestError } from "@/utils/error.js";

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
app.post("/test-email", async (req, res, next) => {
  try {
    const to = req.body?.to as string | undefined;
    if (!to) throw new BadRequestError("to is required");
    await emailService.sendOtpEmail(to, "123456", 5);
    res.json({ success: true, message: "OTP email sent" });
  } catch (err) {
    next(err);
  }
});
app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(`${config.SERVICE_NAME} is running on http://localhost:${config.PORT}`);
});
