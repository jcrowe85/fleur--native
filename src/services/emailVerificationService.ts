// src/services/emailVerificationService.ts
import { supabase } from './supabase';

/**
 * Email verification, driven entirely by the `send-verification-code` Edge
 * Function.
 *
 * The previous implementation generated the code in the app, kept it in an
 * in-memory Map, and passed it to the function to be mailed. That meant the
 * "verification" checked a value the client itself had chosen (no security
 * value at all), the function was an unauthenticated open relay on our sending
 * domain, and the code was lost whenever the OS reclaimed the JS context — so
 * a user who checked their mail app could come back unable to verify.
 */

type Result = { success: boolean; error?: string };

async function callVerificationFunction(
  body: Record<string, unknown>
): Promise<Result & { data?: any }> {
  const { data, error } = await supabase.functions.invoke('send-verification-code', {
    body,
  });

  if (error) {
    // FunctionsHttpError carries the function's JSON body on `context`.
    let message = 'Something went wrong. Please try again.';
    try {
      const payload = await (error as any).context?.json?.();
      if (typeof payload?.error === 'string') message = payload.error;
    } catch {
      // Keep the generic message.
    }
    return { success: false, error: message };
  }

  if (data?.error) return { success: false, error: data.error };
  return { success: true, data };
}

class EmailVerificationService {
  private static instance: EmailVerificationService;

  /** Local echo of the server cooldown, so the UI can disable "Resend". */
  private lastSentAt = new Map<string, number>();
  private static readonly COOLDOWN_MS = 60_000;

  static getInstance(): EmailVerificationService {
    if (!EmailVerificationService.instance) {
      EmailVerificationService.instance = new EmailVerificationService();
    }
    return EmailVerificationService.instance;
  }

  async sendVerificationCode(email: string): Promise<Result> {
    const normalized = email.trim().toLowerCase();

    const result = await callVerificationFunction({ action: 'send', email: normalized });
    if (result.success) this.lastSentAt.set(normalized, Date.now());

    return { success: result.success, error: result.error };
  }

  async verifyCode(email: string, enteredCode: string): Promise<Result> {
    const normalized = email.trim().toLowerCase();

    const result = await callVerificationFunction({
      action: 'verify',
      email: normalized,
      code: enteredCode.trim(),
    });

    if (result.success) this.lastSentAt.delete(normalized);
    return { success: result.success, error: result.error };
  }

  /** Milliseconds until this address may request another code. */
  getResendCooldownRemaining(email: string): number {
    const sentAt = this.lastSentAt.get(email.trim().toLowerCase());
    if (!sentAt) return 0;
    return Math.max(0, EmailVerificationService.COOLDOWN_MS - (Date.now() - sentAt));
  }

  hasPendingCode(email: string): boolean {
    return this.lastSentAt.has(email.trim().toLowerCase());
  }

  clearAllCodes(): void {
    this.lastSentAt.clear();
  }
}

export const emailVerificationService = EmailVerificationService.getInstance();
