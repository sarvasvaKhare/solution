const mongoose = require('mongoose');
const applicantSchema = new mongoose.Schema({
    email:String,
    orgId:Number,
    Reason: String,
    ModEmail: String,
    number:String,
    profilePic:String,
    name:String
})
const applicant = mongoose.model('applicant',applicantSchema)
module.exports = applicant
