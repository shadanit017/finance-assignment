import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required. Please log in.');
    }

    const roleName = (user.role?.name || '').toUpperCase();
    const hasManageUsers = user.role?.permissions?.some(
      (rp: any) => rp.permission?.name === 'MANAGE_USERS',
    );

    if (roleName === 'ADMIN' || hasManageUsers) {
      return true;
    }

    throw new ForbiddenException(
      'Access Denied: Only Admin users with MANAGE_USERS permission can access this route.',
    );
  }
}
