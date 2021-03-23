const mongoose = require('mongoose');
const paySchema = new mongoose.Schema({
    UID: String,
    OrgId:String,
    amount:Number,
    id: String,
})
const pay = mongoose.model('payment',paySchema)
module.exports = pay
