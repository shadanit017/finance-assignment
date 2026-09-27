import { Controller, Get, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with email and password' })
  async register(@Body() body: any, @Req() req: any) {
    const user = await this.authService.register({
      email: body.email,
      name: body.name,
      password: body.password,
    });
    if (req.login) {
      await new Promise<void>((resolve, reject) => {
        req.login(user, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    return { success: true, message: 'Registration successful', user };
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in with email and password' })
  async login(@Body() body: any, @Req() req: any) {
    const user = await this.authService.login({
      email: body.email,
      password: body.password,
    });
    if (req.login) {
      await new Promise<void>((resolve, reject) => {
        req.login(user, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    return { success: true, message: 'Login successful', user };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth2 authentication flow' })
  async googleAuth() {
    // Triggers Passport Google OAuth redirect
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth2 callback endpoint' })
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    if (req.user && req.login) {
      await new Promise<void>((resolve, reject) => {
        req.login(req.user, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    // Redirect user to frontend after successful OAuth
    res.redirect(`${frontendUrl}?auth=success`);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile & permissions' })
  async getProfile(@Req() req: any) {
    if (!req.user) {
      return {
        authenticated: false,
        user: null,
        message: 'No active session or user logged in',
      };
    }
    return {
      authenticated: true,
      user: req.user,
    };
  }


  @Post('logout')
  @ApiOperation({ summary: 'Log out current authenticated user and destroy session' })
  async logout(@Req() req: any, @Res() res: Response) {
    if (req.logout) {
      req.logout((err: any) => {
        if (err) console.error('Logout error:', err);
      });
    }
    if (req.session) {
      req.session.destroy(() => {});
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  }
}

