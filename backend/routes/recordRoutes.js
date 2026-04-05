const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const ctrl = require("../controllers/recordController");

router.use(auth);

router.get("/", role("VIEWER", "ANALYST", "ADMIN"), ctrl.getRecords);
router.get("/:id", role("VIEWER", "ANALYST", "ADMIN"), ctrl.getRecordById);
router.post("/", role("VIEWER", "ADMIN"), ctrl.createRecord);
router.put("/:id", role("VIEWER", "ADMIN"), ctrl.updateRecord);
router.delete("/:id", role("VIEWER", "ADMIN"), ctrl.deleteRecord);

module.exports = router;
