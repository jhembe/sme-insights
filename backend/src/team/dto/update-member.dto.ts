import { IsEnum, IsOptional } from 'class-validator';
import { Role, MemberStatus } from '@prisma/client';

export class UpdateMemberDto {
  @IsOptional()
  @IsEnum(['STAFF', 'MANAGER', 'ADMIN'])
  role?: Exclude<Role, 'OWNER'>;

  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;
}
