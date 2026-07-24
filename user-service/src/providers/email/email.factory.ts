import { config } from "@/config/index.js";
import type { EmailProvider } from "./email.types.js";
import { ResendEmailProvider } from "./resend.provider.js";

export function createEmailProvider(): EmailProvider {
  switch (config.EMAIL_PROVIDER) {
    case "resend":
      return new ResendEmailProvider();
    // case "sendgrid":
    //   return new SendGridEmailProvider();
    default:
      throw new Error(`Unsupported EMAIL_PROVIDER: ${config.EMAIL_PROVIDER}`);
  }
}
