/**
 * Role Authorization Guard Middleware
 * Restricts route access based on validated user permissions.
 * @param {...string} allowedRoles - The roles permitted to pass this gate (e.g., 'ADMIN')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Defend against configuration ordering errors
    if (!req.user) {
      return res.status(500).json({ 
        error: 'Security context missing. Ensure authenticateToken runs before this gate.' 
      });
    }

    // 2. Validate current user role permissions
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access denied. Your role '${req.user.role}' does not have permission to perform this action.` 
      });
    }

    // 3. Authorization verified, pass control down the pipeline cleanly
    next();
  };
};

module.exports = {
  authorizeRoles
};