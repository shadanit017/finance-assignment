import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async register(data: { email: string; name?: string; password?: string }) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    const viewerRole = await this.rolesService.findByName('Viewer');
    if (!viewerRole) {
      throw new Error('Default Viewer role not found. Please run database seed.');
    }

    const hashedPassword = data.password ? this.hashPassword(data.password) : undefined;

    return this.usersService.create({
      email: data.email,
      name: data.name || data.email.split('@')[0],
      password: hashedPassword,
      roleId: viewerRole.id,
    });
  }

  async login(data: { email: string; password?: string }) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.password) {
      const hashedPassword = data.password ? this.hashPassword(data.password) : '';
      if (user.password !== hashedPassword) {
        throw new UnauthorizedException('Invalid email or password.');
      }
    }

    return user;
  }

  async validateOrCreateGoogleUser(data: { googleId: string; email: string; name?: string }) {
    const viewerRole = await this.rolesService.findByName('Viewer');
    if (!viewerRole) {
      throw new Error('Default Viewer role not found. Please run database seed.');
    }

    let user = await this.usersService.findByGoogleId(data.googleId);

    if (!user) {
      user = await this.usersService.findByEmail(data.email);
    }

    if (!user) {
      user = await this.usersService.create({
        googleId: data.googleId,
        email: data.email,
        name: data.name,
        roleId: viewerRole.id,
      });
    } else {
      // Social login users MUST always have Viewer role only
      user = await this.usersService.updateUserGoogleIdAndRole(user.id, data.googleId, viewerRole.id);
    }

    return user;
  }

}


