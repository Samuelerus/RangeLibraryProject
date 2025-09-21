const express = require('express');
const route = express.Router();
const jwt = require('jsonwebtoken');
const check_jwt_token = require('../middleware/user_auth');
const view_owers = require('../functions/borrow_stats');
require('dotenv').config;

const User = require('../models/user');
const { Book, Author } = require('../models/book');
const { default: mongoose } = require('mongoose');


//to delete a book
route.delete('/delete_book/:book_id', check_jwt_token, async (req, res) => {
    const { role } = req.user;
    //enter book to delete
    const { book_id } = req.params;
    const { master_key } = req.body;

    //check if an id was sent
    if (!book_id) { return res.status(400), send({ status: 'error', msg: "No id" }) };

    //check if the id format is valid
    if (!mongoose.Types.ObjectId.isValid(book_id)) { return res.status(400).send({ status: 'error', msg: 'Invalid ID format' }) }

    if (role !== "supervisor") { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform this task' }) };


    //check if the master key was sent
    if (!master_key || master_key !== process.env.MASTER_KEY) {
        return res.status(401).send({ status: 'error', msg: 'You are not authorized for this operation' });
    }

    try {
        //to delete the book
        const deleted_book = await Book.findByIdAndDelete(book_id);

        if (!deleted_book) {
            return res.status(404).send({ 'status': 'error', msg: 'Book not found' })
        }
        return res.status(200).send({ status: 'ok', msg: 'Successfully deleted', deleted_book });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to delete any user's profile
route.delete('/force_delete/:user_id', check_jwt_token, async (req, res) => {
    const { role } = req.user;
    //enter the id of the user to be deleted
    const { user_id } = req.params;
    const { master_key } = req.body;

    //check if an id was sent
    if (!user_id) {
        return res.status(400), send({ status: 'error', msg: "No id" })
    };

    //check if the id format is valid
    if (!mongoose.Types.ObjectId.isValid(user_id)) { return res.status(400).send({ status: 'error', msg: 'Invalid ID format' }) }

    if (role !== "supervisor") { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform this task' }) };

    //check if the master key was sent
    if (!master_key || master_key !== process.env.MASTER_KEY) {
        return res.status(401).send({ status: 'error', msg: 'You are not authorized for this operation' });
    }

    try {
        //to delete the user
        const deleted_user = await User.findByIdAndDelete(user_id)
        if (!deleted_user) {
            return res.status(404).send({ 'status': 'error', msg: 'User not found' })
        }

        return res.status(200).send({ status: 'ok', msg: 'Successfully deleted', deleted_user });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to change roles from librarian to supervisor
route.put('/change_role/:user_id', check_jwt_token, async (req, res) => {
    const { role } = req.user;
    const { user_id } = req.params;
    const { promo_key } = req.body;

    //check if an id was sent
    if (!user_id) {
        return res.status(400), send({ status: 'error', msg: "No id" })
    };

    //check if the id format is valid
    if (!mongoose.Types.ObjectId.isValid(user_id)) { return res.status(400).send({ status: 'error', msg: 'Invalid ID format' }) }

    if (role !== "supervisor") {
        return res.status(403).send({ status: 'error', msg: 'You are not authorized to perform this task' })
    };


    //check if the promotion key was sent
    if (!promo_key || promo_key !== process.env.PROMOTION_SPECIAL_KEY) {
        return res.status(401).send({ status: 'error', msg: 'You are not authorized for this operation' });
    }

    try {
        //find the user and change their role from librarian to supervisor
        await User.findByIdAndUpdate(user_id, { role: "supervisor" });
        return res.status(200).send({ status: 'error', msg: "Congratulation! Promotion successful" });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }

});

//to check members owing books
route.get('/view_owers', check_jwt_token, async (req, res) => {
    const { role } = req.user;

    if (role === "member") {
        return res.status(403).send({ status: 'error', msg: "You are not authorized for this operation" })
    }
    const result = await view_owers();
    let msg = `Successful. ${result.length} owers found`;
    let count = result.length;
    if (count === 0)
        msg = 'No owers'
    return res.status(200).send({ msg, result });
});

//to suspend a user
route.put('/suspend/:user_id', check_jwt_token, async (req, res) => {
    const { role } = req.user;
    const { user_id } = req.params;
    const { master_key } = req.body;

    if (role !== "supervisor") {
        return res.status(403).send({ status: 'error', msg: "You are not authorized for this operation" })
    }

    //check if an id was sent
    if (!user_id) {
        return res.status(400), send({ status: 'error', msg: "No id" })
    };

    //check if the id format is valid
    if (!mongoose.Types.ObjectId.isValid(user_id)) { return res.status(400).send({ status: 'error', msg: 'Invalid ID format' }) }

    //check if the master key was sent
    if (!master_key || master_key !== process.env.MASTER_KEY) {
        return res.status(401).send({ status: 'error', msg: 'You are not authorized for this operation' });
    }

    try {
        const user = await User.findByIdAndUpdate(user_id, { suspended: true }).lean();

        if (user.role === "supervisor") {
            return res.status(403).send({ status: 'error', msg: "You cannot suspend a supervisor" })
        }

        return res.status(200).send({ "status": 'ok', msg: `${user.fullname} suspended`, });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to unsuspend a user
route.put('/unsuspend/:user_id', check_jwt_token, async (req, res) => {
    const { role } = req.user;
    const { user_id } = req.params;
    const { master_key } = req.body;

    if (role !== "supervisor") {
        return res.status(403).send({ status: 'error', msg: "You are not authorized for this operation" })
    }

    //check if an id was sent
    if (!user_id) {
        return res.status(400), send({ status: 'error', msg: "No id" })
    };

    //check if the id format is valid
    if (!mongoose.Types.ObjectId.isValid(user_id)) { return res.status(400).send({ status: 'error', msg: 'Invalid ID format' }) }

    //check if the master key was sent
    if (!master_key || master_key !== process.env.MASTER_KEY) {
        return res.status(401).send({ status: 'error', msg: 'You are not authorized for this operation' });
    }

    try {
        const user = await User.findByIdAndUpdate(user_id, { suspended: false }, { new: true }).lean();
        return res.status(200).send({ status: 'ok', msg: `${user.fullname} unsuspended` });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to flag books with low copies
route.get('/low', check_jwt_token, async (req, res) => {
    const { role } = req.user;
    const { master_key } = req.body;

    if (role !== "supervisor") {
        return res.status(403).send({ status: 'error', msg: "You are not authorized for this operation" })
    }

    //check if the master key was sent
    if (!master_key || master_key !== process.env.MASTER_KEY) {
        return res.status(401).send({ status: 'error', msg: 'You are not authorized for this operation' });
    }

    const books = await Book.find({
        copies: { $lte: 5 }
    }).select('book_name');
    let count = books.length;
    let msg = `${count} books are running low!`;
    if (count === 0)
        msg = 'No books with low amount of copies'
    return res.status(200).send({ msg, books });
});

module.exports = route;