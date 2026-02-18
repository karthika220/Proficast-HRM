const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');
const { initializeLeaveBalance } = require('./enhancedLeaveController');

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

// Create new employee (HR only)
const createEmployee = async (req, res) => {
  try {
    const {
      employeeId,
      fullName,
      email,
      password,
      phone,
      role,
      department,
      designation,
      workMode,
      reportingManagerId,
      dateOfJoining,
    } = req.body;

    if (!employeeId || !fullName || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await prisma.user.findFirst({ 
      where: { OR: [{ email }, { employeeId }] } 
    });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          employeeId,
          fullName,
          email,
          password: hashed,
          phone,
          role,
          department,
          designation,
          workMode: workMode || 'ONSITE',
          reportingManagerId: reportingManagerId || null,
          dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
          status: 'Active',
        },
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          email: true,
          role: true,
          department: true,
          designation: true,
          workMode: true,
          reportingManagerId: true,
          dateOfJoining: true,
          phone: true,
          status: true,
          createdAt: true,
        },
      });

      // Initialize leave balance
      if (dateOfJoining) {
        await initializeLeaveBalance(user.id, dateOfJoining);
      }

      return user;
    });

    // Notify reporting manager if assigned
    if (reportingManagerId) {
      await createNotification(
        reportingManagerId,
        'New Team Member',
        `${fullName} has been added to your team as ${designation}`,
        'EMPLOYEE_UPDATE'
      );
    }

    // Notify HR
    const hrUsers = await prisma.user.findMany({
      where: { role: 'HR' },
      select: { id: true }
    });

    for (const hr of hrUsers) {
      if (hr.id !== req.user.id) { // Don't notify the HR who created the employee
        await createNotification(
          hr.id,
          'New Employee',
          `${fullName} (${employeeId}) has been added to the system`,
          'EMPLOYEE_UPDATE'
        );
      }
    }

    res.status(201).json({
      message: 'Employee created successfully',
      employee: result,
    });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Get employees with reporting hierarchy filtering
const getEmployees = async (req, res) => {
  try {
    const { role, id } = req.user;
    const { department, status, search } = req.query;
    
    let employees;
    let whereClause = {};

    // Apply department filter
    if (department) {
      whereClause.department = department;
    }

    // Apply status filter
    if (status) {
      whereClause.status = status;
    }

    // Apply search filter
    if (search) {
      whereClause.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role === 'HR' || role === 'MD') {
      // HR and MD can see all employees
      employees = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          email: true,
          role: true,
          department: true,
          designation: true,
          workMode: true,
          reportingManagerId: true,
          dateOfJoining: true,
          phone: true,
          status: true,
          createdAt: true,
          reportingManager: {
            select: {
              id: true,
              fullName: true,
              email: true,
              employeeId: true,
            },
          },
          reports: {
            select: {
              id: true,
              fullName: true,
              email: true,
              employeeId: true,
              role: true,
            },
          },
          _count: {
            select: {
              reports: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'MANAGER') {
      // Manager can see direct reports only
      whereClause.reportingManagerId = id;
      employees = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          email: true,
          role: true,
          department: true,
          designation: true,
          workMode: true,
          reportingManagerId: true,
          dateOfJoining: true,
          phone: true,
          status: true,
          createdAt: true,
          reportingManager: {
            select: {
              id: true,
              fullName: true,
              email: true,
              employeeId: true,
            },
          },
          attendance: {
            where: {
              date: {
                gte: new Date(new Date().setDate(new Date().getDate() - 30)),
              },
            },
            select: {
              status: true,
              date: true,
            },
          },
          leaveRequests: {
            where: {
              createdAt: {
                gte: new Date(new Date().setDate(new Date().getDate() - 30)),
              },
            },
            select: {
              status: true,
              type: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Employee can only see themselves
      whereClause.id = id;
      employees = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          employeeId: true,
          fullName: true,
          email: true,
          role: true,
          department: true,
          designation: true,
          workMode: true,
          reportingManagerId: true,
          dateOfJoining: true,
          phone: true,
          status: true,
          createdAt: true,
          reportingManager: {
            select: {
              id: true,
              fullName: true,
              email: true,
              employeeId: true,
            },
          },
        },
      });
    }

    res.json({ employees });
  } catch (err) {
    console.error('Get employees error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Get employee by ID with permissions check
const getEmployeeById = async (req, res) => {
  try {
    const { role, id } = req.user;
    const { employeeId } = req.params;

    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        workMode: true,
        reportingManagerId: true,
        dateOfJoining: true,
        dateOfExit: true,
        phone: true,
        status: true,
        createdAt: true,
        reportingManager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            employeeId: true,
          },
        },
        reports: {
          select: {
            id: true,
            fullName: true,
            email: true,
            employeeId: true,
            role: true,
            status: true,
          },
        },
        leaveBalance: true,
        _count: {
          select: {
            reports: true,
            attendance: true,
            leaveRequests: true,
          },
        },
      },
    });

    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Check permissions
    if (role === 'HR' || role === 'MD') {
      return res.json({ employee });
    }
    if (role === 'MANAGER' && employee.reportingManagerId === id) {
      return res.json({ employee });
    }
    if (role === 'EMPLOYEE' && employee.id === id) {
      return res.json({ employee });
    }

    return res.status(403).json({ error: 'Forbidden: You can only view your own profile' });
  } catch (err) {
    console.error('Get employee by ID error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Update employee with permissions check
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { role: userRole, id: userId } = req.user;

    console.log('Update employee request:', { id, userRole, userId, body: req.body });

    // Check if employee exists
    const existingEmployee = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingEmployee) {
      console.log('Employee not found:', id);
      return res.status(404).json({
        error: "Employee not found",
      });
    }

    // Check access permissions
    let canUpdate = false;
    let allowedFields = [];

    if (userRole === "HR" || userRole === "MD") {
      // HR and MD can update any employee
      canUpdate = true;
      allowedFields = Object.keys(req.body); // All fields allowed
    } else if (userRole === "MANAGER") {
      // Manager can update direct reports
      canUpdate = existingEmployee.reportingManagerId === userId;
      allowedFields = ['fullName', 'phone', 'department', 'designation', 'workMode'];
    } else {
      // Employee can update only themselves (limited fields)
      if (id !== userId) {
        return res.status(403).json({
          error: "Forbidden: You can only update your own profile",
        });
      }
      canUpdate = true;
      allowedFields = ["fullName", "phone", "dob", "gender", "maritalStatus", "currentAddress", "permanentAddress"];
    }

    if (!canUpdate) {
      return res.status(403).json({
        error: "Forbidden: You don't have permission to update this employee",
      });
    }

    // Filter allowed fields
    const updateData = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        if (req.body[key] !== undefined && req.body[key] !== '') {
          // Handle date fields
          if (key === 'dateOfJoining' || key === 'dateOfExit' || key === 'dob') {
            updateData[key] = new Date(req.body[key]);
          } else if (key === 'currentYearsExp' || key === 'previousYearsExp') {
            updateData[key] = parseFloat(req.body[key]);
          } else {
            updateData[key] = req.body[key];
          }
        }
      }
    });

    console.log('Update data:', updateData);

    // Check for duplicate email if email is being updated
    if (updateData.email && updateData.email !== existingEmployee.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email: updateData.email },
      });
      if (duplicateEmail) {
        return res.status(400).json({
          error: "Email already exists",
        });
      }
    }

    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        designation: true,
        workMode: true,
        reportingManagerId: true,
        dateOfJoining: true,
        dateOfExit: true,
        dob: true,
        gender: true,
        maritalStatus: true,
        currentAddress: true,
        permanentAddress: true,
        totalExperience: true,
        profilePicture: true,
        status: true,
        createdAt: true,
        createdBy: true,
        currentCompanyName: true,
        currentYearsExp: true,
        previousCompanyName: true,
        previousYearsExp: true,
        reportingManager: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Notify relevant parties if significant changes were made
    if (userRole === "HR" || userRole === "MD") {
      if (updateData.reportingManagerId && updateData.reportingManagerId !== existingEmployee.reportingManagerId) {
        // New manager notification
        if (updateData.reportingManagerId) {
          await createNotification(
            updateData.reportingManagerId,
            'New Team Member',
            `${updatedEmployee.fullName} has been assigned to your team`,
            'EMPLOYEE_UPDATE'
          );
        }

        // Previous manager notification
        if (existingEmployee.reportingManagerId) {
          await createNotification(
            existingEmployee.reportingManagerId,
            'Team Member Reassigned',
            `${updatedEmployee.fullName} is no longer reporting to you`,
            'EMPLOYEE_UPDATE'
          );
        }
      }

      if (updateData.status && updateData.status !== existingEmployee.status) {
        // Status change notification
        const hrUsers = await prisma.user.findMany({
          where: { role: 'HR' },
          select: { id: true }
        });

        for (const hr of hrUsers) {
          if (hr.id !== userId) { // Don't notify the HR who made the change
            await createNotification(
              hr.id,
              'Employee Status Change',
              `${updatedEmployee.fullName}'s status changed to ${updateData.status}`,
              'EMPLOYEE_UPDATE'
            );
          }
        }
      }
    }

    res.json({
      message: "Employee updated successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({
      error: "Failed to update employee",
      details: error.message,
    });
  }
};

// Archive employee (soft delete) - HR only
const archiveEmployee = async (req, res) => {
  try {
    const { role } = req.user;
    const { id } = req.params;

    if (role !== 'HR' && role !== 'MD') {
      return res.status(403).json({ error: 'Forbidden: Only HR and MD can archive employees' });
    }

    const employee = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        email: true,
        reportingManagerId: true,
        status: true,
      },
    });

    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (employee.status === 'Archived') return res.status(400).json({ error: 'Employee already archived' });

    const updatedEmployee = await prisma.user.update({
      where: { id },
      data: {
        status: 'Archived',
        dateOfExit: new Date(),
      },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        email: true,
        status: true,
        dateOfExit: true,
      },
    });

    // Notify manager
    if (employee.reportingManagerId) {
      await createNotification(
        employee.reportingManagerId,
        'Team Member Archived',
        `${employee.fullName} has been archived from the system`,
        'EMPLOYEE_UPDATE'
      );
    }

    // Notify HR
    const hrUsers = await prisma.user.findMany({
      where: { role: 'HR' },
      select: { id: true }
    });

    for (const hr of hrUsers) {
      if (hr.id !== req.user.id) { // Don't notify the HR who archived the employee
        await createNotification(
          hr.id,
          'Employee Archived',
          `${employee.fullName} (${employee.employeeId}) has been archived`,
          'EMPLOYEE_UPDATE'
        );
      }
    }

    res.json({
      message: 'Employee archived successfully',
      employee: updatedEmployee,
    });
  } catch (err) {
    console.error('Archive employee error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// Get reporting hierarchy (who reports to whom)
const getReportingHierarchy = async (req, res) => {
  try {
    const { role, id } = req.user;

    if (!['HR', 'MD', 'MANAGER'].includes(role)) {
      return res.status(403).json({
        error: "Forbidden: Only managers and above can view reporting hierarchy",
      });
    }

    let whereClause = {};

    // Managers can only see their team hierarchy
    if (role === "MANAGER") {
      const teamMembers = await prisma.user.findMany({
        where: { reportingManagerId: id },
        select: { id: true },
      });
      const teamMemberIds = teamMembers.map(member => member.id);
      whereClause.id = { in: [...teamMemberIds, id] };
    }

    const employees = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        status: true,
        reportingManagerId: true,
        reportingManager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            employeeId: true,
          },
        },
        reports: {
          where: { status: 'Active' },
          select: {
            id: true,
            fullName: true,
            email: true,
            employeeId: true,
            role: true,
            designation: true,
            department: true,
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    // Build hierarchy tree
    const buildHierarchy = (employees, managerId = null) => {
      return employees
        .filter(emp => emp.reportingManagerId === managerId)
        .map(emp => ({
          ...emp,
          reports: buildHierarchy(employees, emp.id),
        }));
    };

    const hierarchy = buildHierarchy(employees);

    res.json({
      hierarchy,
      totalEmployees: employees.length,
    });
  } catch (error) {
    console.error("Get reporting hierarchy error:", error);
    res.status(500).json({
      error: "Failed to fetch reporting hierarchy",
      details: error.message,
    });
  }
};

// Get available managers for assignment
const getAvailableManagers = async (req, res) => {
  try {
    const { role } = req.user;

    if (!['HR', 'MD'].includes(role)) {
      return res.status(403).json({
        error: "Forbidden: Only HR and MD can view available managers",
      });
    }

    const managers = await prisma.user.findMany({
      where: {
        role: { in: ['MANAGER', 'HR', 'MD'] },
        status: 'Active',
      },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        _count: {
          select: {
            reports: {
              where: { status: 'Active' },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    res.json({
      managers: managers.map(manager => ({
        ...manager,
        currentReportees: manager._count.reports,
      })),
    });
  } catch (error) {
    console.error("Get available managers error:", error);
    res.status(500).json({
      error: "Failed to fetch available managers",
      details: error.message,
    });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  archiveEmployee,
  getReportingHierarchy,
  getAvailableManagers,
};
