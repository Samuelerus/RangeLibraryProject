const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        fullname: String,
        phone_no: String,
        email: String,
        password: String,
        num_due: {type: Number, default: 0},
        books_due: [
            {
                book: {type: String, required: true},
                timestamp: {type: Number, required: true}
            }
        ],
        role: {type: String, enum: ["member", "admin"], default: "member"},
        department: {type: String, default: undefined,},
        is_online: {type: Boolean, default: false},
        timestamp: Number
    },
    {collection: 'users'}
)
userSchema.index({fullname: 1});
userSchema.index({books_due: 1});


const model = mongoose.model('User', userSchema);
module.exports = model;