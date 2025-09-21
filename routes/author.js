const express = require('express');
const route = express.Router();
const jwt = require('jsonwebtoken');
const check_jwt_token = require('../middleware/user_auth');
const cloudinary = require('../utils/cloudinary');
const uploader = require('../utils/multer');
const mongoose = require('mongoose');


const { Book, Author } = require('../models/book');

//to add an author
route.post('/add', check_jwt_token, uploader.single("image"), async (req, res) => {
    const { role } = req.user;
    const { fullname, book_count, about, books, genres } = req.body;
    //check if the author's name was entered
    if (!fullname) {
        return res.status(400).send({ status: 'error', msg: "Enter author's name" })
    };

    if (role === member) {
        return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform this task' })
    }

    //check if the author already exists
    let match = await Author.findOne({ fullname: fullname }).lean();
    if (match) {
        return res.status(400).send({ status: 'error', msg: 'Author already exists. Add books instead' });
    }

    try {
        let img_url = "";
        let img_id = "";
        //check if an image was sent
        if (req.file) {
            //upload image to cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "author_pics"
            });
            img_url = result.secure.url;
            img_id = result.public_id;
            console.log(result);
        }

        //add a new author
        const author = Author();
        author.fullname = fullname;
        author.book_count = book_count || 0;
        author.about = about || undefined;
        author.profile_img_url = img_url || undefined;
        author.profile_img_id = img_id || undefined;
        author.books = books || [];
        author.genres = genres || [];
        author.timestamp = Date.now();

        //save the author
        await author.save();
        return res.status(201).send({ status: 'created', msg: 'Author successfully added', author });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to edit an author's information
route.put('/edit_author/:_id', uploader.single("image"), async (req, res) => {
    const { role } = req.user;
    const { _id } = req.params;
    const { fullname, about } = req.body;

    //check if an id was sent
    if (!_id) {
        return res.status(400).send({ 'status': 'error', msg: 'No ID' })
    };

    //check if the id format is valid
    if (!mongoose.Types.ObjectId.isValid(_id)) { return res.status(400).send({ 'status': 'error', msg: 'Invalid ID format' }) }

    if (role === "member") { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to perform this task' }) };

    try {
        //replace picture if sent
        if (req.file) {
            //find the public id and url for the old picture
            let p_author = Author.findById(_id);

            let img_id = p_author.profile_img_id;
            //upload replacement profile pic to cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "range_author_pics",
                public_id: img_id,
                overwrite: true,
            });
            let img_url = result.secure_url;
            //update img_url
            await User.findByIdAndUpdate(user_id, { profile_img_url: img_url })
        }
        //find the author and edit their info
        const author = await Book.findByIdAndUpdate(_id, {
            fullname: fullname || author.fullname,
            about: about || author.about
        }, { new: true, __v: 0 }).lean();

        if (!author) {
            return res.status(404).send({ 'status': 'error', msg: 'Author not found' })
        };

        return res.status(200).send({ status: 'ok', msg: "Book info edited successfully", author })
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});



module.exports = route;
