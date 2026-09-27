export enum QueryOperation {
  AGGREGATE = 'aggregate',
  TREND = 'trend',
  COMPARISON = 'comparison',
  GET_ROWS = 'get_rows',
}

export enum AggregateFunction {
  COUNT = 'count',
  SUM = 'sum',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in';

export interface QueryFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface ColumnConfig {
  sensitive: boolean;
  entityLevel: boolean;
  type: 'string' | 'decimal' | 'datetime' | 'boolean';
}

export interface QueryExecutionEvidence {
  queryType: string;
  filters: Record<string, unknown>[];
  groupBy?: string[];
  aggregate?: string;
  timeGrain?: string;
  sourceTable: string;
  returnedRows: number;
}

export interface QueryExecutionResult {
  operation: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  evidence: QueryExecutionEvidence;
}

export interface BuiltQuery {
  query: string;
  params: unknown[];
  displaySql: string;
}
