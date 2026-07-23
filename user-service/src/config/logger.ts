import pino from "pino";
import pretty from "pino-pretty";
import { config } from "./index.js";

const destination =
  config.NODE_ENV === "development"
    ? pretty({
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      })
    : undefined;

export const logger = pino(
  {
    level: config.LOG_LEVEL,
    base: { service: config.SERVICE_NAME },
  },
  destination,
);