// Example: How to protect routes with authentication middleware
const express = require("express");
const router = express.Router();
const { verifyToken, roleGuard } = require("../middleware/auth");

// Example: Protected route - requires authentication
router.get("/profile", verifyToken, (req, res) => {
  // req.user is available after verifyToken middleware
  res.json({
    message: "This is a protected route",
    user: req.user,
  });
});

// Example: Protected route - requires specific role (MD only)
router.get("/admin-only", verifyToken, roleGuard("MD"), (req, res) => {
  res.json({
    message: "This route is only accessible to MD",
    user: req.user,
  });
});

// Example: Protected route - requires multiple roles (MD or HR)
router.get("/management", verifyToken, roleGuard("MD", "HR"), (req, res) => {
  res.json({
    message: "This route is accessible to MD and HR",
    user: req.user,
  });
});

module.exports = router;
