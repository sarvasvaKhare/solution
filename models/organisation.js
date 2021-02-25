const mongoose = require('mongoose');
const organisation = mongoose.model('organisation',
{   UID: {type:String,unique:true,required: true,index:true},
    orgName: {type:String,unique:true,required: true,index:true},
    orgId:{type:Number,unique:true,require:true,index:true},
    displayName: {type:String},
    email:{type:String,unique:true},
    website:{type:String},
    number:{type:String},
    photo:String,
    tagline:String
})
module.exports = organisation