export enum Capability {
  VIEW_AGGREGATES = 'VIEW_AGGREGATES',
  VIEW_TRENDS = 'VIEW_TRENDS',
  VIEW_COMPARISONS = 'VIEW_COMPARISONS',
  VIEW_ENTITY_DETAILS = 'VIEW_ENTITY_DETAILS',
  VIEW_SENSITIVE_FIELDS = 'VIEW_SENSITIVE_FIELDS',
  MANAGE_USERS = 'MANAGE_USERS',
}

export enum FieldCategory {
  PUBLIC_DIMENSION = 'PUBLIC_DIMENSION',
  ENTITY_IDENTIFIER = 'ENTITY_IDENTIFIER',
  FINANCIAL_MEASURE = 'FINANCIAL_MEASURE',
  SENSITIVE_FIELD = 'SENSITIVE_FIELD',
}

export interface AuthorizationResult {
  allowed: boolean;
  requiredCapabilities: Capability[];
  deniedCapabilities: Capability[];
  allowedFields: string[];
  deniedFields: string[];
  reason?: string;
}

export interface UserAuthContext {
  userId?: string;
  email?: string;
  roleName: string;
  permissions: string[];
}
