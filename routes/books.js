const express = require('express');
const route = express.Router();
const {
    dateformat,
    month_year_format,
    year_only_format
} = require('../utils/datechanger');


const { Book, Author } = require('../models/book');
const User = require('../models/user')

//to add a book to the inventory
route.post('/add', async (req, res) => {
    //object destructuring
    const { book, copies, lent, author, ISBN, genre, field, admin_token } = req.body;
    //check if book name and number of copies were entered
    if (!book || !copies || !author || !ISBN || !genre || !admin_token) { return res.status(400).send({ 'status': 'error', msg: 'All fields are required' }) };


    //check if the person possesses admin authorization
    if (admin_token !== process.env.ADMIN_TOKEN) { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform admin tasks' }) }


    //check if the book already exists
    let match = await Book.find({ book: book }).lean();
    if (match.length > 0) {
        return res.status(400).send({ status: 'error', msg: 'book already in inventory, add copies instead' });
    }

    try {
        //add a new book
        const book = Book();
        book.book = book;
        book.copies = copies;
        book.lent = lent || 0;
        book.author = author;
        book.ISBN = ISBN;
        book.genre = genre;
        book.field = field || undefined;
        book.timestamp = Date.now();

        //save the book
        await book.save();

        return res.status(200).send({ status: 'ok', msg: 'Book successfully added', book });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to view all the books in the inventory by first letter
route.get('/A-Z/:letter', async (req, res) => {
    const books = await Book.find().select('book -_id');
    let msg = 'Success';
    let count = books.length;
    if (count === 0)
        msg = 'No books'
    return res.status(200).send({ msg, books });
});

//to search books by name
route.get('/search/:name', async (req, res) => {
    const { name } = req.params;
    const books = await Book.find({ book: { regex: name, options: 'i' } }, {
        copies: 0, author: 0, lent: 0, ISBN: 0, genre: 0, field: 0, __v: 0, timestamp: 0
    }).lean();
    let count = books.length;
    let msg = `Success! ${count} results found`;
    if (count === 0)
        msg = 'No result found'
    return res.status(200).send({ msg, books })
})

//to search books by other filters
route.get('/search_by_filter/:author/:genre/:field', async (req, res) => {
    const { author, genre, field } = req.params;
    const books = await Book.find({ genre: genre, author: author, field: field }).select('book -_id');
    let msg = 'Success';
    let count = books.length;
    if (count === 0)
        msg = 'No books'
    return res.status(200).send({ msg, books });
});

//to preview any single book
route.get('/view_book/:book', async (req, res) => {
    const { book } = req.params;
    const match = await Book.findOne({ book: book }).select('book -_id');
    let msg = 'Success';
    let count = match.length;
    if (count === 0)
        msg = 'No such book'
    return res.status(200).send({ msg, match });
});

//to view any single book and its copies
route.get('/admin_view_book/:book/:admin_token', async (req, res) => {
    const { book, admin_token } = req.params;
    if (admin_token != process.env.ADMIN_TOKEN) { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform admin tasks' }) }

    const match = await Book.findOne({ book: book }).select('book copies -_id');
    let msg = 'Success';
    let count = match.length;
    if (count === 0)
        msg = 'No such book'
    return res.status(200).send({ msg, match });
});

//to edit a book's information
route.put('/edit_book', async (req, res) => {
    const { book_id, book, copies, author, ISBN, genre, field, master_key } = req.body;
    //check if the master key was sent
    if (!master_key || master_key === process.env.MASTER_KEY) {
        return res.status(403).send({ status: 'error', msg: 'You are not authorized for this operation' });
    }
    try {
        //find the book and edit it's info
        const e_book = await Book.findByIdAndUpdate(book_id, {
            book: book || e_book.book,
            copies: copies || e_book.copies,
            author: author || e_book.author,
            ISBN: ISBN || e_book.ISBN,
            genre: genre || e_book.genre,
            field: field || e_book.field
        }, { __v: 0 }).lean();
        return res.status(200).send({ status: 'ok', msg: "Book info edited successfully", e_book })
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});


//to add copies of a book
route.post('/add_copies', async (req, res) => {
    const { book, copies } = req.body;
    //check if the parameters were sent
    if (!book || !copies) {
        return res.status(400).send({ status: 'error', msg: 'Enter all parameters' });
    };

    //check if that book exists
    let found = await Book.findOne({ book: book }).lean();
    if (found.length === 0) { return res.status(400).send({ status: 'error', msg: 'Book not found' }) };

    try {
        //to add copies
        await Book.updateOne({ book: book }, { $inc: { copies: +copies } });
        return res.status(200).send({ status: 'ok', msg: `${copies} copies added successfully!` })
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg });
    };
});


//to lend a book to a user
route.put('/lend', async (req, res) => {
    const { book, copies, token } = req.body;

    //verify the token sent
        if (!token) {
            return res.status(403).send({ status: 'error', msg: "You are not authorized for this operation" });
        }
        const { user_id } = jwt.verify(token, process.env.JWT_SECRET_KEY);
    
    //check if the parameters were sent
    if (!book || !copies || !user_id || !admin_token) {
        return res.status(400).send({ status: 'error', msg: 'Enter all parameters' });
    };

    if (admin_token !== process.env.ADMIN_TOKEN) { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform admin tasks' }) }

    //check if that book exists
    let found = await Book.findOne({ book: book }).lean();
    if (found.length === 0) { return res.status(400).send({ status: 'error', msg: 'Book not found' }) };

    //check if copies of that book remain
    let exhausted = await Book.findOne({ book: book, copies: 0 }).lean();
    if (exhausted) {
        return res.status(400).send({ status: 'error', msg: 'No copies remaining' });
    };

    //check if that user has reached the borrow limit
    let reached = await User.findOne({ _id: user_id, num_due: 5 }).lean();
    if (reached) {
        return res.status(400).send({ status: 'error', msg: 'User has too many books due' });
    };

    try {
        //to lend the book
        await Book.updateOne({ book: book }, { $inc: { copies: -copies, lent: +copies } });
        let lent_book = Book.findOne({ book: book });
        const timestamp = Date.now();
        await User.updateOne({ _id: user_id }, { $inc: { num_due: 1 } });
        await User.updateOne({ _id: user_id }, { $push: 
            { books_due:
                [lent_book.book] 
            }
    })
        await Book.updateOne({book: book}, {
            $push: {borrow_history: new Date()}
        });
        return res.status(200).send({ status: 'ok', msg: `${lent_copies} copies lent successfully!` });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg });
    };
});


//to return a book to the invenory
route.put('/return', async (req, res) => {
    const { book, copies, user_id, admin_token } = req.body;
    //check if the parameters were sent
    if (!book || !copies || !user_id || !admin_token) {
        return res.status(400).send({ status: 'error', msg: 'Enter all parameters' });
    };

    if (admin_token !== process.env.ADMIN_TOKEN) { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform admin tasks' }) }

    //check if that book exists
    let found = await Book.findOne({ book: book }).lean();
    if (found.length === 0) { return res.status(400).send({ status: 'error', msg: 'Book not found' }) };

    //check if that user has reached the borrow limit
    let reached = await User.findOne({ _id: user_id, num_due: 5 }).lean();
    if (reached) {
        return res.status(400).send({ status: 'error', msg: 'User has too many books due' });
    };

    try {
        //to return the book
        await Book.updateOne({ book: book }, { $inc: { copies: +copies, lent: -copies } });
        let returned_book = Book.findOne({ book: book });
        await User.updateOne({ _id: user_id }, { $inc: { num_due: -1 } });
        await User.updateOne({ _id: user_id }, { $pull: { books_due: returned_book.book } })
        return res.status(200).send({ status: 'ok', msg: `${copies} copies returned successfully!` });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg });
    };

});

//to view most popular books for the month
route.get('/m_trending/:year', async (req, res) => {
    const {year} = req.params;
    //get all books borrowed that year
    const format = Book.aggregate

})



//to delete a book
route.delete('/delete', async (req, res) => {
    //enter book to delete
    const { book } = req.body;

    //check if that book exists
    let found = await Book.findOne({ book: book }).lean();
    if (found.length === 0) { return res.status(400).send({ status: 'error', msg: 'Book not found' }) };

    try {
        //to delete the book
        await Book.deleteOne({ book: book });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

module.exports = route;