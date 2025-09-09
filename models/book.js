const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
    {
        book: String,
        copies: Number,
        lent: {type: Number, default: 0},
        borrow_history: [{type: Date}],
        author: String,
        ISBN: String,
        genre: String,
        field: {type: String, default: undefined}, 
        timestamp: Number
    },
    {collection: 'books'}
);
bookSchema.index({book: 1});
bookSchema.index({timestamp: -1});

const authorSchema = new mongoose.Schema(
    {
        firstname: String,
        lastname: String,
        book_count: Number,
        books: {type: Array, default: null},
        genres: Array
    }
)
authorSchema.index({lastname: 1});

const Book = mongoose.model('Book', bookSchema);
const Author = mongoose.model('Author', authorSchema);
module.exports = {Book, Author};