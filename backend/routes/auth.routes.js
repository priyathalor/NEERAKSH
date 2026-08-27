const express = require("express");
const auth = require("../middleware/auth.middleware");

const router = express.Router();

// Verifies a Firebase ID token sent as "Authorization: Bearer <token>"
// and returns the decoded user info. Useful for any future privileged,
// server-side-only operations (e.g. admin review of submissions).
router.get("/verify", auth, (req, res) => {
  res.json({
    message: "Token is valid",
    uid: req.user.uid,
    phone_number: req.user.phone_number || null
  });
});

module.exports = router;
