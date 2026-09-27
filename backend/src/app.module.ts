import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { PolicyModule } from './policy/policy.module';
import { AssistantModule } from './assistant/assistant.module';
import { FinancialDataModule } from './financial-data/financial-data.module';
import { AiModule } from './ai/ai.module';
import { QueryExecutionModule } from './query-execution/query-execution.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    PolicyModule,
    AssistantModule,
    FinancialDataModule,
    AiModule,
    QueryExecutionModule,
  ],
})
export class AppModule {}
