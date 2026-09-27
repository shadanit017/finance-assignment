import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

describe('AuthService - Google Social Login', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let rolesService: jest.Mocked<Partial<RolesService>>;

  const mockViewerRole = {
    id: 'role-viewer-id',
    name: 'VIEWER',
    permissions: [],
  };

  beforeEach(async () => {
    usersService = {
      findByGoogleId: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      updateUserGoogleIdAndRole: jest.fn(),
    };

    rolesService = {
      findByName: jest.fn().mockResolvedValue(mockViewerRole),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: RolesService, useValue: rolesService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should create new user with VIEWER role on first Google social login', async () => {
    (usersService.findByGoogleId as jest.Mock).mockResolvedValue(null);
    (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
    (usersService.create as jest.Mock).mockResolvedValue({
      id: 'new-user-id',
      email: 'newgoogle@example.com',
      name: 'Google User',
      googleId: 'google-123',
      roleId: mockViewerRole.id,
      role: mockViewerRole,
    });

    const result = await authService.validateOrCreateGoogleUser({
      googleId: 'google-123',
      email: 'newgoogle@example.com',
      name: 'Google User',
    });

    expect(rolesService.findByName).toHaveBeenCalledWith('Viewer');
    expect(usersService.create).toHaveBeenCalledWith({
      googleId: 'google-123',
      email: 'newgoogle@example.com',
      name: 'Google User',
      roleId: mockViewerRole.id,
    });
    expect(result.roleId).toBe(mockViewerRole.id);
  });

  it('should update existing user role to VIEWER on Google social login even if user was Admin/Analyst previously', async () => {
    const existingAdminUser = {
      id: 'existing-admin-id',
      email: 'admin@example.com',
      roleId: 'role-admin-id',
      googleId: null,
    };

    (usersService.findByGoogleId as jest.Mock).mockResolvedValue(null);
    (usersService.findByEmail as jest.Mock).mockResolvedValue(existingAdminUser);
    (usersService.updateUserGoogleIdAndRole as jest.Mock).mockResolvedValue({
      ...existingAdminUser,
      googleId: 'google-admin-123',
      roleId: mockViewerRole.id,
      role: mockViewerRole,
    });

    const result = await authService.validateOrCreateGoogleUser({
      googleId: 'google-admin-123',
      email: 'admin@example.com',
      name: 'Admin User',
    });

    expect(usersService.updateUserGoogleIdAndRole).toHaveBeenCalledWith(
      'existing-admin-id',
      'google-admin-123',
      mockViewerRole.id,
    );
    expect(result.roleId).toBe(mockViewerRole.id);
  });
});
