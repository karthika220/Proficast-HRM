const prisma = require('../prismaClient');

// Helper function to create notification
const createNotification = async (userId, title, message, type) => {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Get grouped escalations for TL/HR/MD view
const getGroupedEscalations = async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    // Check if user has access (TL, HR, MD)
    if (role !== 'TL' && role !== 'HR' && role !== 'MD' && role !== 'MANAGER') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get all employees grouped by team/department
    const employees = await prisma.user.findMany({
      where: {
        status: 'Active'
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        employeeId: true,
        reportingManagerId: true,
        User: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: [
        { department: 'asc' },
        { role: 'asc' }
      ]
    });

    // Group employees by team/department
    const groupedData = {};
    
    employees.forEach(emp => {
      const team = emp.department || 'General';
      
      if (!groupedData[team]) {
        groupedData[team] = {
          team,
          teamLead: emp.User || null,
          employees: [],
          escalations: []
        };
      }
      
      groupedData[team].employees.push({
        id: emp.id,
        name: emp.fullName,
        email: emp.email,
        role: emp.role,
        employeeId: emp.employeeId,
        team: emp.department || 'General'
      });
    });

    // Get escalations for each team
    for (const team of Object.keys(groupedData)) {
      const teamEmployees = groupedData[team].employees.map(emp => emp.id);
      
      const escalations = await prisma.escalation.findMany({
        where: {
          userId: {
            in: teamEmployees
          },
          status: 'OPEN'
        },
        include: {
          User: {
            select: {
              fullName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Transform to match expected format
      groupedData[team].escalations = escalations.map(esc => ({
        id: esc.id,
        employeeId: esc.userId,
        employeeName: groupedData[team].employees.find(emp => emp.id === esc.userId)?.name,
        reason: esc.description,
        severity: esc.severity,
        status: esc.status,
        count: esc.count,
        createdAt: esc.createdAt,
        raisedBy: { fullName: esc.User?.fullName, email: esc.User?.email }
      }));
    }

    res.json({
      success: true,
      data: Object.values(groupedData)
    });

  } catch (error) {
    console.error('Get grouped escalations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch escalations',
      details: error.message
    });
  }
};

// Create escalation with correct schema
const createEscalation = async (req, res) => {
  try {
    console.log("Escalation Payload:", req.body);

    const {
      employeeId,
      employeeName,
      employeeEmail,
      raisedBy,
      reason,
      severity
    } = req.body;

    if (!employeeId || !employeeName || !raisedBy || !reason) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Resolve employee by id or name (handle dummy IDs)
    const employee = await prisma.user.findFirst({
      where: {
        OR: [
          { id: String(employeeId) },
          { fullName: employeeName }
        ]
      }
    });

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Employee not found"
      });
    }

    console.log("Employee resolved:", employee.id);

    // Resolve raisedBy user safely
    const raisedByUser = await prisma.user.findFirst({
      where: { email: raisedBy }
    });

    const triggeredBy = raisedByUser?.email || req.user?.email || raisedBy;
    console.log("Raised by:", triggeredBy);

    // Check if employee already has an OPEN escalation
    const existingEscalation = await prisma.escalation.findFirst({
      where: {
        userId: employee.id,
        status: 'OPEN'
      }
    });

    console.log("Existing escalation:", existingEscalation);

    let escalation;
    
    if (existingEscalation) {
      console.log("Updating existing escalation, current count:", existingEscalation.count);
      // Increment count for existing escalation
      escalation = await prisma.escalation.update({
        where: { id: existingEscalation.id },
        data: {
          count: existingEscalation.count + 1,
          description: reason, // Update with latest reason
          severity: severity || existingEscalation.severity,
          triggeredBy: triggeredBy,
          updatedAt: new Date()
        }
      });
      console.log("Updated escalation, new count:", escalation.count);

      // Check if count reaches 3, update employee status
      if (escalation.count >= 3) {
        console.log("Employee count reached 3, updating status to UNDER_REVIEW");
        await prisma.user.update({
          where: { id: employee.id },
          data: { status: 'UNDER_REVIEW' }
        });

        // Create notification for HR/Manager
        await createNotification(
          employee.id,
          'Employee Under Review',
          `${employeeName} has reached 3 escalations and is now under review.`,
          'ESCALATION'
        );
      }
    } else {
      console.log("Creating new escalation with count = 1");
      // Create new escalation
      escalation = await prisma.escalation.create({
        data: {
          userId: employee.id,
          type: "PERFORMANCE",
          severity: severity || "Medium",
          description: reason,
          status: "OPEN",
          count: 1,
          triggeredBy: triggeredBy,
          triggeredAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log("Created new escalation with count:", escalation.count);
    }

    // Create notification for the employee
    await createNotification(
      employee.id,
      'New Escalation',
      `A new escalation has been raised against you. Count: ${escalation.count}`,
      'ESCALATION'
    );

    return res.json({
      success: true,
      data: escalation
    });

  } catch (err) {
    console.error("ESCALATION ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create escalation",
      error: err.message
    });
  }
};

// Get employee escalation history
const getEmployeeEscalationHistory = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { employeeId } = req.params;

    // Check access
    if (role === 'EMPLOYEE' && employeeId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const escalations = await prisma.escalation.findMany({
      where: {
        userId: employeeId
      },
      include: {
        User: {
          select: {
            fullName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: { fullName: true, email: true, role: true, status: true }
    });

    res.json({
      success: true,
      data: {
        employee,
        escalations: escalations.map(esc => ({
          id: esc.id,
          reason: esc.description,
          severity: esc.severity,
          status: esc.status,
          count: esc.count,
          createdAt: esc.createdAt,
          raisedBy: { fullName: esc.User?.fullName, email: esc.User?.email }
        }))
      }
    });

  } catch (error) {
    console.error('Get employee escalation history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch escalation history',
      details: error.message
    });
  }
};

// Get escalation summary statistics
const getEscalationSummary = async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    let whereClause = {};

    // Role-based filtering
    if (role === 'EMPLOYEE') {
      whereClause.userId = userId;
    } else if (role === 'TL') {
      // Get TL's team members
      const teamMembers = await prisma.user.findMany({
        where: { reportingManagerId: userId },
        select: { id: true }
      });
      whereClause.userId = { in: teamMembers.map(m => m.id) };
    }
    // HR, MD, MANAGER can see all

    const totalEmployees = await prisma.user.count({
      where: { status: 'Active' }
    });

    const activeEscalations = await prisma.escalation.count({
      where: {
        status: 'OPEN',
        ...whereClause
      }
    });

    const underReviewEmployees = await prisma.user.count({
      where: { status: 'Under Review' }
    });

    const resolvedEscalations = await prisma.escalation.count({
      where: {
        status: 'RESOLVED',
        ...whereClause
      }
    });

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeEscalations,
        underReviewEmployees,
        resolvedEscalations
      }
    });

  } catch (error) {
    console.error('Get escalation summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch escalation summary',
      details: error.message
    });
  }
};

module.exports = {
  getGroupedEscalations,
  createEscalation,
  getEmployeeEscalationHistory,
  getEscalationSummary,
};
