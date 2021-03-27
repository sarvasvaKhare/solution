const mongoose = require('mongoose');
const paySchema = new mongoose.Schema({
    UID: String,
    orgId:String,
    amount:Number,
    id: String,
})
const pay = mongoose.model('payment',paySchema)
module.exports = pay
