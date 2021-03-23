const mongoose = require('mongoose');
const paySchema = new mongoose.Schema({
    UID: String,
    OrgId:String,
    amount:Number,
})
const pay = mongoose.model('payment',paySchema)
module.exports = pay