const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();

//parse JSON data coming in as requests
app.use(express.json());

//import my routes
app.use('/user_auth', require('./routes/auth'));
app.use('/books', require('./routes/books'));


//connect to monogdb using the url in the env variable
mongoose.connect(process.env.MONGO_URI_LOCAL)
.catch(error => console.log(`DB connection error: ${error}`));

const con = mongoose.connection;

//handle errors when opening mongodb
con.on('open', error => {
    if(!error)
    console.log('DB connection successful');
    else
    console.log(`Error connecting to DB: ${error}`)
});

//handle mongoose disconnects from mongodb'
con.on('disconnected', error => {
    console.log(`Mongoose lost connection with MongoDB: ${error}`);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));