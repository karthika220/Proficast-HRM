const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');
const EmployeeActivityService = require('../services/employeeActivityService');

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

    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { employeeId }] } });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    const hashed = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          employeeId,
          fullName,
          email,
          password: hashed,
          phone: phone || null,
          role,
          department: department || null,
          designation: designation || null,
          workMode: workMode || 'ONSITE',
          reportingManagerId: reportingManagerId || null,
          dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
          status: 'Active',
        },
      });

      // create default leave balances if model exists
      try {
        await tx.leaveBalance.create({ data: { userId: user.id, casual: 8, sick: 8 } });
      } catch (e) {
        // ignore if leaveBalance model not present
      }

      return user;
    });

    // Seed employee activity for the new employee
    try {
      await EmployeeActivityService.seedEmployeeActivity(employeeId);
    } catch (seedError) {
      console.warn('Failed to seed employee activity:', seedError.message);
      // Don't fail the employee creation if seeding fails
    }

    res.status(201).json({ message: 'Employee created', employee: result });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get all employees with access control
const getEmployees = async (req, res) => {
  try {
    const { role, id } = req.user;
    let employees;
    if (role === 'HR' || role === 'MD') {
      employees = await prisma.user.findMany({ where: { status: { not: 'Archived' } } });
    } else if (role === 'MANAGER') {
      employees = await prisma.user.findMany({ where: { reportingManagerId: id, status: { not: 'Archived' } } });
    } else {
      employees = await prisma.user.findMany({ where: { id, status: { not: 'Archived' } } });
    }
    res.json({ count: employees.length, employees });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get employee by ID with access control
const getEmployeeById = async (req, res) => {
  try {
    const { id: employeeId } = req.params;
    const { role, id: userId } = req.user;

    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    if (role === 'HR' || role === 'MD') {
      return res.json({ employee });
    }
    if (role === 'MANAGER' && employee.reportingManagerId === userId) {
      return res.json({ employee });
    }
    if (employeeId === userId) return res.json({ employee });

    return res.status(403).json({ error: "Forbidden: You don't have permission to view this employee" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update employee with access control
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

    if (userRole === "HR" || userRole === "MD") {
      // HR and MD can update any employee
      canUpdate = true;
    } else if (userRole === "MANAGER") {
      // Manager can update direct reports
      canUpdate = existingEmployee.reportingManagerId === userId;
    } else {
      // Employee can update only themselves (limited fields)
      if (id !== userId) {
        return res.status(403).json({
          error: "Forbidden: You can only update your own profile",
        });
      }
      // Employees can only update certain fields
      const allowedFields = ["fullName", "phone", "dob", "gender", "maritalStatus", "currentAddress", "permanentAddress"];
      const updateData = {};
      Object.keys(req.body).forEach((key) => {
        if (allowedFields.includes(key)) {
          updateData[key] = req.body[key];
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: "No valid fields to update. Employees can only update: fullName, phone, dob, gender, maritalStatus, currentAddress, permanentAddress",
        });
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
          updatedAt: true,
        },
      });

      return res.json({
        message: "Employee updated successfully",
        employee: updatedEmployee,
      });
    }

    if (!canUpdate) {
      return res.status(403).json({
        error: "Forbidden: You don't have permission to update this employee",
      });
    }

    // Update only fields sent from profile
    const updateData = {};
    Object.keys(req.body).forEach((key) => {
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
    });

    console.log('Update data:', updateData);

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
        User: {
          select: {
            id: true,
            employeeId: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

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
    const { id: employeeId } = req.params;

    // Check if employee exists
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({
        error: "Employee not found",
      });
    }

    if (employee.status === "Archived") {
      return res.status(400).json({
        error: "Employee is already archived",
      });
    }

    // Soft delete by setting status to "Archived"
    const archivedEmployee = await prisma.user.update({
      where: { id: employeeId },
      data: {
        status: "Archived",
      },
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        email: true,
        status: true,
      },
    });

    res.json({
      message: "Employee archived successfully",
      employee: archivedEmployee,
    });
  } catch (error) {
    console.error("Archive employee error:", error);
    res.status(500).json({
      error: "Failed to archive employee",
      details: error.message,
    });
  }
};

// Get reporting tree for a user
const getReportingTree = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get the user with their reporting manager
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        User: {
          select: {
            id: true,
            fullName: true,
            email: true,
            employeeId: true,
            designation: true,
            department: true,
            workMode: true,
            role: true,
            roleLevel: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get employees reporting to this user
    const departmentMembers = await prisma.user.findMany({
      where: { 
        reportingManagerId: userId,
        status: 'Active'
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        employeeId: true,
        designation: true,
        department: true,
        workMode: true,
        role: true,
        roleLevel: true
      },
      orderBy: { fullName: 'asc' }
    });

    // Get today's attendance for department members
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        userId: { in: departmentMembers.map(member => member.id) },
        date: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });

    // Merge attendance data with department members
    const departmentMembersWithAttendance = departmentMembers.map(member => {
      const attendance = attendanceRecords.find(record => record.userId === member.id);
      return {
        ...member,
        attendance: attendance ? {
          status: attendance.status,
          checkIn: attendance.checkIn,
          checkOut: attendance.checkOut,
          isPresent: !!attendance.checkIn
        } : {
          status: 'ABSENT',
          checkIn: null,
          checkOut: null,
          isPresent: false
        }
      };
    });

    // Get manager's attendance if exists
    let managerAttendance = null;
    if (user.User) {
      const managerAttendanceRecord = await prisma.attendance.findFirst({
        where: {
          userId: user.User.id,
          date: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });

      if (managerAttendanceRecord) {
        managerAttendance = {
          status: managerAttendanceRecord.status,
          checkIn: managerAttendanceRecord.checkIn,
          checkOut: managerAttendanceRecord.checkOut,
          isPresent: !!managerAttendanceRecord.checkIn
        };
      }
    }

    res.json({
      reportingTo: user.User ? {
        ...user.User,
        attendance: managerAttendance || {
          status: 'ABSENT',
          checkIn: null,
          checkOut: null,
          isPresent: false
        }
      } : null,
      departmentMembers: departmentMembersWithAttendance
    });
  } catch (error) {
    console.error('Get reporting tree error:', error);
    res.status(500).json({
      error: 'Failed to fetch reporting tree',
      details: error.message
    });
  }
};

// Get employee activity details
const getEmployeeActivity = async (req, res) => {
  try {
    const { id: userId, role, reportingManagerId } = req.user;
    const { employeeId } = req.params;
    
    // Security validation
    let targetUserId = employeeId;
    
    // If requesting own data, use current user ID
    if (employeeId === 'me') {
      targetUserId = userId;
    } else {
      // Validate access permissions
      if (role === 'EMPLOYEE') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
      
      if (role === 'MANAGER') {
        // Managers can only access their reporting employees
        const employee = await prisma.user.findUnique({
          where: { id: employeeId },
          select: { reportingManagerId: true }
        });
        
        if (!employee || employee.reportingManagerId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied - employee not reporting to you'
          });
        }
      }
      
      // HR and MD have full access
    }
    
    // Get employee activity using the service (handles live/fallback logic)
    const activityData = await EmployeeActivityService.getEmployeeActivity(targetUserId, userId, role);
    
    res.json({
      success: true,
      data: activityData
    });
    
  } catch (error) {
    console.error('Get employee activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee activity',
      details: error.message
    });
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  archiveEmployee,
  getReportingTree,
  getEmployeeActivity,
};
