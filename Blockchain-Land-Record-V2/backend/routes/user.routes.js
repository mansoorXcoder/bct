const express = require("express");

const router =
    express.Router();

const {
    getCitizens
} = require(
    "../controllers/user.controller"
);


router.get(
    "/citizens",
    getCitizens
);


module.exports = router;