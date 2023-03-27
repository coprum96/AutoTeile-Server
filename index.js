const express = require('express');
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv')
dotenv.config();
const port = process.env.PORT || 5000;

app.get('/', async (req, res) => {
    res.send('Fuck you');
 });

app.listen(port, async (req, res) => {
    console.log(`Server is running in ${port}`);
 });