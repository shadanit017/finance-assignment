import { Injectable } from '@nestjs/common';
import { QueryOperation } from './dto/query-plan.dto';

@Injectable()
export class QueryCapabilityService {
  /**
   * Derive the required RBAC permission for a validated query operation.
   * This capability is computed strictly by backend logic, never derived from or trusted from the LLM.
   */
  determineRequiredPermission(operation: QueryOperation): string {
    switch (operation) {
      case 'aggregate':
        return 'VIEW_AGGREGATES';
      case 'trend':
        return 'VIEW_TRENDS';
      case 'comparison':
        return 'VIEW_COMPARISONS';
      case 'get_rows':
        return 'VIEW_ENTITY_DETAILS';
      default:
        return 'VIEW_AGGREGATES';
    }
  }
}
