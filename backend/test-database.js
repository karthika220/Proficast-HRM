const prisma = require('./src/prismaClient');

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');
    
    const userCount = await prisma.user.count();
    console.log('✅ Database connected!');
    console.log('Total users:', userCount);
    
    const hrUser = await prisma.user.findUnique({
      where: { email: 'hr@example.com' },
      select: { id: true, fullName: true, email: true, role: true }
    });
    
    if (hrUser) {
      console.log('✅ HR user found:', hrUser);
    } else {
      console.log('❌ HR user not found');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
