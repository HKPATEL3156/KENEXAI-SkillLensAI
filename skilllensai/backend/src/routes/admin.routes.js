const express = require("express");
const router = express.Router();
const adminCtrl = require("../controllers/admin.controller");

router.post("/login", adminCtrl.login);
router.post("/register", adminCtrl.register);

// protected admin routes
router.get("/users", adminCtrl.verifyAdmin, adminCtrl.getUsers);
router.get(
  "/company-requests",
  adminCtrl.verifyAdmin,
  adminCtrl.getCompanyRequests,
);
router.post(
  "/company-requests/:id/approve",
  adminCtrl.verifyAdmin,
  adminCtrl.approveCompany,
);

module.exports = router;
