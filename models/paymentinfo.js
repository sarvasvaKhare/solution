const mongoose = require('mongoose');
const payinfoSchema = new mongoose.Schema({
    OrgId:String,
    google:{
        upiId: String,
        merchantName: String
    }
})
const paymentinfo = mongoose.model('paymentinfo',payinfoSchema)
module.exports = paymentinfo