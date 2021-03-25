const mongoose = require('mongoose');
const activitySchema = new mongoose.Schema({
    person1: String,
    person2: String,
    id: String,
    data: String,
    image: String,
})
activitySchema.index({ person1: 1, id : 1}, { "unique": true });
const Activity = mongoose.model('activity',activitySchema)
module.exports = Activity