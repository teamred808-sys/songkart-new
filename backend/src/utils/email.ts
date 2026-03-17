import { Resend } from 'resend';
import * as jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@songkart.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://songkart.com';

export interface VerificationEmailData {
  email: string;
  userId: string;
  name?: string | undefined;
}

export function generateVerificationToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'email_verification' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyVerificationToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'email_verification') {
      return null;
    }
    return { userId: decoded.userId };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function sendVerificationEmail(data: VerificationEmailData): Promise<boolean> {
  try {
    const token = generateVerificationToken(data.userId);
    const verificationLink = `${FRONTEND_URL}/verify-email?token=${token}`;
    
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: data.email,
      subject: 'Verify your SongKart account',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🎵 SongKart</h1>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                          Verify Your Email Address
                        </h2>
                        
                        <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                          ${data.name ? `Hi ${data.name},` : 'Hello,'}
                        </p>
                        
                        <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                          Thanks for signing up for SongKart! To unlock unlimited uploads and start selling your music, please verify your email address by clicking the button below.
                        </p>
                        
                        <!-- CTA Button -->
                        <table role="presentation" style="margin: 30px 0;">
                          <tr>
                            <td align="center">
                              <a href="${verificationLink}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                                Verify Email Address
                              </a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 20px 0 0; color: #718096; font-size: 14px; line-height: 1.6;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="margin: 10px 0 0; color: #667eea; font-size: 14px; word-break: break-all;">
                          ${verificationLink}
                        </p>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
                        
                        <p style="margin: 0; color: #a0aec0; font-size: 13px; line-height: 1.6;">
                          This verification link will expire in 24 hours. If you didn't create a SongKart account, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 40px; background-color: #f7fafc; border-radius: 0 0 8px 8px; text-align: center;">
                        <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                          © ${new Date().getFullYear()} SongKart. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    console.log('Verification email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}
