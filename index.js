const express = require('express');
const https = require('https');
const fs = require('fs');

var app = express();

app.use(express.static('static'))

/* const options = {
    key: fs
} */

app.use('/', (req, res)=>{
    res.send('OK');
})

app.listen(80);