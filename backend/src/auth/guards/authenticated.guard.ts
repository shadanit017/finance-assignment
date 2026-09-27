import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const isAuthenticated = request.isAuthenticated ? request.isAuthenticated() : !!request.user;

    if (!isAuthenticated || !request.user) {
      throw new UnauthorizedException('Authentication required. Please log in.');
    }

    return true;
  }
}
