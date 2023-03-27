const express = require('express');
const app = express()
const port = process.env.PORT || 5000;

app.get('/', async (req, res) => {
    res.send('hello world');
 });

app.listen(port, async (req, res) => {
    console.log(`Server is running in ${port}`);
 });