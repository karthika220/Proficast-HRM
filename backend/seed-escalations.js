const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const dummyEscalations = [
  {
    userId: 'cmlm1cmsh0002g7jbu0bi859i', // John
    type: 'PERFORMANCE',
    severity: 'HIGH',
    description: 'Consistent late arrivals to work',
    status: 'OPEN',
    count: 1,
    triggeredBy: 'hr@example.com',
  },
  {
    userId: 'cmlm1cmpl0001g7jbruarirol', // kavii
    type: 'ATTENDANCE',
    severity: 'MEDIUM',
    description: 'Excessive break time usage',
    status: 'OPEN',
    count: 1,
    triggeredBy: 'manager@example.com',
  },
  {
    userId: 'cmlm1cmsh0002g7jbu0bi859i', // John
    type: 'PERFORMANCE',
    severity: 'LOW',
    description: 'Missing project deadlines',
    status: 'OPEN',
    count: 1,
    triggeredBy: 'manager@example.com',
  },
  {
    userId: 'cmlm1cmpl0001g7jbruarirol', // kavii
    type: 'BEHAVIOR',
    severity: 'HIGH',
    description: 'Inappropriate workplace conduct',
    status: 'OPEN',
    count: 1,
    triggeredBy: 'hr@example.com',
  },
  {
    userId: 'cmlm1cmsh0002g7jbu0bi859i', // John
    type: 'ATTENDANCE',
    severity: 'MEDIUM',
    description: 'Unauthorized leave without notification',
    status: 'OPEN',
    count: 1,
    triggeredBy: 'hr@example.com',
  },
  {
    userId: 'cmlm1cmpl0001g7jbruarirol', // kavii
    type: 'PERFORMANCE',
    severity: 'LOW',
    description: 'Poor quality of work deliverables',
    status: 'OPEN',
    count: 1,
    triggeredBy: 'manager@example.com',
  },
  {
    userId: 'cmlm1cmsh0002g7jbu0bi859i', // John
    type: 'BEHAVIOR',
    severity: 'MEDIUM',
    description: 'Lack of teamwork and collaboration',
    status: 'OPEN',
    count: 1,
    triggeredBy: 'manager@example.com',
  },
  {
    userId: 'cmlm1cmpl0001g7jbruarirol', // kavii
    type: 'ATTENDANCE',
    severity: 'HIGH',
    description: 'Frequent unauthorized absences',
    status: 'OPEN',
    count: 1,
    triggeredBy: 'hr@example.com',
  },
  {
    userId: 'cmlm1cmsh0002g7jbu0bi859i', // John
    type: 'PERFORMANCE',
    severity: 'MEDIUM',
    description: 'Failure to meet performance targets',
    status: 'OPEN',
    count: 1,
    triggeredBy: 'hr@example.com',
  },
  {
    userId: 'cmlm1cmpl0001g7jbruarirol', // kavii
    type: 'BEHAVIOR',
    severity: 'LOW',
    description: 'Poor communication skills',
    status: 'OPEN',
    count: 1,
    triggeredBy: 'manager@example.com',
  }
];

async function seedEscalations() {
  try {
    console.log('Adding 10 dummy escalation records...');
    
    for (const escalation of dummyEscalations) {
      await prisma.escalation.create({
        data: {
          ...escalation,
          triggeredAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      console.log(`Created escalation for user ${escalation.userId}: ${escalation.description}`);
    }
    
    console.log('Successfully added 10 dummy escalation records!');
    
    // Get total count
    const totalEscalations = await prisma.escalation.count();
    console.log(`Total escalations in database: ${totalEscalations}`);
    
  } catch (error) {
    console.error('Error creating dummy escalations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedEscalations();
