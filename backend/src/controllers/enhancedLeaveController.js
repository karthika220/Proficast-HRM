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

// Helper function to initialize leave balance for new employee
const initializeLeaveBalance = async (userId, dateOfJoining) => {
  try {
    const joinYear = new Date(dateOfJoining).getFullYear();
    
    // Check if leave balance already exists
    const existingBalance = await prisma.leaveBalance.findUnique({
      where: { userId },
    });

    if (!existingBalance) {
      await prisma.leaveBalance.create({
        data: {
          userId,
          casual: 8,
          sick: 8,
          casualUsed: 0,
          sickUsed: 0,
          yearJoined: joinYear,
        },
      });
    }
  } catch (error) {
    console.error('Error initializing leave balance:', error);
  }
};

// Helper function to calculate leave balance
const calculateLeaveBalance = async (userId) => {
  try {
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId },
    });

    if (!balance) {
      // Initialize if not exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { dateOfJoining: true }
      });
      
      if (user?.dateOfJoining) {
        await initializeLeaveBalance(userId, user.dateOfJoining);
        return await calculateLeaveBalance(userId);
      }
      
      return { casual: 8, sick: 8, casualUsed: 0, sickUsed: 0 };
    }

    return balance;
  } catch (error) {
    console.error('Error calculating leave balance:', error);
    return { casual: 8, sick: 8, casualUsed: 0, sickUsed: 0 };
  }
};

// Helper function to update leave balance
const updateLeaveBalance = async (userId, leaveType, days, isUsed = true) => {
  try {
    const balance = await calculateLeaveBalance(userId);
    
    const updateData = {};
    if (leaveType === 'CL') {
      updateData.casualUsed = isUsed ? 
        Math.min(balance.casualUsed + days, balance.casual) : 
        Math.max(balance.casualUsed - days, 0);
    } else if (leaveType === 'SL') {
      updateData.sickUsed = isUsed ? 
        Math.min(balance.sickUsed + days, balance.sick) : 
        Math.max(balance.sickUsed - days, 0);
    }

    await prisma.leaveBalance.update({
      where: { userId },
      data: updateData,
    });

    return await calculateLeaveBalance(userId);
  } catch (error) {
    console.error('Error updating leave balance:', error);
    throw error;
  }
};

// Get leave balance for current user
const getLeaveBalance = async (req, res) => {
  try {
    const { id: userId } = req.user;
    
    const balance = await calculateLeaveBalance(userId);
    
    res.json({
      casual: {
        total: balance.casual,
        used: balance.casualUsed,
        remaining: balance.casual - balance.casualUsed,
      },
      sick: {
        total: balance.sick,
        used: balance.sickUsed,
        remaining: balance.sick - balance.sickUsed,
      },
      yearJoined: balance.yearJoined,
    });
  } catch (error) {
    console.error("Get leave balance error:", error);
    res.status(500).json({
      error: "Failed to fetch leave balance",
      details: error.message,
    });
  }
};

// Submit leave request
const submitLeaveRequest = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { type, startDate, endDate, reason } = req.body;

    if (!type || !startDate || !endDate) {
      return res.status(400).json({
        error: "Missing required fields: type, startDate, endDate",
      });
    }

    // Validate leave type
    if (!['CL', 'SL'].includes(type)) {
      return res.status(400).json({
        error: "Invalid leave type. Must be CL (Casual Leave) or SL (Sick Leave)",
      });
    }

    // Calculate days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) {
      return res.status(400).json({
        error: "End date must be after start date",
      });
    }

    // Check leave balance
    const balance = await calculateLeaveBalance(userId);
    const availableBalance = type === 'CL' ? 
      balance.casual - balance.casualUsed : 
      balance.sick - balance.sickUsed;

    if (availableBalance < days) {
      return res.status(400).json({
        error: `Insufficient ${type === 'CL' ? 'Casual' : 'Sick'} leave balance. Available: ${availableBalance}, Requested: ${days}`,
      });
    }

    // Check for overlapping leave requests
    const overlappingRequest = await prisma.leaveRequest.findFirst({
      where: {
        userId,
        status: {
          in: ['PendingManager', 'PendingHR', 'Approved'],
        },
        OR: [
          {
            startDate: { lte: start },
            endDate: { gte: start },
          },
          {
            startDate: { lte: end },
            endDate: { gte: end },
          },
          {
            startDate: { gte: start },
            endDate: { lte: end },
          },
        ],
      },
    });

    if (overlappingRequest) {
      return res.status(400).json({
        error: "You already have a leave request for this period",
      });
    }

    // Create leave request
    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId,
        type,
        startDate: start,
        endDate: end,
        days,
        reason: reason || null,
        status: 'PendingManager',
      },
    });

    // Get user details for notifications
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, reportingManagerId: true }
    });

    // Notify manager
    if (user?.reportingManagerId) {
      await createNotification(
        user.reportingManagerId,
        'Leave Request',
        `${user.fullName} has submitted a ${type === 'CL' ? 'Casual' : 'Sick'} leave request for ${days} day(s) from ${startDate} to ${endDate}.`,
        'LEAVE_REQUEST'
      );
    }

    // Notify HR
    const hrUsers = await prisma.user.findMany({
      where: { role: 'HR' },
      select: { id: true }
    });

    for (const hr of hrUsers) {
      await createNotification(
        hr.id,
        'Leave Request',
        `${user.fullName} has submitted a ${type === 'CL' ? 'Casual' : 'Sick'} leave request for ${days} day(s) from ${startDate} to ${endDate}.`,
        'LEAVE_REQUEST'
      );
    }

    res.status(201).json({
      message: "Leave request submitted successfully",
      leaveRequest: {
        id: leaveRequest.id,
        type: leaveRequest.type,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        days: leaveRequest.days,
        reason: leaveRequest.reason,
        status: leaveRequest.status,
        createdAt: leaveRequest.createdAt,
      },
    });
  } catch (error) {
    console.error("Submit leave request error:", error);
    res.status(500).json({
      error: "Failed to submit leave request",
      details: error.message,
    });
  }
};

// Get leave requests for current user
const getMyLeaveRequests = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { status, limit = 20, offset = 0 } = req.query;

    let whereClause = { userId };
    if (status) {
      whereClause.status = status;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            employeeId: true,
          },
        },
      },
    });

    res.json({
      count: leaveRequests.length,
      leaveRequests,
    });
  } catch (error) {
    console.error("Get my leave requests error:", error);
    res.status(500).json({
      error: "Failed to fetch leave requests",
      details: error.message,
    });
  }
};

// Get all leave requests (for managers and HR)
const getAllLeaveRequests = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { status, userId: targetUserId, limit = 50, offset = 0 } = req.query;

    let whereClause = {};

    // Managers can see their team's leave requests
    if (role === "MANAGER") {
      const teamMembers = await prisma.user.findMany({
        where: { reportingManagerId: userId },
        select: { id: true },
      });
      const teamMemberIds = teamMembers.map(member => member.id);
      whereClause.userId = { in: teamMemberIds };
    }

    // HR and MD can see all leave requests
    if (role === "HR" || role === "MD") {
      // No restriction on userId
    } else if (role === "EMPLOYEE") {
      // Employees can only see their own requests
      whereClause.userId = userId;
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }

    // Filter by specific user if provided (for HR/MD)
    if (targetUserId && (role === "HR" || role === "MD")) {
      whereClause.userId = targetUserId;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            employeeId: true,
            reportingManager: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.json({
      count: leaveRequests.length,
      leaveRequests,
    });
  } catch (error) {
    console.error("Get all leave requests error:", error);
    res.status(500).json({
      error: "Failed to fetch leave requests",
      details: error.message,
    });
  }
};

// Approve leave request
const approveLeaveRequest = async (req, res) => {
  try {
    const { id: approverId, role } = req.user;
    const { requestId } = req.params;
    const { rejectionReason } = req.body;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            reportingManagerId: true,
          },
        },
      },
    });

    if (!leaveRequest) {
      return res.status(404).json({
        error: "Leave request not found",
      });
    }

    // Check permissions
    let canApprove = false;
    let approvalLevel = '';

    if (role === "MD") {
      canApprove = true;
      approvalLevel = 'MD';
    } else if (role === "HR") {
      canApprove = true;
      approvalLevel = 'HR';
    } else if (role === "MANAGER") {
      // Manager can only approve their direct reports
      canApprove = leaveRequest.user.reportingManagerId === approverId;
      approvalLevel = 'MANAGER';
    }

    if (!canApprove) {
      return res.status(403).json({
        error: "Forbidden: You don't have permission to approve this leave request",
      });
    }

    // Check if already processed
    if (leaveRequest.status === 'Approved' || leaveRequest.status === 'Rejected') {
      return res.status(400).json({
        error: `Leave request already ${leaveRequest.status.toLowerCase()}`,
      });
    }

    let newStatus = '';
    let updateData = {
      approvedByManager: leaveRequest.approvedByManager,
      approvedByHR: leaveRequest.approvedByHR,
      approvedByMD: leaveRequest.approvedByMD,
      approvedBy: approverId,
    };

    if (rejectionReason) {
      // Reject the request
      newStatus = 'Rejected';
      updateData.status = newStatus;
      updateData.rejectionReason = rejectionReason;

      const updatedRequest = await prisma.leaveRequest.update({
        where: { id: requestId },
        data: updateData,
      });

      // Notify employee
      await createNotification(
        leaveRequest.user.id,
        'Leave Request Rejected',
        `Your ${leaveRequest.type === 'CL' ? 'Casual' : 'Sick'} leave request has been rejected. Reason: ${rejectionReason}`,
        'LEAVE_REQUEST'
      );

      return res.json({
        message: "Leave request rejected successfully",
        leaveRequest: updatedRequest,
      });
    }

    // Approve the request
    if (approvalLevel === 'MANAGER') {
      updateData.approvedByManager = true;
      updateData.status = 'PendingHR';
      newStatus = 'PendingHR';
    } else if (approvalLevel === 'HR') {
      updateData.approvedByHR = true;
      updateData.status = 'PendingMD';
      newStatus = 'PendingMD';
    } else if (approvalLevel === 'MD') {
      updateData.approvedByMD = true;
      updateData.status = 'Approved';
      newStatus = 'Approved';
      
      // Update leave balance only when finally approved by MD
      await updateLeaveBalance(leaveRequest.user.id, leaveRequest.type, leaveRequest.days, true);
    }

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: updateData,
    });

    // Notify employee
    await createNotification(
      leaveRequest.user.id,
      'Leave Request Update',
      `Your ${leaveRequest.type === 'CL' ? 'Casual' : 'Sick'} leave request has been ${newStatus.toLowerCase().replace('pending', 'forwarded to')}`,
      'LEAVE_REQUEST'
    );

    // If forwarded to next level, notify them
    if (newStatus === 'PendingHR') {
      const hrUsers = await prisma.user.findMany({
        where: { role: 'HR' },
        select: { id: true }
      });

      for (const hr of hrUsers) {
        await createNotification(
          hr.id,
          'Leave Request Pending',
          `${leaveRequest.user.fullName}'s ${leaveRequest.type === 'CL' ? 'Casual' : 'Sick'} leave request is pending HR approval`,
          'LEAVE_REQUEST'
        );
      }
    } else if (newStatus === 'PendingMD') {
      const mdUsers = await prisma.user.findMany({
        where: { role: 'MD' },
        select: { id: true }
      });

      for (const md of mdUsers) {
        await createNotification(
          md.id,
          'Leave Request Pending',
          `${leaveRequest.user.fullName}'s ${leaveRequest.type === 'CL' ? 'Casual' : 'Sick'} leave request is pending MD approval`,
          'LEAVE_REQUEST'
        );
      }
    }

    res.json({
      message: `Leave request ${newStatus.toLowerCase()} successfully`,
      leaveRequest: updatedRequest,
    });
  } catch (error) {
    console.error("Approve leave request error:", error);
    res.status(500).json({
      error: "Failed to process leave request",
      details: error.message,
    });
  }
};

// Cancel leave request
const cancelLeaveRequest = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { requestId } = req.params;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!leaveRequest) {
      return res.status(404).json({
        error: "Leave request not found",
      });
    }

    // Check if user owns this request
    if (leaveRequest.userId !== userId) {
      return res.status(403).json({
        error: "Forbidden: You can only cancel your own leave requests",
      });
    }

    // Check if already processed
    if (leaveRequest.status === 'Approved') {
      return res.status(400).json({
        error: "Cannot cancel approved leave request",
      });
    }

    // Cancel the request
    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'Rejected',
        rejectionReason: 'Cancelled by employee',
      },
    });

    res.json({
      message: "Leave request cancelled successfully",
      leaveRequest: updatedRequest,
    });
  } catch (error) {
    console.error("Cancel leave request error:", error);
    res.status(500).json({
      error: "Failed to cancel leave request",
      details: error.message,
    });
  }
};

// Get leave statistics
const getLeaveStatistics = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { year } = req.query;
    
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    let whereClause = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Managers can see team statistics
    if (role === "MANAGER") {
      const teamMembers = await prisma.user.findMany({
        where: { reportingManagerId: userId },
        select: { id: true },
      });
      const teamMemberIds = teamMembers.map(member => member.id);
      whereClause.userId = { in: teamMemberIds };
    }

    // HR and MD can see all statistics
    if (role === "HR" || role === "MD") {
      // No restriction
    } else if (role === "EMPLOYEE") {
      // Employees can only see their own statistics
      whereClause.userId = userId;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            employeeId: true,
          },
        },
      },
    });

    // Calculate statistics
    const stats = {
      total: leaveRequests.length,
      pendingManager: leaveRequests.filter(lr => lr.status === 'PendingManager').length,
      pendingHR: leaveRequests.filter(lr => lr.status === 'PendingHR').length,
      pendingMD: leaveRequests.filter(lr => lr.status === 'PendingMD').length,
      approved: leaveRequests.filter(lr => lr.status === 'Approved').length,
      rejected: leaveRequests.filter(lr => lr.status === 'Rejected').length,
      casual: leaveRequests.filter(lr => lr.type === 'CL').length,
      sick: leaveRequests.filter(lr => lr.type === 'SL').length,
      totalDays: leaveRequests.reduce((sum, lr) => sum + lr.days, 0),
    };

    res.json({
      year: currentYear,
      statistics: stats,
    });
  } catch (error) {
    console.error("Get leave statistics error:", error);
    res.status(500).json({
      error: "Failed to fetch leave statistics",
      details: error.message,
    });
  }
};

module.exports = {
  getLeaveBalance,
  submitLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  approveLeaveRequest,
  cancelLeaveRequest,
  getLeaveStatistics,
  initializeLeaveBalance,
  calculateLeaveBalance,
};
