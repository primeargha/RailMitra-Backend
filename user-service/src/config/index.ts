import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

const port = Number(required("PORT"));
if (Number.isNaN(port)) {
  throw new Error("PORT environment variable must be a number");
}

export const config = {
  SERVICE_NAME: required("SERVICE_NAME"),
  PORT: port,
  NODE_ENV: required("NODE_ENV"),
  LOG_LEVEL: required("LOG_LEVEL"),
  ALLOWED_ORIGINS: required("ALLOWED_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  DATABASE_URL: required("DATABASE_URL"),
  REDIS_URL: required("REDIS_URL"),
  EMAIL_PROVIDER: required("EMAIL_PROVIDER"), // "resend" for now
  RESEND_API_KEY: required("RESEND_API_KEY"),
  MAIL_FROM: required("MAIL_FROM"),
} as const;

if (config.ALLOWED_ORIGINS.length === 0) {
  throw new Error("ALLOWED_ORIGINS must include at least one origin");
}
