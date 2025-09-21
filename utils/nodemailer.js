const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});


const welcome_mail_admin = async (email, fullname, profile_link) => {
    let template_path = path.join(__dirname, '..', 'templates', "welcome_email_admin.html");
    let template = fs.readFileSync(template_path, 'utf-8');
    //replace placeholders
    template = template.replace("${fullname}", fullname || "")
        .replace("https://example.com/user-profile", profile_link)

    try {
        const info = await transport
            .sendMail({
                from: `"Range Library" <${process.env.MAIL_USER || "no-reply@gmail.com"}>`,
                to: email,
                subject: `Welcome Email`,
                html: template,
            });
        console.log("email sent successfully")
        return info;
    } catch (e) {
        console.error("Email sending failed ----->>>", e);
        throw new Error("email sending failed")
    }
}


const welcome_mail_member = async (email, fullname, profile_link) => {
    let template_path = path.join(__dirname, '..', 'templates', "welcome_email_member.html");
    let template = fs.readFileSync(template_path, 'utf-8');
    //replace placeholders
    template = template.replace("${fullname}", fullname || "")
        .replace("https://example.com/user-profile", profile_link)

    try {
        const info = await transport
            .sendMail({
                from: `"Range Library" <${process.env.MAIL_USER || "no-reply@gmail.com"}>`,
                to: email,
                subject: `Welcome Email`,
                html: template,
            });
        console.log("email sent successfully")
        return info;
    } catch (e) {
        console.error("Email sending failed ----->>>", e);
        throw new Error("email sending failed")
    }
}


const forgot_password_mail = async (email, reset_link) => {
    let template_path = path.join(__dirname, '..', 'templates', "forgot_password_email.html");
    let template = fs.readFileSync(template_path, 'utf-8');
    //replace placeholders
    template = template.replace("https://example.com/reset-password?token=123456", reset_link)
    try {
        const info = await transport
            .sendMail({
                from: `"Range Library" <${process.env.MAIL_USER || "no-reply@gmail.com"}>`,
                to: email,
                subject: `Password Reset Request`,
                html: template,
            });
        console.log("email sent successfully")
        return info;
    } catch (e) {
        console.error("Email sending failed ----->>>", e);
        throw new Error("email sending failed")
    }
};



const send_otp_email = async (email, otp, expires_in, support_mail) => {
    let template_path = path.join(__dirname, '..', 'templates', "otp_email.html");
    let template = fs.readFileSync(template_path, 'utf-8');
    //replace placeholders
    template = template.replace("${email}", email)
        .replace("${otp}", otp)
        .replace("${expires_in}", expires_in)
        .replace("${support_mail}", support_mail)
    try {
        const info = await transport
            .sendMail({
                from: `"Range Library" <${process.env.MAIL_USER || "no-reply@gmail.com"}>`,
                to: email,
                subject: `Your OTP code`,
                html: template,
            });
        console.log("email sent successfully")
        return info;
    } catch (e) {
        console.error("Email sending failed ----->>>", e);
        throw new Error("email sending failed")
    }
}


module.exports = {
    welcome_mail_admin,
    welcome_mail_member,
    forgot_password_mail,
    send_otp_email
};