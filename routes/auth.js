const express = require('express');
const route = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { welcome_mail, forgot_password_mail } = require("../utils/nodemailer")


const User = require('../models/user');

//endpoint for signing up
//admin
route.post('/sign_up_admin', async (req, res) => {
    const { fullname, phone_no, email, password, role, department, admin_token } = req.body;

    // check for required fields
    if (!fullname || !phone_no || !email || !password || !role || !department || !admin_token)
        return res.status(400).send({ 'status': 'error', msg: 'All details must be inputed' });

    if (password.length < 8) { return res.status(400).send({ 'status': 'error', msg: 'Password must be 8 characters long' }) };

    if (role !== 'admin' || admin_token !== process.env.ADMIN_SIGNUP_TOKEN) { return res.status(403).send({ 'status': 'error', msg: 'You are not authorized to sign up as admin' }) }

    try {
        // check if a user with this email already exists
        let match = await User.find({ email: email }).lean();
        if (match.length > 0) {
            return res.status(400).send({ status: 'error', msg: 'User with this email already exists' });
        }

        // create a user object
        const user = User();
        user.fullname = fullname;
        user.phone_no = phone_no;
        user.email = email;
        user.password = await bcrypt.hash(password, 10);
        user.has_due = 0;
        user.books_due = [];
        user.role = role;
        user.department = department;
        user.is_online = true;
        user.timestamp = Date.now();

        // save user document
        await user.save();
        await welcome_mail(email, fullname);

        const token = jwt.sign(
            { user_id: _id, email: email, role: role, department: department },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1d' }
        );


        return res.status(200).send({ status: 'ok', msg: 'Successfully signed up', token });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});


//member
route.post('/sign_up_member', async (req, res) => {
    const { fullname, phone_no, email, password } = req.body;

    // check for required fields
    if (!fullname || !phone_no || !email || !password) { return res.status(400).send({ 'status': 'error', msg: 'All details must be inputed' }) };

    if (password.length < 8) { return res.status(400).send({ 'status': 'error', msg: 'Password must be 8 characters long' }) };


    try {
        // check if a user with this email already exists
        let match = await User.find({ email: email }).lean();
        if (match.length > 0) {
            return res.status(400).send({ status: 'error', msg: 'User with this email already exists' });
        }

        // create a user object
        const user = User();
        user.fullname = fullname;
        user.phone_no = phone_no;
        user.email = email;
        user.password = await bcrypt.hash(password, 10);
        user.has_due = 0;
        user.books_due = [];
        user.role = "member";
        user.is_online = true;
        user.timestamp = Date.now();

        // save user document
        await user.save();
        await welcome_mail(email, fullname);

        const token = jwt.sign(
            { user_id: _id, email: email, role: "member"},
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1d' }
        );

        return res.status(200).send({ status: 'ok', msg: 'Successfully signed up', user, token });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});



// endpoint to login
route.put('/login', async (req, res) => {
    const { email, password } = req.body;

    // check for required fields
    if (!email || !password) { return res.status(400).send({ 'status': 'error', msg: 'All details must be inputed' }) };

    try {
        // check if a user with this email exists
        let user = await User.findOne({ email: email }).lean();
        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'no user with this email exists' });
        }


        // check for password mismatch
        if (await bcrypt.compare(password, user.password)) {
            // update user document
            await User.updateOne({ email: email }, { is_online: true }, {password: 0}).lean();
            const token = jwt.sign(
                { user_id: _id, email: email },
                process.env.JWT_SECRET_KEY,
                { expiresIn: '1h' }
            );
            return res.status(200).send({ status: 'ok', msg: 'Successful login', user, token });

        }

        return res.status(400).send({ status: 'error', msg: 'incorrect email or password' });

    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//endpoint for forgotten password
route.post('/forgot_password', async (req, res) => {
    const { email } = req.body;

    //check if email was sent
    if (!email)
        return res.status(400).send({ 'status': 'error', msg: 'All details must be inputed' });

    await forgot_password_mail(email);

});

//endpoint to reset password
route.put('/reset_password', async (req, res) => {
    const { token, newpass, confirm } = req.body;

    //verify the token sent
    if (!token) {
        return res.status(403).send({ status: 'error', msg: "You are not authorized for this operation" });
    }
    const { user_id } = jwt.verify(token, process.env.JWT_SECRET_KEY);
    
    //check if both passwords were sent
    if (!newpass || !confirm)
        return res.status(400).send({ 'status': 'error', msg: 'All details must be inputed' });

    //check if the passwords entered match
    if (newpass !== confirm)
        return res.status(400).send({ 'status': 'error', msg: 'Passwords must match' });

    try {
        //check if a user with that id exists
        let user = await User.findById(user_id).lean();
        if (!user) {
            return res.status(404).send({ status: 'error', msg: 'no such user found' });
        }

        //to change password
        const en_pass = await bcrypt.hash(newpass, 10);
        await User.updateOne({ _id: user_id }, { password: en_pass });

        return res.status(200).send({ status: 'ok', msg: 'Password successfully reset', user })

    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to logout
route.put('/logout', async (req, res) => {
    const { token } = req.body;
    //verify the token sent
    if (!token) {
        return res.status(403).send({ status: 'error', msg: "You are not authorized for this operation" });
    }
    const { user_id } = jwt.verify(token, process.env.JWT_SECRET_KEY);

    try {
        //check if a user with the id exists and log them out
        await User.updateOne({ _id: user_id }, { is_online: false }, { new: true, password: 0 });

        return res.status(200).send({ status: 'ok', msg: 'Successful logout'});
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});


module.exports = route;

