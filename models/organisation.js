const mongoose = require('mongoose');
const organisation = mongoose.model('organisation',
{   username: {type:String,index:true,unique:true,required: true},
    organisation: {type:String,required: true},
    email:{type:String,unique:true,},
    password:{type:String,required: true},
    website:{type:String,required: true},
    number:{type:String,required: true},
    logo:String,
    tagline:String
})
module.exports = organisation