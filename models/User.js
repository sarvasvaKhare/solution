const mongoose = require('mongoose');
const User = mongoose.model('user',
{   displayName:{type:String},
    photo:{type:String},
    UID:{type:String,index:true,unique:true},
    email:{type:String,unique:true},
    Level:{type:Number,required:true},
    following:[{
        orgId:{type:String},
        orgName:String
    }],
    donations:[{
        orgId:{type:String},
        postId:{type:String},
        orgName:{type:String},
        postTitle:{type:String}
    }],
    points: Number
})
module.exports = User