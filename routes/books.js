const express = require('express');
const route = express.Router();
const jwt = require('jsonwebtoken');
const check_jwt_token = require('../middleware/user_auth');
const cloudinary = require('../utils/cloudinary');
const uploader = require('../utils/multer');
const {
    year_range,
    month_range
} = require('../functions/datechanger');


const { Book, Author } = require('../models/book');
const User = require('../models/user');
const { default: mongoose } = require('mongoose');

//to add a book to the inventory
route.post('/add', check_jwt_token, uploader.single("image"), async (req, res) => {
    const { role } = req.user;
    const { book_name, copies, author, ISBN, genre, field, synopsis, publisher, year_published } = req.body;
    //check if book info was entered
    if (!book_name || !copies || !author || !ISBN || !genre) {
        return res.status(400).send({ status: 'error', msg: 'All fields are required' })
    };

    if (role === "member") { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform this task' }) }

    //check if the book already exists
    let match = await Book.findOne({ book_name: book_name }).lean();
    if (match) {
        return res.status(400).send({ status: 'error', msg: 'book already in inventory, add copies instead' });
    }

    try {
        let img_url = "";
        let img_id = "";
        //check if an image was sent
        if (req.file) {
            //upload image to cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "book_covers"
            });
            img_url = result.secure_url;
            img_id = result.public_id;
            console.log(result);
        }

        //add a new book
        const book = new Book();
        book.book_name = book_name;
        book.copies = copies;
        book.lent = 0;
        book.times_borrowed = 0;
        book.author = author;
        book.ISBN = ISBN;
        book.genre = genre;
        book.field = field || undefined;
        book.synopsis = synopsis || undefined;
        book.publisher = publisher || undefined;
        book.year_published = year_published || undefined;
        book.book_cover_url = img_url;
        book.book_cover_id = img_id
        book.timestamp = Date.now();

        //save the book
        await book.save();

        //check if the author of the book already exists
        const e_author = await Author.findOne({ fullname: author });
        if (e_author) {
            await Author.updateOne(
                { fullname: author },
                { $inc: { book_count: +1 } },
            );
            await Author.updateOne(
                { fullname: author },
                {
                    $addToSet: {
                        books: book_name,
                        genres: genre
                    }
                }
            );
            return res.status(200).send({ status: 'ok', msg: 'Book successfully added', book });
        }

        const n_author = new Author();
        n_author.fullname = author;
        n_author.book_count = 1;
        n_author.about = undefined;
        n_author.books = [book_name];
        n_author.genres = [genre];
        await n_author.save();

        return res.status(201).send({ status: 'created', msg: 'Book successfully added', book });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to view all the books in the inventory by first letter
route.get('/A-Z', async (req, res) => {
    const { letter } = req.query;
    const regex = new RegExp("^" + letter, "i");
    const books = await Book.find({ book_name: regex }).select('book_name -_id').sort({ book_name: 1 }).lean();
    let msg = 'Success';
    let count = books.length;
    if (count === 0)
        msg = 'No books'
    return res.status(200).send({ msg, books });
});

//to search books by name
route.get('/search', async (req, res) => {
    const { name } = req.query;
    try {
        //create a regex to search for the books
        const regex = new RegExp("^" + name, "i");
        //search for the books, sort alphabetically and return
        const books = await Book.find({book_name: regex}).select('book_name -_id')
            .sort({ name: 1 })
            .lean();
        let count = books.length;
        let msg = `Success! ${count} result(s) found`;
        if (count === 0)
            msg = 'No result found'
        return res.status(200).send({ msg, books })
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
})

//to search books by other filters
route.get('/search_by_filter', async (req, res) => {
    const { author, genre, field, publisher, year_published } = req.query;

    //build a filter object
    const filter = {};
    if (author) { filter.author = new RegExp('^' + author, 'i'); }
    if (genre) { filter.genre = new RegExp('^' + genre, 'i'); }
    if (field) { filter.field = new RegExp('^' + field, 'i'); }
    if (publisher) { filter.publisher = new RegExp('^' + publisher, 'i'); }
    if (year_published) { filter.year_published = year_published; }


    try {
        const books = await Book.find(filter).select('book_name -_id');
        let msg = 'Success';
        return res.status(200).send({ msg, books });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to preview any single book
route.get('/view_book', async (req, res) => {
    const { name } = req.query;
    //check if a book was sent
    if (!name) {
        return res.status(400).send({ status: 'error', msg: "Enter a book" })
    }
    try {
        const match = await Book.findOne({ book_name: name }).lean();
        let msg = 'Success';
        if (match === null)
            msg = 'No such book'
        return res.status(200).send({ msg, match });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//under review
// //to view any single book and its copies
// route.get('/admin_view_book/:book/:admin_token', async (req, res) => {
//     const { book, admin_token } = req.params;
//     if (admin_token != process.env.ADMIN_TOKEN) { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform admin tasks' }) }

//     const match = await Book.findOne({ book: book }).select('book copies -_id');
//     let msg = 'Success';
//     let count = match.length;
//     if (count === 0)
//         msg = 'No such book'
//     return res.status(200).send({ msg, match });
// });

//to edit a book's information
route.put('/edit_book/:book_id', check_jwt_token, uploader.single("image"), async (req, res) => {
    const { role } = req.user;
    const { book_id } = req.params;
    const { book_name, copies, author, ISBN, genre, field, synopsis, publisher, year_published } = req.body;

    //check if book id was sent
    if (!book_id) { return res.status(400).send({ 'status': 'error', msg: 'No ID' }) }

    //check if the id format is valid
    if (!mongoose.Types.ObjectId.isValid(book_id)) { return res.status(400).send({ 'status': 'error', msg: 'Invalid ID format' }) }

    if (role === "member") { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform this task' }) };

    try {
        //find the book 
        const e_book = await Book.findById(book_id).lean();
        
        //edit it's info
        const book = await Book.findByIdAndUpdate(book_id, {
            book_name: book_name || e_book.book_name,
            copies: copies || e_book.copies,
            author: author || e_book.author,
            ISBN: ISBN || e_book.ISBN,
            genre: genre || e_book.genre,
            field: field || e_book.field,
            synopsis: synopsis || e_book.synopsis,
            publisher: publisher || e_book.publisher,
            year_published: year_published || e_book.year_published
        }, { new: true, __v: 0 }).lean();

        if (!e_book) {
            return res.status(404).send({ 'status': 'error', msg: 'Book not found' })
        };

        return res.status(200).send({ status: 'ok', msg: "Book info edited successfully", book })
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});


//to add copies of a book
route.post('/add_copies', check_jwt_token, async (req, res) => {
    const { role } = req.user;
    const { book_name, copies } = req.body;

    if (role === "member") { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform this task' }) };

    //check if the parameters were sent
    if (!book_name || !copies) {
        return res.status(400).send({ status: 'error', msg: 'Enter all parameters' });
    };

    //check if that book exists
    let found = await Book.findOne({ book_name: book_name }).lean();
    if (!found) { return res.status(404).send({ status: 'error', msg: 'Book not found' }) };

    try {
        //to add copies
        await Book.updateOne(found, { $inc: { copies: +copies } });
        return res.status(200).send({ status: 'ok', msg: `${copies} copies added successfully!` })
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg });
    };
});


//to lend a book to a user
route.put('/lend/:user_id', check_jwt_token, async (req, res) => {
    const { role } = req.user;
    const { user_id } = req.params;
    const { book_name, copies, date_due } = req.body;

    //check if the parameters were sent
    if (!user_id) {
        return res.status(400).send({ status: 'error', msg: 'No id' });
    }
    if (!book_name || !copies || !date_due) {
        return res.status(400).send({ status: 'error', msg: 'Enter all parameters' });
    };

    //check if the id format is valid
    if (!mongoose.Types.ObjectId.isValid(user_id)) { return res.status(400).send({ 'status': 'error', msg: 'Invalid ID format' }) }

    if (role === "member") { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform admin tasks' }) }

    //check if copies of that book remain
    let remaining = await Book.findOne({ book_name: book_name, copies: { $gte: 1 } }).lean();
    if (!remaining) {
        return res.status(404).send({ status: 'error', msg: 'No copies remaining' });
    };

    //check if that user has reached the borrow limit
    let reached = await User.findOne({ _id: user_id, num_due: 5 }).lean();
    if (reached) {
        return res.status(403).send({ status: 'error', msg: 'User has too many books due' });
    };

    try {
        //to lend the book
        let lent_book = await Book.updateOne(
            { book_name: book_name },
            { $inc: { copies: -copies, lent: +copies, times_borrowed: +1 } },
            { new: true }
        ).select('book_name').lean();
        const timestamp = await Date.now();
        const due_date = new Date(date_due);
        await User.updateOne(
            { _id: user_id },
            {
                $inc:
                    { num_due: 1 }
            }
        );
        await User.updateOne(
            { _id: user_id },
            {
                $push: {
                    books_due: {
                        book_name,
                        copies,
                        timestamp,
                        due_date
                    }
                }
            });

        return res.status(200).send({ status: 'ok', msg: `${copies} copies lent successfully!`, lent_book });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg });
    };
});


//to return a book to the inventory
route.put('/return/:user_id', check_jwt_token, async (req, res) => {
    const { role } = req.user;
    const { user_id } = req.params;
    const { book_name, copies } = req.body;

    //check if the parameters were sent
    if (!book_name || !copies || !user_id) {
        return res.status(400).send({ status: 'error', msg: 'Enter all parameters' });
    };

    //check if the id format is valid
    if (!mongoose.Types.ObjectId.isValid(user_id)) { return res.status(400).send({ 'status': 'error', msg: 'Invalid ID format' }) }

    if (role === "member") { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform admin tasks' }) }

    try {
        //to return the book
        await Book.updateOne(
            { book_name: book_name },
            { $inc: { copies: +copies, lent: -copies } },
            { new: true }
        ).select('book_name').lean();
        await User.updateOne(
            { _id: user_id },
            {
                $inc:
                    { num_due: -1 }
            }
        );
        await User.updateOne(
            { _id: user_id },
            {
                $pull: { books_due: { book_name: book_name, copies: copies } }
            });

        return res.status(200).send({ status: 'ok', msg: `${copies} copies returned successfully!` });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg });
    };
});


//to view most borrowed books in total
route.get('/popular', async (req, res) => {
    try {
        //find books and sort them by most popular
        const books = await Book.find({})
            .sort({ times_borrowed: -1 })
            .limit(15);
        if (!books) {
            return res.status(201).send({ status: 'error', msg: "No books" })
        }
        return res.status(200).send({ status: 'ok', msg: 'Success', books });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});


//to view most popular books for the year
route.get('/y_trending', async (req, res) => {
    const { year } = req.query;
    //get all books borrowed that year

    const range = year_range(year);
    try {
        //find books from that year and sort them by most popular
        const books = await Book.find({
            timestamp: { $gte: range[0], $lte: range[1] }
        })
            .sort({ times_borrowed: -1 })
            .limit(15);
        return res.status(200).send({ status: 'ok', msg: 'Success', books });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to view most popular books for the month
route.get('/m_trending', async (req, res) => {
    const { month } = req.query;
    //get all books borrowed that month
    const range = month_range(month);
    try {
        //find books from that month and sort them by most popular
        const books = await Book.find({
            timestamp: { $gte: range[0], $lte: range[1] }
        })
            .sort({ times_borrowed: -1 })
            .limit(15);
        return res.status(200).send({ status: 'ok', msg: 'Success', books });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});


//to delete copies of a book if they have been lost or damaged
route.delete('/delete_copies', check_jwt_token, async (req, res) => {
    const { role } = req.user;
    const { book_name, copies } = req.body;
    //check if the parameters were sent
    if (!book_name || !copies) {
        return res.status(400).send({ status: 'error', msg: 'Enter all parameters' });
    }
    //check the role of the user
    if (role === "member") { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform this task' }) };

    try {
        //to delete copies
        const book = await Book.findOne({book_name: book_name}).lean();
        if (!book) { return res.status(404).send({ status: 'error', msg: 'Book not found' }) };
        if (book.copies < copies) {
            return res.status(400).send({ status: 'error', msg: 'Insufficient copies to delete' });
        }
        await Book.updateOne(
            { book_name: book_name },
            { $inc: { copies: -copies } },
        );
        return res.status(200).send({ status: 'ok', msg: `${copies} copies deleted successfully!` })
    } catch (e) {
        console.error("Error deleting copies ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg });
    }
});

module.exports = route;