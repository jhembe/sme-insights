import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: parseInt(config.get('SMTP_PORT', '587'), 10),
      secure: false,
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
    });
  }

  async sendEmailVerification(to: string, firstName: string, verifyUrl: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get('SMTP_FROM', 'SME Insights <no-reply@mahembega.com>'),
        to,
        subject: 'Verify your SME Insights email',
        text: `Hi ${firstName},\n\nPlease verify your email address to unlock all features.\n\nVerification link (expires in 24 hours):\n${verifyUrl}\n\nIf you did not create this account, you can safely ignore this email.\n\n— SME Insights`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <p>Hi ${firstName},</p>
            <p>Thanks for signing up! Please verify your email address to unlock all features of SME Insights.</p>
            <p style="margin:24px 0">
              <a href="${verifyUrl}"
                style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                Verify my email
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px">This link expires in 24 hours. If you did not create this account, you can safely ignore this email.</p>
            <p style="color:#6b7280;font-size:13px">— SME Insights</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${to}`, err);
      throw err;
    }
  }

  async sendTeamInvite(
    to: string,
    firstName: string,
    tempPassword: string,
    businessName: string,
    loginUrl: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get('SMTP_FROM', 'SME Insights <no-reply@mahembega.com>'),
        to,
        subject: `You've been added to ${businessName} on SME Insights`,
        text: `Hi ${firstName},\n\nYou have been added as a team member of ${businessName} on SME Insights.\n\nYour login details:\nEmail: ${to}\nTemporary password: ${tempPassword}\n\nPlease sign in and change your password immediately:\n${loginUrl}\n\n— SME Insights`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <p>Hi ${firstName},</p>
            <p>You have been added as a team member of <strong>${businessName}</strong> on SME Insights.</p>
            <p>Your login details:</p>
            <table style="border-collapse:collapse;margin:12px 0">
              <tr>
                <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px">Email</td>
                <td style="padding:4px 0;font-weight:600">${to}</td>
              </tr>
              <tr>
                <td style="padding:4px 12px 4px 0;color:#6b7280;font-size:13px">Temporary password</td>
                <td style="padding:4px 0;font-family:monospace;font-weight:600;letter-spacing:1px">${tempPassword}</td>
              </tr>
            </table>
            <p style="margin:24px 0">
              <a href="${loginUrl}"
                style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                Sign in now
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px">Please change your password after signing in for the first time.</p>
            <p style="color:#6b7280;font-size:13px">— SME Insights</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send team invite email to ${to}`, err);
      throw err;
    }
  }

  async sendPasswordReset(to: string, firstName: string, resetUrl: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.get('SMTP_FROM', 'SME Insights <no-reply@mahembega.com>'),
        to,
        subject: 'Reset your SME Insights password',
        text: `Hi ${firstName},\n\nSomeone requested a password reset for your account.\n\nReset link (expires in 1 hour):\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\n— SME Insights`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <p>Hi ${firstName},</p>
            <p>Someone requested a password reset for your SME Insights account.</p>
            <p style="margin:24px 0">
              <a href="${resetUrl}"
                style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                Reset my password
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
            <p style="color:#6b7280;font-size:13px">— SME Insights</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${to}`, err);
      throw err;
    }
  }
}
