const mongoose = require('mongoose');
const payinfoSchema = new mongoose.Schema({
    OrgId:String,
    payments:{
        type: Map,
        of : new mongoose.Schema({
            upiId:String,
            merchantName:String
        })
    }
})
const paymentinfo = mongoose.model('paymentinfo',payinfoSchema)
module.exports = paymentinfo