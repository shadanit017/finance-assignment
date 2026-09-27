import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Capability } from '../policy.types';
import { CAPABILITIES_KEY } from '../decorators/require-capability.decorator';
import { PolicyService } from '../policy.service';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyService: PolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapabilities = this.reflector.getAllAndOverride<Capability[]>(
      CAPABILITIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required to perform this action.');
    }

    // Evaluate required capabilities against authenticated user
    if (user.id) {
      for (const cap of requiredCapabilities) {
        const hasCap = await this.policyService.can(user.id, cap);
        if (!hasCap) {
          throw new ForbiddenException(
            `Access denied: Your role is not authorized for capability [${cap}].`,
          );
        }
      }
      return true;
    }

    // Fallback: evaluate permissions array attached to user request context
    const userPermissions: string[] = user.permissions || [];
    for (const cap of requiredCapabilities) {
      if (!userPermissions.includes(cap)) {
        throw new ForbiddenException(
          `Access denied: Your role lacks required capability [${cap}].`,
        );
      }
    }

    return true;
  }
}
