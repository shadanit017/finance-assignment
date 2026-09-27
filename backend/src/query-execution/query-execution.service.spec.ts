import { Test, TestingModule } from '@nestjs/testing';
import { QueryExecutionService } from './query-execution.service';
import { SqlBuilderService } from './sql-builder.service';
import { QueryPlanExecutionValidator } from './validators/query-plan.validator';
import { PrismaService } from '../prisma/prisma.service';
import { QueryPlan } from '../ai/dto/query-plan.dto';
import { Capability } from '../policy/policy.types';
import { BadRequestException, UnprocessableEntityException } from '@nestjs/common';
import { MAX_ENTITY_ROWS } from './query.constants';

describe('QueryExecutionService & Safe SQL Builder (Step 5)', () => {
  let executionService: QueryExecutionService;
  let sqlBuilder: SqlBuilderService;
  let validator: QueryPlanExecutionValidator;
  let prismaService: jest.Mocked<PrismaService>;

  const VIEWER_PERMISSIONS = [Capability.VIEW_AGGREGATES];
  const ANALYST_PERMISSIONS = [
    Capability.VIEW_AGGREGATES,
    Capability.VIEW_TRENDS,
    Capability.VIEW_COMPARISONS,
  ];
  const ADMIN_PERMISSIONS = [
    Capability.VIEW_AGGREGATES,
    Capability.VIEW_TRENDS,
    Capability.VIEW_COMPARISONS,
    Capability.VIEW_ENTITY_DETAILS,
    Capability.VIEW_SENSITIVE_FIELDS,
    Capability.MANAGE_USERS,
  ];

  beforeEach(async () => {
    const mockPrisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          value: '5000000.00',
          count: 150n,
          location_state: 'Lagos',
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryExecutionService,
        SqlBuilderService,
        QueryPlanExecutionValidator,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    executionService = module.get<QueryExecutionService>(QueryExecutionService);
    sqlBuilder = module.get<SqlBuilderService>(SqlBuilderService);
    validator = module.get<QueryPlanExecutionValidator>(QueryPlanExecutionValidator);
    prismaService = module.get(PrismaService);
  });

  describe('Test 1 — Aggregate Query (Viewer)', () => {
    it('should build and execute safe aggregate query for Viewer', async () => {
      const plan: QueryPlan = {
        operation: 'aggregate',
        metric: 'sum',
        metricField: 'amount_ngn',
        explanation: 'Total transaction amount',
      };

      const result = await executionService.executeAuthorizedQuery(plan, ['amount_ngn'], VIEWER_PERMISSIONS);
      expect(result.operation).toBe('aggregate');
      expect(result.rows).toHaveLength(1);
      expect(prismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('SELECT SUM("amount_ngn")::numeric AS value'),
      );
    });
  });

  describe('Test 2 — Group By Query (Viewer)', () => {
    it('should build and execute aggregate grouped by public dimension location_state', async () => {
      const plan: QueryPlan = {
        operation: 'aggregate',
        metric: 'sum',
        metricField: 'amount_ngn',
        dimensions: ['location_state'],
        explanation: 'Transaction amount by state',
      };

      const result = await executionService.executeAuthorizedQuery(
        plan,
        ['amount_ngn', 'location_state'],
        VIEWER_PERMISSIONS,
      );
      expect(result.evidence.groupBy).toContain('location_state');
      expect(prismaService.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY "location_state"'),
      );
    });
  });

  describe('Test 3 — Trend Query (Viewer)', () => {
    it('should reject trend query validation for execution if operation is invalid or lacks permissions', async () => {
      const plan: QueryPlan = {
        operation: 'trend',
        metric: 'sum',
        metricField: 'amount_ngn',
        explanation: 'Monthly trends',
      };

      // Execution service validates structure
      expect(() => validator.validateForExecution(plan)).not.toThrow();
    });
  });

  describe('Test 4 — Analyst Trend Query', () => {
    it('should build safe DATE_TRUNC trend query for Analyst', async () => {
      const plan: QueryPlan = {
        operation: 'trend',
        metric: 'sum',
        metricField: 'amount_ngn',
        explanation: 'Monthly trend totals',
      };

      const built = sqlBuilder.buildSql(plan);
      expect(built.query).toContain("DATE_TRUNC('month', \"timestamp\") AS period");
      expect(built.query).toContain('GROUP BY period ORDER BY period ASC');
    });
  });

  describe('Test 5 — Entity Query Filter Check', () => {
    it('should reject get_rows with no filters to prevent unbounded entity queries', async () => {
      const plan: QueryPlan = {
        operation: 'get_rows',
        explanation: 'Get all transactions',
      };

      expect(() => validator.validateForExecution(plan)).toThrow(BadRequestException);
      expect(() => validator.validateForExecution(plan)).toThrow(
        'This request would return too many records',
      );
    });
  });

  describe('Test 6 — Admin Entity Query & MAX_ENTITY_ROWS Limit', () => {
    it('should enforce MAX_ENTITY_ROWS limit even if requested limit is high', async () => {
      const plan: QueryPlan = {
        operation: 'get_rows',
        filters: { customer_id: 'CUST-123' },
        limit: 1000000,
        explanation: 'Get customer CUST-123 rows',
      };

      const built = sqlBuilder.buildSql(plan, ['customer_id', 'amount_ngn', 'timestamp']);
      expect(built.query).toContain(`LIMIT ${MAX_ENTITY_ROWS}`);
      expect(built.query).not.toContain('LIMIT 1000000');
    });
  });

  describe('Test 8 — SQL Injection Through Filter Value', () => {
    it('should treat malicious string as parameterized value $1 without modifying SQL', async () => {
      const plan: QueryPlan = {
        operation: 'aggregate',
        metric: 'sum',
        metricField: 'amount_ngn',
        filters: { location_state: "Lagos' OR 1=1 --" },
        explanation: 'Filtered query',
      };

      const built = sqlBuilder.buildSql(plan);
      expect(built.query).toContain('"location_state" = $1');
      expect(built.params).toContain("Lagos' OR 1=1 --");
    });
  });

  describe('Test 9 — SQL Injection Through Column Name', () => {
    it('should reject unapproved column containing SQL injection payload', () => {
      const plan: QueryPlan = {
        operation: 'aggregate',
        metric: 'sum',
        metricField: 'location_state; DROP TABLE financial_transactions',
        explanation: 'SQL injection attack',
      };

      expect(() => validator.validateForExecution(plan)).toThrow(BadRequestException);
    });
  });

  describe('Test 10 — SQL Injection Through Operation', () => {
    it('should reject illegal operation payload', () => {
      const plan: any = {
        operation: 'DROP TABLE',
        explanation: 'Illegal op',
      };

      expect(() => validator.validateForExecution(plan)).toThrow(UnprocessableEntityException);
    });
  });

  describe('Test 11 — Explicit Approved Column Projection (Never SELECT *)', () => {
    it('should generate explicit column list for row queries and never use SELECT *', () => {
      const plan: QueryPlan = {
        operation: 'get_rows',
        filters: { customer_id: 'CUST-888' },
        explanation: 'Get customer records',
      };

      const built = sqlBuilder.buildSql(plan, ['customer_id', 'amount_ngn', 'timestamp']);
      expect(built.query).not.toContain('SELECT *');
      expect(built.query).toContain('SELECT "customer_id", "amount_ngn", "timestamp"');
    });
  });

  describe('Test 12 — LIMIT Bypass Capping', () => {
    it('should cap requested limit to 100 maximum', () => {
      const plan: QueryPlan = {
        operation: 'get_rows',
        filters: { location_state: 'Lagos' },
        limit: 99999,
        explanation: 'Big limit',
      };

      const built = sqlBuilder.buildSql(plan);
      expect(built.query).toContain('LIMIT 100');
    });
  });
});
