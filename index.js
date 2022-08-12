
let https;
try {
  https = require('https');
} catch (err) {
  console.log('https support is disabled!');
  process.exit(1);
}

const express = require('express');
const fs = require('fs');

var app = express();

app.use(express.static('static'))

    let keyPath = '/etc/letsencrypt/live/d2lm.ru/privkey.pem';
    let certPath = '/etc/letsencrypt/live/d2lm.ru/fullchain.pem';

 const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
 }

 app.use('/', (req, res)=>{
    res.send('OK');
})


 https.createServer(options, app).listen(443);



