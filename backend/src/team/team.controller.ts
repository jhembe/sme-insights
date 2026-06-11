import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TeamService } from './team.service';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId')
export class TeamController {
  constructor(private team: TeamService) {}

  @Get('members')
  listMembers(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
  ) {
    return this.team.listMembers(userId, orgId);
  }

  @Post('members')
  addMember(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.team.addMember(userId, orgId, dto);
  }

  @Patch('members/:memberId')
  updateMember(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.team.updateMember(userId, orgId, memberId, dto);
  }

  @Delete('members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @CurrentUser('id') userId: string,
    @Param('orgId') orgId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.team.removeMember(userId, orgId, memberId);
  }
}
