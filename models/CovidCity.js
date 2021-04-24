const mongoose = require('mongoose');
const CovidCitySchema = mongoose.Schema({
    city:String,
    photoURL:String,
    id:String,
    contacts:[
        {
            name:String,
            number:Number,
            description:String
        }
    ]
})

const CovidCity = mongoose.model('CovidCity', CovidCitySchema, 'CovidCities')
module.exports = CovidCity