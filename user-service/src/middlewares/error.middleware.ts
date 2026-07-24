import type { NextFunction, Request, Response } from "express";
import { config } from "@/config/index.js";
import { logger } from "@/config/logger.js";
import { AppError } from "@/utils/error.js";

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(
      {
        code: err.code,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
      },
      err.message, // e.g. "Test resource not found"
    );
    return res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
    });
  }

  logger.error(
    {
      message: err.message,
      stack: config.NODE_ENV !== "production" ? err.stack : undefined,
      path: req.path,
      method: req.method,
    },
    "UNHANDLED ERROR",
  );

  return res.status(500).json({
    success: false,
    error: "SERVER_ERROR",
    message: "Internal Server Error",
  });
};
