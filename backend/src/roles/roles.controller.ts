import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(AuthenticatedGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all available roles and permissions' })
  async getAllRoles() {
    return this.rolesService.findAll();
  }
}
