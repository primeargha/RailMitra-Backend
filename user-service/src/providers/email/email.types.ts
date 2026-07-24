export type SendEmailInput = {
    to: string;
    subject: string;
    html: string;
  };
  
  export interface EmailProvider {
    send(input: SendEmailInput): Promise<{ id?: string }>;
  }