const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const register = async (req, res) => {
  const { name, fullName, email, password, role = 'EMPLOYEE', department, phone, employeeId, designation, dateOfJoining } = req.body;
  
  // Support both 'name' and 'fullName' fields
  const userName = fullName || name;
  
  if (!userName || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email exists' });
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({ 
      data: {
        fullName: userName,
        email, 
        password: hash, 
        role,
        ...(employeeId && { employeeId }),
        ...(department && { department }),
        ...(designation && { designation }),
        ...(phone && { phone }),
        ...(dateOfJoining && { dateOfJoining: new Date(dateOfJoining) })
      } 
    });
    
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'change_this_secret');
    res.json({ token, user: { id: user.id, name: user.fullName, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'change_this_secret');
    res.json({ token, user: { id: user.id, name: user.fullName, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { register, login };
