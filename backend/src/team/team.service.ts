import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { ROLE_RANK } from '../businesses/businesses.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private audit: AuditService,
  ) {}

  async listMembers(requesterId: string, orgId: string) {
    await this.assertOrgMinRole(requesterId, orgId, 'ADMIN');
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async addMember(requesterId: string, orgId: string, dto: AddMemberDto) {
    const requesterRole = await this.assertOrgMinRole(requesterId, orgId, 'ADMIN');

    if (requesterRole === 'ADMIN' && dto.role === 'ADMIN') {
      throw new ForbiddenException('Admins cannot create other admins');
    }

    // Enforce plan user limit
    const [activeCount, orgWithPlan] = await Promise.all([
      this.prisma.organizationMember.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
      this.prisma.organization.findUnique({ where: { id: orgId }, include: { plan: true } }),
    ]);
    const maxUsers = orgWithPlan?.plan?.maxUsers ?? 3;
    if (activeCount >= maxUsers) {
      throw new ForbiddenException(`Your plan allows up to ${maxUsers} team members. Upgrade to add more.`);
    }

    let user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    let tempPassword: string | undefined;

    if (!user) {
      tempPassword = this.generateTempPassword();
      const hashed = await bcrypt.hash(tempPassword, 12);
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          password: hashed,
        },
      });
    } else {
      const existing = await this.prisma.organizationMember.findFirst({
        where: { userId: user.id, organizationId: orgId },
      });
      if (existing) {
        throw new ConflictException('This user is already a member of your organization');
      }
    }

    const [member, org] = await Promise.all([
      this.prisma.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: orgId,
          role: dto.role as Role,
          status: 'ACTIVE',
        },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.organization.findUnique({
        where: { id: orgId },
        include: { businesses: { where: { isActive: true }, select: { id: true, name: true }, take: 1 } },
      }),
    ]);

    if (tempPassword) {
      const businessName = org?.businesses[0]?.name ?? org?.name ?? 'your team';
      const loginUrl = `${process.env.FRONTEND_URL ?? 'https://sme.mahembega.com'}/login`;
      this.mail
        .sendTeamInvite(dto.email, dto.firstName, tempPassword, businessName, loginUrl)
        .catch((err) => this.logger.warn(`Could not send team invite to ${dto.email}: ${err?.message}`));
    }

    if (org?.businesses[0]?.id) {
      this.audit.log({
        businessId: org.businesses[0].id, userId: requesterId, action: 'MEMBER_ADDED',
        entityType: 'OrganizationMember', entityId: member.id,
        meta: { email: dto.email, role: dto.role },
      });
    }

    return { member, tempPassword };
  }

  async updateMember(
    requesterId: string,
    orgId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ) {
    const requesterRole = await this.assertOrgMinRole(requesterId, orgId, 'ADMIN');

    const target = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.userId === requesterId) throw new ForbiddenException('Cannot modify your own membership');
    if (target.role === 'OWNER') throw new ForbiddenException('Cannot modify the owner');
    if (requesterRole === 'ADMIN' && target.role === 'ADMIN') {
      throw new ForbiddenException('Admins cannot modify other admins');
    }

    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: {
        ...(dto.role && { role: dto.role as Role }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  async removeMember(requesterId: string, orgId: string, memberId: string) {
    const requesterRole = await this.assertOrgMinRole(requesterId, orgId, 'ADMIN');

    const target = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: orgId },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.userId === requesterId) throw new ForbiddenException('Cannot remove yourself');
    if (target.role === 'OWNER') throw new ForbiddenException('Cannot remove the owner');
    if (requesterRole === 'ADMIN' && target.role === 'ADMIN') {
      throw new ForbiddenException('Admins cannot remove other admins');
    }

    await this.prisma.organizationMember.delete({ where: { id: memberId } });

    const business = await this.prisma.businessProfile.findFirst({
      where: { organizationId: orgId, isActive: true }, select: { id: true },
    });
    if (business) {
      this.audit.log({
        businessId: business.id, userId: requesterId, action: 'MEMBER_REMOVED',
        entityType: 'OrganizationMember', entityId: memberId,
        meta: { removedUserId: target.userId, role: target.role },
      });
    }
  }

  private async assertOrgMinRole(userId: string, orgId: string, minRole: Role): Promise<Role> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId, status: 'ACTIVE' },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException('Organization not found');
    if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return membership.role;
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
