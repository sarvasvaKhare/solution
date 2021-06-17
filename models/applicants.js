const mongoose = require('mongoose');
const applicantSchema = new mongoose.Schema({
    email:String,
    orgId:Number,
    Reason: String,
    profilePic:String,
    UID:String,
    name:String
})
const applicant = mongoose.model('applicant',applicantSchema)
module.exports = applicant
