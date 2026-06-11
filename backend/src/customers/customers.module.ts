import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [BusinessesModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
