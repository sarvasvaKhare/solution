const mongoose = require('mongoose');
const couponSchema = new mongoose.Schema({
    text:String,
    code: String,
    photo: String,
    Name: String,
    Quantity: Number
})
const Coupon = mongoose.model('Coupon',couponSchema)
module.exports = Coupon