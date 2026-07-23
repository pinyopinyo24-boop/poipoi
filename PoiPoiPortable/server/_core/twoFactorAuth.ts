import crypto from 'crypto';

interface TOTP {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface SMSChallenge {
  sessionId: string;
  phoneNumber: string;
  code: string;
  expiresAt: number;
}

export class TwoFactorAuthManager {
  private smsChallenges: Map<string, SMSChallenge> = new Map();
  private userSecrets: Map<string, string> = new Map();
  private backupCodes: Map<string, Set<string>> = new Map();

  /**
   * Generate TOTP secret for user
   */
  generateTOTPSecret(userId: string): TOTP {
    const secret = crypto.randomBytes(32).toString('base64');
    const backupCodes = this.generateBackupCodes(10);

    this.userSecrets.set(userId, secret);
    this.backupCodes.set(userId, new Set(backupCodes));

    // Generate QR code URL (for authenticator apps)
    const qrCodeUrl = `otpauth://totp/PoiPoi:${userId}?secret=${secret}&issuer=PoiPoi`;

    return {
      secret,
      qrCode: qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP code
   */
  verifyTOTPCode(userId: string, code: string): boolean {
    const secret = this.userSecrets.get(userId);
    if (!secret) return false;

    // Simplified TOTP verification (in production, use speakeasy or similar)
    const timeWindow = 30; // seconds
    const currentTime = Math.floor(Date.now() / 1000 / timeWindow);
    const codeInt = parseInt(code, 10);

    // Check current and previous time windows for tolerance
    for (let i = -1; i <= 1; i++) {
      const time = currentTime + i;
      // Simplified hash (in production, use proper HMAC-SHA1)
      const hash = crypto
        .createHmac('sha1', Buffer.from(secret, 'base64'))
        .update(Buffer.from(time.toString()))
        .digest();
      const offset = hash[hash.length - 1] & 0xf;
      const otp = (((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff)) % 1000000;

      if (otp === codeInt) return true;
    }

    return false;
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Verify backup code (one-time use)
   */
  verifyBackupCode(userId: string, code: string): boolean {
    const codes = this.backupCodes.get(userId);
    if (!codes || !codes.has(code)) return false;

    codes.delete(code);
    return true;
  }

  /**
   * Send SMS challenge
   */
  async sendSMSChallenge(userId: string, phoneNumber: string): Promise<string> {
    const code = crypto.randomInt(100000, 999999).toString();
    const sessionId = crypto.randomBytes(16).toString('hex');

    const challenge: SMSChallenge = {
      sessionId,
      phoneNumber,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    this.smsChallenges.set(sessionId, challenge);

    // Send via SMS provider (Twilio)
    try {
      const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        // Use Twilio SDK for real SMS delivery
        try {
          const twilio = require('twilio');
          const client = twilio(twilioAccountSid, twilioAuthToken);

          await client.messages.create({
            body: `Your PoiPoi 2FA code is: ${code}. Valid for 5 minutes.`,
            from: twilioPhoneNumber,
            to: phoneNumber,
          });
        } catch (twilioError) {
          console.error('Twilio SMS delivery failed:', twilioError);
          // Fallback to console log for development
          console.log(`[DEV] SMS Code for ${phoneNumber}: ${code}`);
        }
      } else {
        // Fallback: log for development
        console.log(`[DEV] SMS Code for ${phoneNumber}: ${code}`);
      }
    } catch (error) {
      console.error('SMS challenge error:', error);
      throw new Error('Failed to send SMS code');
    }

    return sessionId;
  }

  /**
   * Verify SMS code
   */
  verifySMSCode(sessionId: string, code: string): boolean {
    const challenge = this.smsChallenges.get(sessionId);
    if (!challenge) return false;

    if (Date.now() > challenge.expiresAt) {
      this.smsChallenges.delete(sessionId);
      return false;
    }

    if (challenge.code !== code) return false;

    this.smsChallenges.delete(sessionId);
    return true;
  }

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes(userId: string): string[] {
    const newCodes = this.generateBackupCodes(10);
    this.backupCodes.set(userId, new Set(newCodes));
    return newCodes;
  }

  /**
   * Get remaining backup codes count
   */
  getBackupCodesCount(userId: string): number {
    return this.backupCodes.get(userId)?.size || 0;
  }
}

export const twoFactorAuthManager = new TwoFactorAuthManager();
