import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getSubscription(userId: string, orgId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId, status: 'ACTIVE' },
    });
    if (!membership) throw new ForbiddenException('Not a member of this organization');

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { plan: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const [userCount, businessCount] = await Promise.all([
      this.prisma.organizationMember.count({
        where: { organizationId: orgId, status: 'ACTIVE' },
      }),
      this.prisma.businessProfile.count({
        where: { organizationId: orgId, isActive: true },
      }),
    ]);

    return {
      plan: org.plan ?? null,
      usage: {
        users: userCount,
        businesses: businessCount,
      },
    };
  }
}
