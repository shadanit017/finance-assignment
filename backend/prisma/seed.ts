import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma Database Seeding...');

  // 1. Define Permissions with descriptions
  const permissionsData = [
    {
      name: 'VIEW_AGGREGATES',
      description: 'View aggregate financial information such as SUM, AVG, COUNT and grouped totals.',
    },
    {
      name: 'VIEW_TRENDS',
      description: 'View financial trends over time.',
    },
    {
      name: 'VIEW_COMPARISONS',
      description: 'Compare financial data between periods, categories or other allowed dimensions.',
    },
    {
      name: 'VIEW_ENTITY_DETAILS',
      description: 'View individual/entity-level financial records.',
    },
    {
      name: 'VIEW_SENSITIVE_FIELDS',
      description: 'View sensitive financial fields.',
    },
    {
      name: 'MANAGE_USERS',
      description: 'Manage users and their roles.',
    },
  ];

  const permissionMap = new Map<string, string>();

  for (const perm of permissionsData) {
    const createdPerm = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    });
    permissionMap.set(perm.name, createdPerm.id);
    console.log(`  ✓ Permission: ${perm.name}`);
  }

  // 2. Define Roles & Assigned Permissions
  const rolePermissionsMapping: Record<string, string[]> = {
    VIEWER: ['VIEW_AGGREGATES'],
    ANALYST: ['VIEW_AGGREGATES', 'VIEW_TRENDS', 'VIEW_COMPARISONS'],
    ADMIN: [
      'VIEW_AGGREGATES',
      'VIEW_TRENDS',
      'VIEW_COMPARISONS',
      'VIEW_ENTITY_DETAILS',
      'VIEW_SENSITIVE_FIELDS',
      'MANAGE_USERS',
    ],
  };

  const roleMap = new Map<string, string>();

  for (const [roleName, assignedPerms] of Object.entries(rolePermissionsMapping)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    roleMap.set(roleName, role.id);
    console.log(`  ✓ Role: ${roleName}`);

    // Assign Permissions to Role via RolePermission
    for (const permName of assignedPerms) {
      const permissionId = permissionMap.get(permName);
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permissionId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permissionId,
          },
        });
      }
    }
  }

  // 3. Create Sample Users for Each Role
  const hashPassword = (p: string) => crypto.createHash('sha256').update(p).digest('hex');

  const sampleUsers = [
    {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashPassword('admin123'),
      googleId: 'google_admin_id',
      roleName: 'ADMIN',
    },
    {
      email: 'analyst@example.com',
      name: 'Analyst User',
      password: hashPassword('analyst123'),
      googleId: 'google_analyst_id',
      roleName: 'ANALYST',
    },
    {
      email: 'viewer@example.com',
      name: 'Viewer User',
      password: hashPassword('viewer123'),
      googleId: 'google_viewer_id',
      roleName: 'VIEWER',
    },
  ];

  for (const u of sampleUsers) {
    const roleId = roleMap.get(u.roleName);
    if (roleId) {
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name,
          password: u.password,
          roleId: roleId,
        },
        create: {
          email: u.email,
          name: u.name,
          password: u.password,
          googleId: u.googleId,
          roleId: roleId,
        },
      });
      console.log(`  ✓ User created/updated: ${user.email} (Role: ${u.roleName})`);
    }
  }

  console.log('✅ Database Seeding Completed Successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
