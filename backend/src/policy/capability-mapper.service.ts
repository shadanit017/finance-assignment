import { Injectable } from '@nestjs/common';
import { QueryPlan, QueryOperation } from '../ai/dto/query-plan.dto';
import { Capability } from './policy.types';
import { FieldPolicyService } from './field-policy.service';

@Injectable()
export class CapabilityMapperService {
  constructor(private readonly fieldPolicyService: FieldPolicyService) {}

  /**
   * Derive all required capabilities for a validated QueryPlan based on operation AND fields.
   * This logic is strictly backend-controlled; neither Gemini nor the frontend can supply capabilities.
   */
  deriveRequiredCapabilities(plan: QueryPlan): Capability[] {
    const capabilities = new Set<Capability>();

    // 1. Base capability derived from the QueryPlan operation type
    const baseCap = this.mapOperationToCapability(plan.operation);
    if (baseCap) {
      capabilities.add(baseCap);
    }

    // 2. Collect all fields referenced anywhere in the QueryPlan
    const referencedFields = this.extractReferencedFields(plan);

    // 3. Add capability requirements for each field
    for (const field of referencedFields) {
      const fieldCaps = this.fieldPolicyService.getRequiredCapabilitiesForField(field);
      for (const cap of fieldCaps) {
        capabilities.add(cap);
      }
    }

    return Array.from(capabilities);
  }

  /**
   * Map operation to its baseline capability requirement.
   */
  private mapOperationToCapability(operation: QueryOperation): Capability {
    switch (operation) {
      case 'aggregate':
        return Capability.VIEW_AGGREGATES;
      case 'trend':
        return Capability.VIEW_TRENDS;
      case 'comparison':
        return Capability.VIEW_COMPARISONS;
      case 'get_rows':
        return Capability.VIEW_ENTITY_DETAILS;
      default:
        return Capability.VIEW_AGGREGATES;
    }
  }

  /**
   * Extract all field names referenced in metricField, dimensions, and filters.
   */
  extractReferencedFields(plan: QueryPlan): string[] {
    const fields = new Set<string>();

    if (plan.metricField) {
      fields.add(plan.metricField);
    }

    if (plan.dimensions && Array.isArray(plan.dimensions)) {
      plan.dimensions.forEach((dim) => fields.add(dim));
    }

    if (plan.filters && typeof plan.filters === 'object') {
      Object.keys(plan.filters).forEach((field) => fields.add(field));
    }

    return Array.from(fields);
  }
}
