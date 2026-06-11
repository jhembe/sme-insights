import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [BusinessesModule, AuditModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
