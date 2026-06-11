import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

export const ROLE_RANK: Record<Role, number> = {
  STAFF: 1,
  MANAGER: 2,
  ADMIN: 3,
  OWNER: 4,
};

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async findMyBusiness(userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { joinedAt: 'asc' },
      select: { organizationId: true, role: true },
    });
    if (!membership) return null;

    const business = await this.prisma.businessProfile.findFirst({
      where: { organizationId: membership.organizationId, isActive: true },
    });
    if (!business) return null;

    return { ...business, memberRole: membership.role };
  }

  async create(userId: string, dto: CreateBusinessDto) {
    const orgId = await this.resolveOrgId(userId);

    const existing = await this.prisma.businessProfile.findFirst({
      where: { organizationId: orgId, isActive: true },
    });
    if (existing) throw new ConflictException('Business profile already exists');

    const business = await this.prisma.businessProfile.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        type: dto.type,
        description: dto.description,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        currency: dto.currency ?? 'TZS',
      },
    });

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId: orgId, status: 'ACTIVE' },
      select: { role: true },
    });

    return { ...business, memberRole: membership?.role ?? 'OWNER' };
  }

  async update(userId: string, businessId: string, dto: UpdateBusinessDto) {
    await this.assertMinRole(userId, businessId, 'ADMIN');
    return this.prisma.businessProfile.update({
      where: { id: businessId },
      data: dto,
    });
  }

  async assertOwnership(userId: string, businessId: string) {
    const biz = await this.prisma.businessProfile.findFirst({
      where: {
        id: businessId,
        organization: { members: { some: { userId, status: 'ACTIVE' } } },
      },
    });
    if (!biz) throw new NotFoundException('Business not found');
    return biz;
  }

  async assertMinRole(userId: string, businessId: string, minRole: Role) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        organization: { businesses: { some: { id: businessId } } },
      },
      select: { role: true },
    });
    if (!membership) throw new NotFoundException('Business not found');
    if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private async resolveOrgId(userId: string): Promise<string> {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { joinedAt: 'asc' },
      select: { organizationId: true },
    });
    if (!membership) throw new ForbiddenException('No active organization');
    return membership.organizationId;
  }
}
