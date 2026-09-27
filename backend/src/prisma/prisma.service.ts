import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    let rawUrl = configService.get<string>('DATABASE_URL') || process.env.DATABASE_URL || '';

    // Check if running inside Docker container or natively on host machine
    const isDocker = fs.existsSync('/.dockerenv') || process.env.IS_DOCKER === 'true';

    // If running natively on host machine (outside Docker), replace postgres container hostname with localhost
    if (!isDocker && rawUrl.includes('@postgres:5432')) {
      rawUrl = rawUrl.replace('@postgres:5432', '@localhost:5432');
    }

    super({
      datasources: {
        db: {
          url: rawUrl,
        },
      },
    });
  }

  async onModuleInit() {
    let connected = false;
    let attempts = 0;
    const maxAttempts = 5;
    while (!connected && attempts < maxAttempts) {
      try {
        attempts++;
        await this.$connect();
        connected = true;
        this.logger.log('PostgreSQL database connected successfully.');
      } catch (err) {
        if (attempts >= maxAttempts) {
          this.logger.warn(
            `PostgreSQL connection postponed: ${(err as Error).message}. Backend server will run and retry when PostgreSQL starts or Docker Compose is run.`,
          );
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
