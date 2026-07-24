import { createEmailProvider } from "@/providers/email/email.factory.js";
import {
  getOtpTemplate,
  getWelcomeTemplate,
} from "@/templates/email.templates.js";

const emailProvider = createEmailProvider();

export const emailService = {
  async sendOtpEmail(email: string, otp: string, ttlMinutes: number) {
    return emailProvider.send({
      to: email,
      subject: "Your RailMitra verification code",
      html: getOtpTemplate(otp, ttlMinutes),
    });
  },

  async sendWelcomeEmail(email: string, firstName: string) {
    return emailProvider.send({
      to: email,
      subject: "Welcome to RailMitra - Email Verified",
      html: getWelcomeTemplate(firstName),
    });
  },
};