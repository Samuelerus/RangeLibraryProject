const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/user');

const view_owers = async () => {
    const now = Date.now();
    const owers = await User.find({
        books_due: { $elemMatch: { due_date: { $gte: now } } }
    })
        .select('fullname').lean();
    return owers

};

module.exports = view_owers;