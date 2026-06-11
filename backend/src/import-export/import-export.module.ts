import { Module } from '@nestjs/common';
import { BusinessesModule } from '../businesses/businesses.module';
import { ImportExportController } from './import-export.controller';
import { ImportExportService } from './import-export.service';

@Module({
  imports: [BusinessesModule],
  controllers: [ImportExportController],
  providers: [ImportExportService],
})
export class ImportExportModule {}
