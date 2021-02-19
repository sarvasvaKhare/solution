const mongoose = require('mongoose');
const User = mongoose.model('user',
{   username: {type:String,index:true,unique:true,required:true},
    displayName:{type:String},
    photo:{type:String},
    UID:{type:String,index:true,unique:true},
    email:{type:String,unique:true},
    Level:{type:String,required:true}
})
module.exports = User