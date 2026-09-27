import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FinancialDataService } from './financial-data.service';

@ApiTags('Financial Data')
@Controller('financial-data')
export class FinancialDataController {
  constructor(private readonly financialDataService: FinancialDataService) {}
}

