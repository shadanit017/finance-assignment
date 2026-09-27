import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryPlan } from '../ai/dto/query-plan.dto';
import { Capability, AuthorizationResult, UserAuthContext } from './policy.types';
import { CapabilityMapperService } from './capability-mapper.service';
import { FieldPolicyService } from './field-policy.service';

@Injectable()
export class PolicyService {
  private readonly logger = new Logger(PolicyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly capabilityMapper: CapabilityMapperService,
    private readonly fieldPolicy: FieldPolicyService,
  ) {}

  /**
   * Load user's role and assigned permissions directly from the database.
   * Neither frontend nor LLM is trusted for user role/permission definitions.
   */
  async getUserPermissionsFromDb(userId: string): Promise<UserAuthContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.role) {
      throw new ForbiddenException('User authentication record or assigned role not found.');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.name);

    return {
      userId: user.id,
      email: user.email,
      roleName: user.role.name,
      permissions,
    };
  }

  /**
   * Check whether a given user possesses a specific capability/permission in the database.
   */
  async can(userId: string, capability: Capability | string): Promise<boolean> {
    try {
      const userCtx = await this.getUserPermissionsFromDb(userId);
      return userCtx.permissions.includes(capability);
    } catch {
      return false;
    }
  }

  /**
   * Evaluates a QueryPlan against user permissions and field restrictions.
   * Accepts a userId string, a UserAuthContext object, or an array of permissions strings.
   */
  async authorizeQuery(
    subject: string | UserAuthContext | string[],
    queryPlan: QueryPlan,
  ): Promise<AuthorizationResult> {
    let permissions: string[] = [];
    let roleName = 'Unknown';

    if (typeof subject === 'string') {
      const dbUserCtx = await this.getUserPermissionsFromDb(subject);
      permissions = dbUserCtx.permissions;
      roleName = dbUserCtx.roleName;
    } else if (Array.isArray(subject)) {
      permissions = subject;
    } else if (subject && Array.isArray(subject.permissions)) {
      permissions = subject.permissions;
      roleName = subject.roleName || 'Unknown';
    }

    // 1. Determine all required capabilities (operation + field-level requirements)
    const requiredCapabilities = this.capabilityMapper.deriveRequiredCapabilities(queryPlan);

    // 2. Identify capabilities missing for this user
    const deniedCapabilities = requiredCapabilities.filter(
      (cap) => !permissions.includes(cap),
    );

    // 3. Extract and evaluate all fields in QueryPlan
    const referencedFields = this.capabilityMapper.extractReferencedFields(queryPlan);
    const { allowedFields, deniedFields } = this.fieldPolicy.evaluateFields(
      referencedFields,
      permissions,
    );

    const isAllowed = deniedCapabilities.length === 0 && deniedFields.length === 0;

    let reason: string | undefined;
    if (!isAllowed) {
      if (deniedCapabilities.includes(Capability.VIEW_ENTITY_DETAILS)) {
        reason = `Cannot access entity-level financial data or individual records.`;
      } else if (deniedCapabilities.includes(Capability.VIEW_SENSITIVE_FIELDS)) {
        reason = `Not authorized to query sensitive fields [${deniedFields.join(', ')}].`;
      } else if (deniedCapabilities.length > 0) {
        reason = `Lacks required capability [${deniedCapabilities.join(', ')}].`;
      } else if (deniedFields.length > 0) {
        reason = `Restricted from accessing field(s): [${deniedFields.join(', ')}].`;
      }
    }

    return {
      allowed: isAllowed,
      requiredCapabilities,
      deniedCapabilities,
      allowedFields,
      deniedFields,
      reason,
    };
  }

  /**
   * Performs authorization check and throws HTTP 403 Forbidden on failure.
   */
  async enforceQueryPolicy(
    subject: string | UserAuthContext | string[],
    queryPlan: QueryPlan,
  ): Promise<AuthorizationResult> {
    const result = await this.authorizeQuery(subject, queryPlan);

    if (!result.allowed) {
      this.logger.warn(`QueryPlan authorization DENIED: ${result.reason}`);
      throw new ForbiddenException(
        result.reason || 'You are not authorized to perform this type of financial analysis.',
      );
    }

    return result;
  }
}
