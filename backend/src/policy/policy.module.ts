import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PolicyService } from './policy.service';
import { CapabilityMapperService } from './capability-mapper.service';
import { FieldPolicyService } from './field-policy.service';
import { PolicyGuard } from './guards/policy.guard';

@Module({
  imports: [PrismaModule],
  providers: [
    PolicyService,
    CapabilityMapperService,
    FieldPolicyService,
    PolicyGuard,
  ],
  exports: [
    PolicyService,
    CapabilityMapperService,
    FieldPolicyService,
    PolicyGuard,
  ],
})
export class PolicyModule {}
