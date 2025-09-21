const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();

//parse JSON data coming in as requests
app.use(express.json());

//import my routes
app.use('/auth', require('./routes/auth'));
app.use('/books', require('./routes/books'));
app.use('/profile', require('./routes/profile'));
app.use('/special', require('./routes/special'));
app.use('/author', require('./routes/author'));


//connect to monogdb using the url in the env variable
mongoose.connect(process.env.MONGO_URI)
    .catch(error => console.log(`DB connection error: ${error}`));

const con = mongoose.connection;

//handle errors when opening mongodb
con.on('open', error => {
    if (!error)
        console.log('DB connection successful, connected to', mongoose.connection.name);
    else
        console.log(`Error connecting to DB: ${error}`)
});

//handle mongoose disconnects from mongodb'
con.on('disconnected', error => {
    console.log(`Mongoose lost connection with MongoDB: ${error}`);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));