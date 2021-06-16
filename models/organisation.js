const mongoose = require('mongoose');
const orgSchema = new mongoose.Schema({   
    UID: {type:String,unique:true,required: true,index:true},
    orgName: {type:String,unique:true,required: true,index:true},
    orgId:{type:Number,unique:true,require:true,index:true},
    displayName: {type:String},
    email:{type:String,unique:true},
    website:{type:String},
    number:{type:String},
    photo:String,
    tagline:String,
    posts: Number,
    donation:{
        upiId: String,
        merchantName: String,
        donationLink:String,
        amount:Number,
        showAmount:{
            type:Boolean,
            default: true
        }
    },
    following:[{
        orgId:{type:String},
        orgName:String
    }],
    followers:[{
        id:{type:String},
        name:String
    }],
    enabled:{
        type: Boolean,
        default: false
    }
},{ minimize: false })
const organisation = mongoose.model('organisation',orgSchema)
module.exports = organisation