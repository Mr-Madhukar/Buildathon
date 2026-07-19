const prisma = require('../config/db');

module.exports = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      const trip = await prisma.trip.findUnique({
        where: { id: req.params.id },
        include: { members: { include: { user: true } } }
      });
      if (!trip) return res.status(404).json({ message: 'Trip not found' });
      
      if (trip.ownerId === req.user.id) {
        req.trip = trip;
        req.userRole = 'owner';
        return next();
      }
      
      const member = trip.members.find(m => m.userId === req.user.id);
      if (!member || !requiredRoles.includes(member.role)) {
        return res.status(403).json({ message: 'Access denied: Insufficient permissions for this trip' });
      }
      
      req.trip = trip;
      req.userRole = member.role;
      next();
    } catch {
      res.status(500).json({ message: 'Server error checking roles' });
    }
  };
};
