const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        fullname: String,
        phone_no: String,
        email: String,
        password: String,
        num_due: { type: Number, default: 0, min: [0] },
        books_due: [
            {
                book_name: { type: String, required: true },
                copies: { type: Number, required: true },
                timestamp: { type: Date, required: true },
                due_date: { type: Date, required: true }
            }
        ],
        role: { type: String, enum: ["member", "librarian", "supervisor"], default: "member" },
        is_online: { type: Boolean, default: false },
        suspended: Boolean,
        is_verified: Boolean,
        profile_img_url: { type: String, default: undefined },
        profile_img_id: { type: String, default: undefined },
        otp: {
            code: String,
            expires_at: Date
        },
        timestamp: Date
    },
    { collection: 'library_users' } // Changed collection name
)
userSchema.index({ fullname: 1 });
userSchema.index({ books_due: 1 });


const model = mongoose.model('User', userSchema);
module.exports = model;