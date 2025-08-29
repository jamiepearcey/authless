interface EmailWebhookPayload {
  email: string;
  name: string;
  token: string;
  action: "registration" | "password-reset";
  callbackUrl: string;
}

interface WhatsAppWebhookPayload {
  phoneNumber: string;
  name: string;
  code: string;
  action: "2fa-verification";
  expiresIn: number; // minutes
}

export async function callRegistrationWebhook(payload: EmailWebhookPayload): Promise<boolean> {
  const webhookUrl = process.env.REGISTRATION_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("REGISTRATION_WEBHOOK_URL not configured");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to call registration webhook:", error);
    return false;
  }
}

export async function callPasswordResetWebhook(payload: EmailWebhookPayload): Promise<boolean> {
  const webhookUrl = process.env.PASSWORD_RESET_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("PASSWORD_RESET_WEBHOOK_URL not configured");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to call password reset webhook:", error);
    return false;
  }
}

export async function callWhatsAppWebhook(payload: WhatsAppWebhookPayload): Promise<boolean> {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("WHATSAPP_WEBHOOK_URL not configured");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to call WhatsApp webhook:", error);
    return false;
  }
}

export function constructEmailVerificationUrl(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/auth/verify-email?token=${token}`;
}

export function constructPasswordResetUrl(token: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/auth/reset-password?token=${token}`;
}
