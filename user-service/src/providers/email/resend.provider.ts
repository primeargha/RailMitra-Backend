import { Resend } from "resend";
import { config } from "@/config/index.js";
import { logger } from "@/config/logger.js";
import { InternalServerError } from "@/utils/error.js";
import type { EmailProvider, SendEmailInput } from "./email.types.js";

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;

  constructor() {
    this.client = new Resend(config.RESEND_API_KEY);
  }

  async send(input: SendEmailInput) {
    const { data, error } = await this.client.emails.send({
      from: config.MAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    });

    if (error) {
      logger.error({ err: error, to: input.to }, "Resend email failed");
      throw new InternalServerError("Failed to send email", "EMAIL_SEND_FAILED");
    }

    logger.info({ to: input.to, id: data?.id }, "Email sent via Resend");
    return { id: data?.id };
  }
}
