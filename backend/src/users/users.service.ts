import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async create(data: { email: string; name?: string; password?: string; googleId?: string; roleId: string }) {
    return this.prisma.user.create({
      data,
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        role: {
          isNot: {
            name: { equals: 'ADMIN', mode: 'insensitive' },
          },
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPaginated(options: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      role: {
        isNot: {
          name: { equals: 'ADMIN', mode: 'insensitive' },
        },
      },
    };

    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      users,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async updateUserRole(id: string, roleIdOrName: string) {
    const role = await this.prisma.role.findFirst({
      where: {
        OR: [
          { id: roleIdOrName },
          { name: { equals: roleIdOrName, mode: 'insensitive' } },
        ],
      },
    });

    if (!role) {
      throw new Error(`Role '${roleIdOrName}' not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { roleId: role.id },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }

  async updateUserGoogleIdAndRole(id: string, googleId: string, roleId: string) {
    return this.prisma.user.update({
      where: { id },
      data: { googleId, roleId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  }
}
