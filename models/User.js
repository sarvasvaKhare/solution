const mongoose = require('mongoose');
const User = mongoose.model('user',
{   username: {type:String,index:true,unique:true},
    organisation: String,
    email:{type:String,unique:true},
    password:String
})
module.exports = moderator