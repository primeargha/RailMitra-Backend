export function getOtpTemplate(otp: string, ttlMinutes: number) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: auto; padding: 20px;">
        <h2>RailMitra</h2>
        <p>Use this verification code to complete sign up:</p>
        <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold;">${otp}</p>
        <p>This code expires in <strong>${ttlMinutes} minutes</strong>.</p>
        <p>If this wasn't you, ignore this email.</p>
      </div>
    `;
  }
  
  export function getWelcomeTemplate(firstName: string) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 420px; margin: auto; padding: 20px;">
        <h2>RailMitra</h2>
        <p>Hi <strong>${firstName}</strong>,</p>
        <p>Your email is verified. Welcome aboard!</p>
      </div>
    `;
  }