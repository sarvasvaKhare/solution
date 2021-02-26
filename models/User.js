const mongoose = require('mongoose');
const User = mongoose.model('user',
{   displayName:{type:String},
    photo:{type:String},
    UID:{type:String,index:true,unique:true},
    email:{type:String,unique:true},
    Level:{type:String,required:true},
    following:[{
        orgId:String,
        orgName:String
    }]
})
module.exports = User