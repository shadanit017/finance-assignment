import { Injectable } from '@nestjs/common';
import { Capability, FieldCategory } from './policy.types';

@Injectable()
export class FieldPolicyService {
  /**
   * Public dimensions that are safe for aggregation & trend analysis across all roles.
   */
  public readonly PUBLIC_DIMENSIONS: readonly string[] = [
    'timestamp',
    'transaction_type',
    'channel',
    'merchant_category_code',
    'merchant_name',
    'location_lga',
    'location_state',
    'status',
  ];

  /**
   * Entity-level identifier fields that reference individual accounts, transactions, or users.
   * Access to these fields requires VIEW_ENTITY_DETAILS.
   */
  public readonly ENTITY_FIELDS: readonly string[] = [
    'transaction_id',
    'account_id',
    'customer_id',
    'device_id',
  ];

  /**
   * Numeric financial metrics/measures available for statistical aggregation.
   */
  public readonly FINANCIAL_MEASURES: readonly string[] = [
    'amount_ngn',
    'balance_before_ngn',
    'balance_after_ngn',
  ];

  /**
   * Potentially sensitive fields requiring explicit VIEW_SENSITIVE_FIELDS authorization.
   */
  public readonly SENSITIVE_FIELDS: readonly string[] = [
    'fraud_flag',
    'device_id',
  ];

  /**
   * Classify a field into its primary policy category.
   */
  getFieldCategory(field: string): FieldCategory {
    const lower = field.toLowerCase();
    if (this.SENSITIVE_FIELDS.includes(lower)) {
      return FieldCategory.SENSITIVE_FIELD;
    }
    if (this.ENTITY_FIELDS.includes(lower)) {
      return FieldCategory.ENTITY_IDENTIFIER;
    }
    if (this.FINANCIAL_MEASURES.includes(lower)) {
      return FieldCategory.FINANCIAL_MEASURE;
    }
    return FieldCategory.PUBLIC_DIMENSION;
  }

  /**
   * Determine any capabilities required specifically due to accessing a given field.
   */
  getRequiredCapabilitiesForField(field: string): Capability[] {
    const lower = field.toLowerCase();
    const capabilities: Capability[] = [];

    if (this.ENTITY_FIELDS.includes(lower)) {
      capabilities.push(Capability.VIEW_ENTITY_DETAILS);
    }

    if (this.SENSITIVE_FIELDS.includes(lower)) {
      capabilities.push(Capability.VIEW_SENSITIVE_FIELDS);
    }

    return capabilities;
  }

  /**
   * Evaluate a list of requested fields against user permissions.
   * Returns lists of allowed and denied fields.
   */
  evaluateFields(
    fields: string[],
    userPermissions: string[],
  ): { allowedFields: string[]; deniedFields: string[] } {
    const allowedFields: string[] = [];
    const deniedFields: string[] = [];

    for (const field of fields) {
      const requiredCaps = this.getRequiredCapabilitiesForField(field);
      const isAllowed = requiredCaps.every((cap) => userPermissions.includes(cap));

      if (isAllowed) {
        allowedFields.push(field);
      } else {
        deniedFields.push(field);
      }
    }

    return { allowedFields, deniedFields };
  }
}
