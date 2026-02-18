const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  const pw = await bcrypt.hash('Password123', 10);

  const md = await prisma.user.create({
    data: {
      employeeId: 'EMP001',
      fullName: 'Managing Director',
      email: 'md@example.com',
      password: pw,
      role: 'MD',
      department: 'Leadership',
      designation: 'Managing Director',
    },
  });

  const hr = await prisma.user.create({
    data: {
      employeeId: 'EMP002',
      fullName: 'HR Manager',
      email: 'hr@example.com',
      password: pw,
      role: 'HR',
      department: 'HR',
      designation: 'HR Manager',
    },
  });

  const manager = await prisma.user.create({
    data: {
      employeeId: 'EMP003',
      fullName: 'Team Manager',
      email: 'manager@example.com',
      password: pw,
      role: 'MANAGER',
      department: 'Engineering',
      designation: 'Team Manager',
    },
  });

  const emp = await prisma.user.create({
    data: {
      employeeId: 'EMP004',
      fullName: 'Employee One',
      email: 'employee@example.com',
      password: pw,
      role: 'EMPLOYEE',
      department: 'Engineering',
      designation: 'Software Engineer',
    },
  });

  // Create leave balances for users
  await prisma.leaveBalance.createMany({
    data: [
      { userId: md.id, casual: 30, sick: 30 },
      { userId: hr.id, casual: 20, sick: 20 },
      { userId: manager.id, casual: 18, sick: 18 },
      { userId: emp.id, casual: 12, sick: 12 },
    ],
  });

  // sample attendance for today
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  await prisma.attendance.createMany({
    data: [
      { userId: emp.id, date: startOfDay, checkIn: new Date(startOfDay.getTime() + 9*60*60*1000), status: 'Present' },
    ],
  });

  console.log('Seeding complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 
