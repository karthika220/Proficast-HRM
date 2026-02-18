const prisma = require('../prismaClient');

const monthly = async (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const records = await prisma.attendance.findMany({ where: { date: { gte: start, lt: end } } });
  // simple aggregation
  const byUser = {};
  records.forEach(r => {
    byUser[r.userId] = byUser[r.userId] || { present: 0, late: 0, hours: 0 };
    byUser[r.userId].present += r.status === 'Present' || r.status === 'Late' ? 1 : 0;
    byUser[r.userId].late += r.status === 'Late' ? 1 : 0;
    byUser[r.userId].hours += r.hoursWorked || 0;
  });
  res.json(byUser);
};

const late = async (req, res) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const records = await prisma.attendance.findMany({ where: { date: { gte: start, lt: end }, status: 'Late' }, include: { user: true } });
  res.json(records);
};

module.exports = { monthly, late };
