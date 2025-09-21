const mongoose = require('mongoose'); // Import the mongoose library for MongoDB interaction

// Define the schema for the 'Book' collection
const bookSchema = new mongoose.Schema(
    {
        book_name: String, // Title of the book
        copies: Number, // Total number of copies available
        lent: { type: Number, default: 0 }, // Number of copies currently lent out
        times_borrowed: { type: Number, default: 0 },
        author: String, // Author of the book
        ISBN: String, // ISBN number of the book
        genre: String, // Genre of the book
        field: { type: String, default: undefined }, // Optional field for additional categorization
        synopsis: String, // Brief summary or description of the book,
        publisher: String, // Publisher of the book,
        year_published: Number, // Year the book was published,
        book_cover_url: String,
        book_cover_id: String,
        timestamp: Date // Timestamp for when the book record was created or updated
    },
    { collection: 'books' } // Specify the collection name in the database
);

// Create an index on the 'book' field for faster querying
bookSchema.index({ book_name: 1 });

// Create an index on the 'timestamp' field in descending order for sorting
bookSchema.index({ timestamp: -1 });

// Define the schema for the 'Author' collection
const authorSchema = new mongoose.Schema(
    {
        fullname: { type: String, required: true }, // Full name of the author
        book_count: { type: Number, default: 0 }, // Total number of books written by the author
        about: { type: String, default: null }, // Short biography or description of the author
        profile_img_url: { type: String, default: undefined }, // URL of the author's profile image
        profile_img_id: { type: String, default: undefined }, // ID of the author's profile image in cloud storage
        books: { type: Array, default: null }, // List of books written by the author
        genres: { type: Array, default: null }, // List of genres the author has written in
        timestamp: Date
    }
);

// Create an index on the 'lastname' field for faster querying
authorSchema.index({ fullname: 1 });

// Create models for the 'Book' and 'Author' schemas
const Book = mongoose.model('Book', bookSchema);
const Author = mongoose.model('Author', authorSchema);

// Export the models for use in other parts of the application
module.exports = { Book, Author };