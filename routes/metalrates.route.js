const { Router } = require("express");

const {

    handleGetMetal,
    handleGetSingleMetal,

    handleMetalDetailAddition,
    handleUpdateMetal,
    handleDeleteMetal,

} = require("../controllers/metalrate.controller");

const {

    restrictToLoggedinUserOnly,
    restrictToAdminOnly,

} = require("../middlewares/authentication");

const router = Router();


/* ===========================
   Public API
=========================== */

router.get("/", handleGetMetal);

router.get("/:id", handleGetSingleMetal);

/* ===========================
   Admin CRUD
=========================== */

router.post(
    "/",
    restrictToLoggedinUserOnly,
    restrictToAdminOnly,
    handleMetalDetailAddition
);

router.put(
    "/:id",
    restrictToLoggedinUserOnly,
    restrictToAdminOnly,
    handleUpdateMetal
);

router.delete(
    "/:id",
    restrictToLoggedinUserOnly,
    restrictToAdminOnly,
    handleDeleteMetal
);

module.exports = router;