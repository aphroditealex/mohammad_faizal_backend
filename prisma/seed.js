const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Seed consumptions
  const consumptions = [
    { name: 'Snack Siang', pricePerPax: 25000 },
    { name: 'Makan Siang', pricePerPax: 50000 },
    { name: 'Snack Sore', pricePerPax: 25000 }
  ];

  for (const c of consumptions) {
    await prisma.consumption.upsert({
      where: { name: c.name },
      update: { pricePerPax: c.pricePerPax },
      create: c
    });
  }

  console.log('Seeded 3 consumptions: Snack Siang, Makan Siang, Snack Sore');

  // Seed sample units
  const units = ['Divisi IT', 'Divisi HR', 'Divisi Finance', 'Divisi Marketing'];
  for (const name of units) {
    await prisma.unit.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  console.log('Seeded 4 units');

  // Seed sample meeting rooms
  const rooms = [
    { name: 'Ruang Rapat Utama', capacity: 30 },
    { name: 'Ruang Meeting A', capacity: 15 },
    { name: 'Ruang Meeting B', capacity: 10 },
    { name: 'Ruang Diskusi', capacity: 6 }
  ];

  for (const room of rooms) {
    await prisma.meetingRoom.upsert({
      where: { name: room.name },
      update: {},
      create: room
    });
  }

  console.log('Seeded 4 meeting rooms');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
