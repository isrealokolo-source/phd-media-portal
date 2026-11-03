import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data for PHD Services Portal...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Super Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@phdservices.com' },
    update: {},
    create: {
      email: 'admin@phdservices.com',
      passwordHash,
      name: 'PHD Operations Executive',
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
    },
  });
  console.log('Created Super Admin:', admin.email);

  // 2. Release Reviewer
  const reviewer = await prisma.user.upsert({
    where: { email: 'reviewer@phdservices.com' },
    update: {},
    create: {
      email: 'reviewer@phdservices.com',
      passwordHash,
      name: 'Legal & Rights Reviewer',
      role: 'RELEASE_REVIEWER',
      isEmailVerified: true,
    },
  });
  console.log('Created Reviewer:', reviewer.email);

  // 3. Artist Dekaf
  const artist = await prisma.user.upsert({
    where: { email: 'artist@dekaf.com' },
    update: {},
    create: {
      email: 'artist@dekaf.com',
      passwordHash,
      name: 'Dekaf',
      role: 'ARTIST',
      isEmailVerified: true,
      artistProfile: {
        create: {
          stageName: 'Dekaf',
          legalName: 'Damilola Emmanuel Kafaru',
          label: 'Independent / PHD Services',
          contactEmail: 'artist@dekaf.com',
          phone: '+234 803 123 4567',
          country: 'Nigeria',
          bio: 'Afro-fusion recording artist and songwriter.',
        },
      },
    },
  });
  console.log('Created Artist:', artist.email);

  // 4. Default System Settings
  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'PHD Services',
      administrativeEmail: 'operations@phdservices.com',
      companyContactInfo: 'PHD Services HQ, Lagos / London',
      defaultAuthorizedRep: 'Authorised Representative',
      defaultRepPosition: 'Head of Legal & Business Affairs',
      releaseReferencePrefix: 'PHD',
      availableCurrencies: JSON.stringify(['NGN', 'USD', 'GBP', 'EUR']),
      supportedDsps: JSON.stringify([
        'Spotify',
        'Apple Music',
        'YouTube Music',
        'Audiomack',
        'TIDAL',
        'Amazon Music',
        'TikTok/Meta',
        'Boomplay',
      ]),
      maxFileUploadMb: 100,
    },
  });
  console.log('Seeded default system settings.');

  console.log('\nSeeding completed successfully!');
  console.log('Credentials:');
  console.log('  Admin: admin@phdservices.com / Password123!');
  console.log('  Reviewer: reviewer@phdservices.com / Password123!');
  console.log('  Artist: artist@dekaf.com / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

