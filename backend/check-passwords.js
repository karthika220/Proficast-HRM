const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function checkPasswords() {
  try {
    console.log('Checking user passwords...');
    
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['hr@example.com', 'manager@example.com', 'md@example.com']
        }
      },
      select: {
        fullName: true,
        email: true,
        password: true,
        role: true
      }
    });
    
    for (const user of users) {
      console.log(`\nUser: ${user.fullName} (${user.email})`);
      console.log(`Role: ${user.role}`);
      console.log(`Password exists: ${user.password ? 'Yes' : 'No'}`);
      
      // Test password comparison
      const testPasswords = ['hr123', 'manager123', 'md123', 'password123'];
      for (const testPwd of testPasswords) {
        const isMatch = await bcrypt.compare(testPwd, user.password);
        if (isMatch) {
          console.log(`✅ Password matches: ${testPwd}`);
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPasswords();
