const mongoose = require('mongoose');
const CovidCitySchema = mongoose.Schema({
    city:String,
    photoURL:String,
    id:String,
    totalCases:Number,
    recovered:Number,
    orgIds:Array,
    contacts:[
        {
            oxygen:{
                name:String,
                number:Number,
                description:String,
                verified:Boolean
            },
            plasma:{
                name:String,
                number:Number,
                description:String,
                verified:Boolean
            },
            stateHelpline:{
                name:String,
                number:Number,
                description:String,
                verified:Boolean
            },
            medicine:{
                name:String,
                number:Number,
                description:String,
                verified:Boolean,
                medicines:Array    
            }
            

        }
    ],
    essentialLinks:[
        {
            title:String,
            url:String,
            about:String
        }
    ],
    hospitals:[
        {
            name:String,
            beds:{
                total:Number,
                occupied:Number
            }
        }
    ]
})

const CovidCity = mongoose.model('CovidCity', CovidCitySchema, 'Covid')
module.exports = CovidCity