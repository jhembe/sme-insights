import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const slug = this.slugify(dto.organizationName);
    const slugExists = await this.prisma.organization.findUnique({ where: { slug } });
    const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

    const hashed = await bcrypt.hash(dto.password, 12);

    const verificationToken = randomBytes(32).toString('hex');
    const hashedVerificationToken = await bcrypt.hash(verificationToken, 10);
    const verificationExpiresAt = new Date(Date.now() + 24 * 3_600_000);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        emailVerificationToken: hashedVerificationToken,
        emailVerificationExpiresAt: verificationExpiresAt,
        memberships: {
          create: {
            role: 'OWNER',
            status: 'ACTIVE',
            organization: {
              create: {
                name: dto.organizationName,
                slug: finalSlug,
                planId: 'free',
              },
            },
          },
        },
      },
      select: { id: true, email: true, firstName: true, lastName: true, isVerified: true },
    });

    const frontendUrl = this.config.get('FRONTEND_URL', 'https://sme.mahembega.com');
    const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(dto.email)}`;
    this.mail.sendEmailVerification(dto.email, dto.firstName, verifyUrl).catch((err) =>
      this.logger.warn(`Could not send verification email to ${dto.email}: ${err?.message}`),
    );

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, firstName: true, lastName: true, isVerified: true, password: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(dto.password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
      },
      ...tokens,
    };
  }

  async logout(userId: string) {
    await this.prisma.userSession.deleteMany({ where: { userId } });
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const sessions = await this.prisma.userSession.findMany({ where: { userId } });
    if (sessions.length === 0) throw new ForbiddenException('Access denied');

    let matched: (typeof sessions)[0] | null = null;
    for (const session of sessions) {
      if (session.expiresAt < new Date()) {
        await this.prisma.userSession.delete({ where: { id: session.id } });
        continue;
      }
      if (await bcrypt.compare(refreshToken, session.hashedToken)) {
        matched = session;
        break;
      }
    }
    if (!matched) throw new ForbiddenException('Access denied');

    await this.prisma.userSession.delete({ where: { id: matched.id } });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Access denied');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.createSession(user.id, tokens.refreshToken);
    return tokens;
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        preferredLanguage: true,
        isVerified: true,
        createdAt: true,
        memberships: {
          where: { status: 'ACTIVE' },
          select: {
            role: true,
            joinedAt: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                country: true,
                defaultLanguage: true,
                businesses: {
                  where: { isActive: true },
                  select: { id: true, name: true, type: true, currency: true },
                },
              },
            },
          },
        },
      },
    });
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow('JWT_ACCESS_EXPIRES'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow('JWT_REFRESH_EXPIRES'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async createSession(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 3_600_000);
    await this.prisma.userSession.create({ data: { userId, hashedToken: hashed, expiresAt } });
  }

  async verifyEmail(email: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.emailVerificationToken || !user.emailVerificationExpiresAt) {
      throw new BadRequestException('Invalid or expired verification link');
    }
    if (user.isVerified) {
      return { message: 'Email already verified.' };
    }
    if (user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('Verification link has expired. Please request a new one.');
    }
    const match = await bcrypt.compare(token, user.emailVerificationToken);
    if (!match) throw new BadRequestException('Invalid or expired verification link');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, emailVerificationToken: null, emailVerificationExpiresAt: null },
    });
    return { message: 'Email verified successfully.' };
  }

  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.isVerified) return { message: 'Email is already verified.' };

    const token = randomBytes(32).toString('hex');
    const hashed = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 24 * 3_600_000);

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerificationToken: hashed, emailVerificationExpiresAt: expiresAt },
    });

    const frontendUrl = this.config.get('FRONTEND_URL', 'https://sme.mahembega.com');
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`;
    await this.mail.sendEmailVerification(user.email, user.firstName, verifyUrl);
    return { message: 'Verification email sent.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    await this.prisma.userSession.deleteMany({ where: { userId } });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = randomBytes(32).toString('hex');
      const hashed = await bcrypt.hash(token, 10);
      const expiresAt = new Date(Date.now() + 3_600_000);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: hashed, passwordResetExpiresAt: expiresAt },
      });

      const frontendUrl = this.config.get('FRONTEND_URL', 'https://sme.mahembega.com');
      const resetUrl = `${frontendUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      await this.mail.sendPasswordReset(user.email, user.firstName, resetUrl);
    }
    return { message: 'If that email is registered, a reset link has been sent.' };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordResetToken || !user.passwordResetExpiresAt) {
      throw new BadRequestException('Invalid or expired reset link');
    }
    if (user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Reset link has expired. Please request a new one.');
    }
    const match = await bcrypt.compare(token, user.passwordResetToken);
    if (!match) throw new BadRequestException('Invalid or expired reset link');

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, passwordResetToken: null, passwordResetExpiresAt: null },
    });
    return { message: 'Password has been reset. You can now sign in.' };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
