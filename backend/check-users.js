const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('Checking users in database...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true
      }
    });
    
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.fullName} (${user.email}) - Role: ${user.role} - Status: ${user.status}`);
    });
    
    if (users.length === 0) {
      console.log('No users found in database!');
      console.log('You need to register some users first.');
    } else {
      console.log('\nYou can try logging in with these credentials:');
      console.log('Email: user@example.com, Password: password123');
      console.log('Email: hr@example.com, Password: hr123');
      console.log('Email: manager@example.com, Password: manager123');
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
