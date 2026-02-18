const { PrismaClient } = require('@prisma/client');
const EmployeeActivityService = require('../services/employeeActivityService');

const prisma = new PrismaClient();

async function seedAllEmployeeActivity() {
  try {
    console.log('Starting employee activity seeding...');

    // Get all existing employees
    const employees = await prisma.user.findMany({
      where: {
        status: 'Active', // Only seed active employees
        employeeId: {
          not: null
        }
      },
      select: {
        id: true,
        employeeId: true,
        fullName: true
      }
    });

    console.log(`Found ${employees.length} employees to seed...`);

    let successCount = 0;
    let errorCount = 0;

    // Seed activity for each employee
    for (const employee of employees) {
      try {
        await EmployeeActivityService.seedEmployeeActivity(employee.employeeId);
        console.log(`✓ Seeded activity for ${employee.fullName} (${employee.employeeId})`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to seed activity for ${employee.fullName} (${employee.employeeId}):`, error.message);
        errorCount++;
      }
    }

    console.log(`\nSeeding completed:`);
    console.log(`- Successfully seeded: ${successCount} employees`);
    console.log(`- Failed: ${errorCount} employees`);

    if (errorCount > 0) {
      console.log('\nNote: Some employees may already have activity data or encountered errors.');
      console.log('This is normal and won\'t affect the application functionality.');
    }

  } catch (error) {
    console.error('Error during employee activity seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedAllEmployeeActivity();
}

module.exports = { seedAllEmployeeActivity };
