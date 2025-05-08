const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  userType:{
    type: String,
    required: true,
  },
  status: {
    type: Number,
    default: 0,
  },
  otp: {
    type: Number,
  },
  otpExpiry: {
    type: Date,
  },
});

const adminUser = mongoose.model('adminUser', UserSchema);



module.exports = adminUser