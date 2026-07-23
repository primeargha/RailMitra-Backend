import { pinoHttp } from "pino-http";
import { logger } from "@/config/logger.js";

export const reqLogger = pinoHttp({
  logger,
  quietReqLogger: true,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 400) {
      return "silent"; // skip access log; error middleware logs these
    }
    return "info";
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} statusCode: ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} statusCode: ${res.statusCode} - ${err.message}`;
  },
});