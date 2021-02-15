const mongoose = require('mongoose');
const organisation = mongoose.model('organisation',
{   UID: {type:String,unique:true,required: true},
    username: {type:String,unique:true,required: true},
    photo: String,
    organisation: {type:String,required: true},
    email:{type:String,unique:true,},
    website:{type:String,required: true},
    number:{type:String,required: true},
    logo:String,
    tagline:String
})
module.exports = organisation