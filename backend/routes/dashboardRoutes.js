const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const ctrl = require("../controllers/dashboardController");

router.get("/summary", auth, role("VIEWER", "ANALYST", "ADMIN"), ctrl.summary);
router.get("/users", auth, role("ANALYST", "ADMIN"), ctrl.summaryUsers);

module.exports = router;
