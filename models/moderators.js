const mongoose = require('mongoose');
const moderator = mongoose.model('moderator',
{   username: {type:String,index:true,unique:true,required: true},
    organisation: {type:String,required: true},
    email:{type:String,unique:true,required: true},
    password:{type:String,required: true}
})
module.exports = moderator