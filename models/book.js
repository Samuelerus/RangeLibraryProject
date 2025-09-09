const mongoose = require('mongoose'); // Import the mongoose library for MongoDB interaction

// Define the schema for the 'Book' collection
const bookSchema = new mongoose.Schema(
    {
        book: String, // Title of the book
        copies: Number, // Total number of copies available
        lent: {type: Number, default: 0}, // Number of copies currently lent out
        borrow_history: [{type: Date}], // Array of dates when the book was borrowed
        author: String, // Author of the book
        ISBN: String, // ISBN number of the book
        genre: String, // Genre of the book
        field: {type: String, default: undefined}, // Optional field for additional categorization
        timestamp: Number // Timestamp for when the book record was created or updated
    },
    {collection: 'books'} // Specify the collection name in the database
);

// Create an index on the 'book' field for faster querying
bookSchema.index({book: 1});

// Create an index on the 'timestamp' field in descending order for sorting
bookSchema.index({timestamp: -1});

// Define the schema for the 'Author' collection
const authorSchema = new mongoose.Schema(
    {
        firstname: String, // First name of the author
        lastname: String, // Last name of the author
        book_count: Number, // Total number of books written by the author
        books: {type: Array, default: null}, // List of books written by the author
        genres: Array // List of genres the author has written in
    }
);

// Create an index on the 'lastname' field for faster querying
authorSchema.index({lastname: 1});

// Create models for the 'Book' and 'Author' schemas
const Book = mongoose.model('Book', bookSchema);
const Author = mongoose.model('Author', authorSchema);

// Export the models for use in other parts of the application
module.exports = {Book, Author};