import { QueryCapabilityService } from './query-capability.service';

describe('QueryCapabilityService', () => {
  let capabilityService: QueryCapabilityService;

  beforeEach(() => {
    capabilityService = new QueryCapabilityService();
  });

  it('should map aggregate operation to VIEW_AGGREGATES permission', () => {
    expect(capabilityService.determineRequiredPermission('aggregate')).toBe('VIEW_AGGREGATES');
  });

  it('should map trend operation to VIEW_TRENDS permission', () => {
    expect(capabilityService.determineRequiredPermission('trend')).toBe('VIEW_TRENDS');
  });

  it('should map comparison operation to VIEW_COMPARISONS permission', () => {
    expect(capabilityService.determineRequiredPermission('comparison')).toBe('VIEW_COMPARISONS');
  });

  it('should map get_rows operation to VIEW_ENTITY_DETAILS permission', () => {
    expect(capabilityService.determineRequiredPermission('get_rows')).toBe('VIEW_ENTITY_DETAILS');
  });
});
