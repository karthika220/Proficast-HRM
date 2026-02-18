const prisma = require('../prismaClient');

const applyLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, startDate, endDate, days, reason } = req.body;
    if (!type || !startDate || !endDate || !days) return res.status(400).json({ error: 'Missing required fields' });
    const lr = await prisma.leaveRequest.create({ data: { userId, type, startDate: new Date(startDate), endDate: new Date(endDate), days, reason, status: 'PendingManager' } });
    res.json(lr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const myLeaves = async (req, res) => {
  const userId = req.user.id;
  const leaves = await prisma.leaveRequest.findMany({ where: { userId } });
  res.json(leaves);
};

const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await prisma.user.findUnique({ where: { id: userId } });
    if (!profile) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }
    res.json({
      casual: profile.clBalance || 0,
      sick: profile.slBalance || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllLeaves = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};

    if (status && status !== 'all') {
      // Convert status to proper enum values
      const statusMap = {
        'pending': ['PendingManager', 'PendingHR', 'PendingMD'],
        'PENDING': ['PendingManager', 'PendingHR', 'PendingMD'],
        'approved': 'Approved',
        'APPROVED': 'Approved',
        'rejected': 'Rejected',
        'REJECTED': 'Rejected'
      };
      
      const mappedStatus = statusMap[status];
      if (Array.isArray(mappedStatus)) {
        filter.status = { in: mappedStatus };
      } else if (mappedStatus) {
        filter.status = mappedStatus;
      }
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: filter,
      include: { User: true },
    });
    res.json(leaves);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const pending = async (req, res) => {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        status: { in: ['PendingManager', 'PendingHR', 'PendingMD'] }
      },
      include: { User: true }
    });
    res.json(leaves);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const approve = async (req, res) => {
  try {
    const id = req.params.id;
    const approver = req.user;
    const lr = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!lr) return res.status(404).json({ error: 'Not found' });

    // Manager approves first
    if (approver.role === 'MANAGER' && !lr.approvedByManager && lr.status === 'PendingManager') {
      await prisma.leaveRequest.update({ where: { id }, data: { approvedByManager: true, status: 'PendingHR' } });
      return res.json({ success: true });
    }
    // HR approves second
    if (approver.role === 'HR' && lr.approvedByManager && !lr.approvedByHR && lr.status === 'PendingHR') {
      await prisma.leaveRequest.update({ where: { id }, data: { approvedByHR: true, status: 'PendingMD' } });
      return res.json({ success: true });
    }
    // MD final approval
    if (approver.role === 'MD' && lr.approvedByManager && lr.approvedByHR && !lr.approvedByMD && lr.status === 'PendingMD') {
      // deduct balances
      const profile = await prisma.user.findUnique({ where: { id: lr.userId } });
      if (lr.type === 'CL') {
        await prisma.user.update({ where: { id: lr.userId }, data: { clBalance: Math.max(0, (profile.clBalance || 0) - lr.days) } });
      } else if (lr.type === 'SL') {
        await prisma.user.update({ where: { id: lr.userId }, data: { slBalance: Math.max(0, (profile.slBalance || 0) - lr.days) } });
      }
      await prisma.leaveRequest.update({ where: { id }, data: { approvedByMD: true, status: 'Approved' } });
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Cannot approve now' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

const reject = async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.leaveRequest.update({ where: { id }, data: { status: 'Rejected' } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { applyLeave, myLeaves, pending, approve, reject, getBalance, getAllLeaves };
