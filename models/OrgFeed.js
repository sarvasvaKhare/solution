const mongoose = require('mongoose');
const orgSchema = new mongoose.Schema({
    Type:{type:String,index:true},
    photoUrl: {type:String},
    targetAmount: {type:Number},
    reachedAmount: {type:Number},
    Title: {type:String},
    Caption: {type:String},
    detailedInfo: {type:String},
    blogLink: {type:String},
    Shoutout:[{
        displayName:{type:String},
        profileUID:{type:String}
    }
    ],
    orgId:{type:Number,index:true},
    likes:[{
        userId:{type:String},
        amount:{type:Number}
    }],
    orgName: String,
    liked: {type:Boolean},
    orgPhoto: String
},{timestamps:true})
const OrgFeed = mongoose.model('OrgFeed',orgSchema,'OrgFeed')
module.exports = OrgFeed