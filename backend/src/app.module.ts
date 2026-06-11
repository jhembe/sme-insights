import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BusinessesModule } from './businesses/businesses.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExpensesModule } from './expenses/expenses.module';
import { HealthController } from './health/health.controller';
import { ImportExportModule } from './import-export/import-export.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { SalesModule } from './sales/sales.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { TeamModule } from './team/team.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 10_000,  // 10 seconds
        limit: 60,    // 60 requests per 10s per IP — general API traffic
      },
      {
        name: 'auth',
        ttl: 60_000,  // 1 minute
        limit: 10,    // 10 requests per minute per IP — auth endpoints
      },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    BusinessesModule,
    ProductsModule,
    SalesModule,
    ExpensesModule,
    DashboardModule,
    ImportExportModule,
    TeamModule,
    SubscriptionModule,
    CustomersModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
