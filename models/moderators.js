const mongoose = require('mongoose');
const moderator = mongoose.model('moderator',
{   UID: {type:String,index:true,unique:true,required: true},
    orgID: {type:Number,required: true,index:true},
    email:{type:String,unique:true,required: true},
    access:{type:String,required: true}
})
module.exports = moderator