const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function updatePasswords() {
  try {
    console.log('Updating user passwords to known values...');
    
    const userUpdates = [
      {
        email: 'hr@example.com',
        password: 'hr123',
        role: 'HR'
      },
      {
        email: 'manager@example.com', 
        password: 'manager123',
        role: 'MANAGER'
      },
      {
        email: 'md@example.com',
        password: 'md123', 
        role: 'MD'
      },
      {
        email: 'employee@example.com',
        password: 'password123',
        role: 'EMPLOYEE'
      }
    ];
    
    for (const userUpdate of userUpdates) {
      const hashedPassword = await bcrypt.hash(userUpdate.password, 10);
      
      await prisma.user.update({
        where: { email: userUpdate.email },
        data: { 
          password: hashedPassword,
          status: 'Active'
        }
      });
      
      console.log(`✅ Updated ${userUpdate.email} with password: ${userUpdate.password}`);
    }
    
    console.log('\nAll passwords updated successfully!');
    console.log('\nYou can now login with:');
    console.log('HR: hr@example.com / hr123');
    console.log('Manager: manager@example.com / manager123');
    console.log('MD: md@example.com / md123');
    console.log('Employee: employee@example.com / password123');
    
  } catch (error) {
    console.error('Error updating passwords:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePasswords();
