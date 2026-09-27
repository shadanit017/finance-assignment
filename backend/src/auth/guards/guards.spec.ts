import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedGuard } from './authenticated.guard';
import { AdminGuard } from './admin.guard';

describe('Auth Guards', () => {
  const createMockContext = (request: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  };

  describe('AuthenticatedGuard', () => {
    let guard: AuthenticatedGuard;

    beforeEach(() => {
      guard = new AuthenticatedGuard();
    });

    it('should allow access if user is authenticated', () => {
      const mockReq = {
        user: { id: 'user-1' },
        isAuthenticated: () => true,
      };
      const context = createMockContext(mockReq);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw UnauthorizedException if user is not authenticated', () => {
      const mockReq = {
        user: null,
        isAuthenticated: () => false,
      };
      const context = createMockContext(mockReq);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('AdminGuard', () => {
    let guard: AdminGuard;

    beforeEach(() => {
      guard = new AdminGuard();
    });

    it('should allow access for user with ADMIN role', () => {
      const mockReq = {
        user: { id: 'user-admin', role: { name: 'ADMIN' } },
      };
      const context = createMockContext(mockReq);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access for user with MANAGE_USERS permission', () => {
      const mockReq = {
        user: {
          id: 'user-manager',
          role: { name: 'CUSTOM', permissions: [{ permission: { name: 'MANAGE_USERS' } }] },
        },
      };
      const context = createMockContext(mockReq);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException for user with VIEWER role', () => {
      const mockReq = {
        user: { id: 'user-viewer', role: { name: 'VIEWER' } },
      };
      const context = createMockContext(mockReq);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw UnauthorizedException if user is null', () => {
      const mockReq = { user: null };
      const context = createMockContext(mockReq);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
