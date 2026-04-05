const router = require("express").Router();
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const ctrl = require("../controllers/userController");

router.use(auth);

router.get("/me", ctrl.getCurrentUser);
router.get("/", role("ADMIN"), ctrl.listUsers);
router.get("/:id", role("ADMIN"), ctrl.getUserById);
router.post("/", role("ADMIN"), ctrl.createUser);
router.put("/:id", role("ADMIN"), ctrl.updateUser);
router.patch("/:id/status", role("ADMIN"), ctrl.updateUserStatus);
router.delete("/:id", role("ADMIN"), ctrl.deleteUser);

module.exports = router;
