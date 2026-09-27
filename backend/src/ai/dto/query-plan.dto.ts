export type QueryOperation =
  | 'aggregate'
  | 'trend'
  | 'comparison'
  | 'segmentation'
  | 'get_rows'
  | 'conversational';

export type QueryMetric =
  | 'sum'
  | 'avg'
  | 'count'
  | 'min'
  | 'max';

export interface DateRange {
  from?: string;
  to?: string;
}

export interface QueryPlan {
  operation: QueryOperation;
  metric?: QueryMetric;
  metricField?: string;
  dimensions?: string[];
  filters?: Record<string, any>;
  dateRange?: DateRange;
  limit?: number;
  explanation: string;
}
