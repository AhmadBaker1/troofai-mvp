import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding TroofAI demo data...');

  // Create demo tenant
  const apiKey = `troofai-demo-${randomBytes(16).toString('hex')}`;
  const tenant = await prisma.tenant.upsert({
    where: { apiKey },
    update: {},
    create: {
      name: 'TroofAI Demo',
      apiKey,
    },
  });

  console.log(`Demo tenant: ${tenant.id}`);
  console.log(`API key: ${tenant.apiKey}`);
  console.log('Seed complete.');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
