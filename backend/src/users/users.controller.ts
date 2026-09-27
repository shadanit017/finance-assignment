import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthenticatedGuard, AdminGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List non-admin users with pagination and search (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'john' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of non-admin users' })
  @ApiResponse({ status: 401, description: 'Unauthorized if user is not logged in' })
  @ApiResponse({ status: 403, description: 'Forbidden if user is not Admin' })
  async getAllUsers(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    this.assertAdminPermission(req);
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    return this.usersService.findPaginated({ page, limit, search });
  }


  @Patch(':id/role')
  @ApiOperation({ summary: 'Update a user role (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roleName: { type: 'string', example: 'ANALYST' },
      },
      required: ['roleName'],
    },
  })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized if user is not logged in' })
  @ApiResponse({ status: 403, description: 'Forbidden if user is not Admin' })
  async updateUserRole(
    @Param('id') id: string,
    @Body('roleName') roleName: string,
    @Req() req: any,
  ) {
    this.assertAdminPermission(req);

    if (!roleName) {
      throw new BadRequestException('roleName body property is required.');
    }

    try {
      return await this.usersService.updateUserRole(id, roleName);
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Failed to update user role');
    }
  }

  private assertAdminPermission(req: any): void {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('Authentication required. Please log in.');
    }

    const roleUpper = (req.user.role?.name || '').toUpperCase();
    const isSessionManageUsers = req.user.role?.permissions?.some(
      (rp: any) => rp.permission?.name === 'MANAGE_USERS',
    );

    if (roleUpper === 'ADMIN' || isSessionManageUsers) {
      return;
    }

    throw new ForbiddenException(
      'Access Denied: Only Admin users with MANAGE_USERS permission can manage user roles.',
    );
  }
}

