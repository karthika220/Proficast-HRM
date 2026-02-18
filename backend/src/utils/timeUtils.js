function isLate(checkInDate) {
  if (!checkInDate) return false;
  const d = new Date(checkInDate);
  const cutoff = new Date(d);
  cutoff.setHours(9, 15, 0, 0);
  return d > cutoff;
}

function hoursBetween(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

module.exports = { isLate, hoursBetween };
