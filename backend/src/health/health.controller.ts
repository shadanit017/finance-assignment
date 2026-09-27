import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check application server health' })
  @ApiResponse({ status: 200, description: 'Application server is operational' })
  checkAppHealth() {
    return this.healthService.getAppHealth();
  }

  @Get('database')
  @ApiOperation({ summary: 'Check PostgreSQL database connectivity' })
  @ApiResponse({ status: 200, description: 'PostgreSQL connection is healthy' })
  checkDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }
}
