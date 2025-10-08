// src/services/emailVerificationService.ts
import { supabase } from './supabase';

export interface VerificationCode {
  code: string;
  email: string;
  expiresAt: Date;
  attempts: number;
}

class EmailVerificationService {
  private static instance: EmailVerificationService;
  private codes = new Map<string, VerificationCode>();

  static getInstance(): EmailVerificationService {
    if (!EmailVerificationService.instance) {
      EmailVerificationService.instance = new EmailVerificationService();
    }
    return EmailVerificationService.instance;
  }

  /**
   * Generate a 6-digit verification code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send verification code via email
   */
  async sendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Clean up expired codes
      this.cleanupExpiredCodes();

      // Check if email already has a recent code
      const existingCode = this.codes.get(email);
      if (existingCode && existingCode.expiresAt > new Date()) {
        return { 
          success: false, 
          error: 'Verification code already sent. Please check your email or wait before requesting a new code.' 
        };
      }

      // Generate new code
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store code
      this.codes.set(email, {
        code,
        email,
        expiresAt,
        attempts: 0
      });

      // Send email via Supabase Edge Function (now uses Resend)
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: {
          email,
          code,
          expiresAt: expiresAt.toISOString()
        }
      });

      if (error) {
        console.error('Failed to send verification code:', error);
        this.codes.delete(email); // Remove stored code if email failed
        return { 
          success: false, 
          error: 'Failed to send verification code. Please try again.' 
        };
      }

      console.log('✅ Verification code sent to:', email);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending verification code:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      };
    }
  }

  /**
   * Verify the entered code
   */
  async verifyCode(email: string, enteredCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      const storedCode = this.codes.get(email);
      
      if (!storedCode) {
        return { 
          success: false, 
          error: 'No verification code found. Please request a new code.' 
        };
      }

      // Check if code is expired
      if (storedCode.expiresAt <= new Date()) {
        this.codes.delete(email);
        return { 
          success: false, 
          error: 'Verification code has expired. Please request a new code.' 
        };
      }

      // Check attempt limit
      if (storedCode.attempts >= 3) {
        this.codes.delete(email);
        return { 
          success: false, 
          error: 'Too many failed attempts. Please request a new code.' 
        };
      }

      // Verify code
      if (storedCode.code !== enteredCode) {
        storedCode.attempts++;
        return { 
          success: false, 
          error: `Invalid verification code. ${3 - storedCode.attempts} attempts remaining.` 
        };
      }

      // Code is valid - remove it
      this.codes.delete(email);
      console.log('✅ Verification code verified for:', email);
      return { success: true };
    } catch (error) {
      console.error('Error verifying code:', error);
      return { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      };
    }
  }

  /**
   * Check if email has a pending verification code
   */
  hasPendingCode(email: string): boolean {
    const code = this.codes.get(email);
    return code ? code.expiresAt > new Date() : false;
  }

  /**
   * Get remaining time for a verification code
   */
  getRemainingTime(email: string): number {
    const code = this.codes.get(email);
    if (!code || code.expiresAt <= new Date()) {
      return 0;
    }
    return Math.max(0, code.expiresAt.getTime() - Date.now());
  }

  /**
   * Clean up expired codes
   */
  private cleanupExpiredCodes(): void {
    const now = new Date();
    for (const [email, code] of this.codes.entries()) {
      if (code.expiresAt <= now) {
        this.codes.delete(email);
      }
    }
  }

  /**
   * Clear all codes (for testing)
   */
  clearAllCodes(): void {
    this.codes.clear();
  }
}

export const emailVerificationService = EmailVerificationService.getInstance();
