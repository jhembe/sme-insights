import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private service: BusinessesService) {}

  @Get('me')
  getMyBusiness(@CurrentUser() user: { id: string }) {
    return this.service.findMyBusiness(user.id);
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateBusinessDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.service.update(user.id, id, dto);
  }
}
