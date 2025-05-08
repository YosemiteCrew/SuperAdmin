const express = require('express');
const bcrypt = require('bcrypt');
const validator = require('validator');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.signIn);

module.exports = router;