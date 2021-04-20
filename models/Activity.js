const mongoose = require('mongoose');
const activitySchema = new mongoose.Schema({
    person1: String,
    person2: String,
    id: String,
    data: String,
    image: String,
})
activitySchema.index({ person1: 1, id : 1}, { "unique": false });
const Activity = mongoose.model('activity',activitySchema)
Activity.createIndexes({ person1: 1, id : 1})
module.exports = Activity