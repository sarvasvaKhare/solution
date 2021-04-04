const mongoose = require('mongoose');
const feedbackSchema = new mongoose.Schema({
    isUser: Boolean,
    id: String,
    feedback:String
})

const Feedback = mongoose.model('feedback', feedbackSchema);
module.exports = Feedback