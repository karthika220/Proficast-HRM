const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetUserStatuses() {
  try {
    console.log('Resetting user statuses to Active...');
    
    // Reset key users to Active status
    const updatedUsers = await prisma.user.updateMany({
      where: {
        email: {
          in: ['hr@example.com', 'manager@example.com', 'md@example.com', 'employee@example.com']
        }
      },
      data: {
        status: 'Active'
      }
    });
    
    console.log(`Updated ${updatedUsers.count} users to Active status`);
    
    // Show updated users
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['hr@example.com', 'manager@example.com', 'md@example.com', 'employee@example.com']
        }
      },
      select: {
        fullName: true,
        email: true,
        role: true,
        status: true
      }
    });
    
    console.log('\nUpdated users:');
    users.forEach(user => {
      console.log(`- ${user.fullName} (${user.email}) - Role: ${user.role} - Status: ${user.status}`);
    });
    
    console.log('\nYou can now login with:');
    console.log('HR: hr@example.com / hr123');
    console.log('Manager: manager@example.com / manager123');
    console.log('MD: md@example.com / md123');
    console.log('Employee: employee@example.com / password123');
    
  } catch (error) {
    console.error('Error resetting user statuses:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetUserStatuses();
