const mongoose = require('mongoose');

const assessmentTypeSchema = new mongoose.Schema({
    name:{
        type :String,
        required : true
    },
    type:{
        type :String,
        required : true
    },
    status: {
        type : Number,
        default : 0
    }
});

const assessmentType = mongoose.model('assessmentType', assessmentTypeSchema);

module.exports = assessmentType