const express = require('express');
const route = express.Router();
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();
const User = require('../models/user');

//to view your profile
route.get('/view/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const profile = await User.findOne({ _id: user_id }, { password: 0, is_online: 0, admin_token: 0, timestamp: 0 });
    let msg = "Success";
    return res.status(200).send({ msg, profile });
});

//to edit your profile
route.put('/edit_profile', async (req, res) => {
    const { user_id, fullname, phone_no, department } = req.body;

    try {
        //check if an id was sent
        if (!user_id) {
            return res.status(400).send({ 'status': 'error', msg: 'No ID' });
        }
        //find the user by their id and update their info
        const user = await User.findByIdAndUpdate(user_id, {
            fullname: fullname || user.fullname,
            phone_no: phone_no || user.phone_no,
            department: department || user.department,
        }, {password: 0, __v: 0}).lean();
        return res.status(200).send({status: 'ok', msg: "Use profile updated successfully", user})
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }
});

//to change your password
route.put('/change_password', async (req, res) => {
    const { user_id, oldpass, newpass, confirm } = req.body;

    //check if all fields are entered
    if (!user_id || !oldpass || !newpass || !confirm)
        return res.status(400).send({ 'status': 'error', msg: 'All details must be inputed' });

    //check if the user exists
    const user = await User.findById(user_id).lean();
    if (!user) { return res.status(400).send({ 'status': 'error', msg: "User does not exist" }) };

    //check if the old password matches
    if (await bcrypt.compare(oldpass, user.password) !== true) {
        return res.status(400).send({ 'status': 'error', msg: "Incorrect Password" })
    }

    //check if the new password entered matches
    if (newpass !== confirm)
        return res.status(400).send({ 'status': 'error', msg: 'Passwords must match' });

    try {
        //to change password
        const en_pass = await bcrypt.hash(newpass, 10);
        await User.updateOne({ _id: user_id }, { password: en_pass }, {password: 0});

        return res.status(200).send({ status: 'ok', msg: 'Password successfully reset', user })
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    }

});

//to delete your account
route.delete('/delete/:user_id', async (req, res) => {
    const { user_id } = req.params;
    //to delete the account
    try {
        const account = await User.findOneAndDelete({ _id: user_id }, { password: 0 });
        let count = account.length;
        if (count === 0) {
            return res.status(404).send({ 'status': 'error', msg: 'User not found' });
        }
        if (account.has_due === true) {
            return res.status(403).send({ 'status': 'error', msg: 'User still has book(s) due. Return books before account deletion' });
        }
        return res.status(200).send({ msg, account });
    } catch (e) {
        console.error("Some error occurred ----->>>", e);
        return res.status(500).send({ status: "error", msg: "some error occurred", error: e.msg })
    };
});



module.exports = route;