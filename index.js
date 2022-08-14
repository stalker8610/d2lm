
let https;
try {
  https = require('https');
} catch (err) {
  console.log('https support is disabled!');
  process.exit(1);
}

const client_id = 41031;

const express = require('express');
const session = require('express-sesion');
const fs = require('fs');

var app = express();

app.set('view engine', 'pug');

app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'dd9s02a2f9dsa',
  cookie: { secure: true }
}));

let keyPath = '/etc/letsencrypt/live/d2lm.ru/privkey.pem';
let certPath = '/etc/letsencrypt/live/d2lm.ru/fullchain.pem';

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
}

app.use(express.urlencoded())

app.use('/auth', (req, res) => {

  if (req.params.state && decodeURIComponent(req.params.state) == req.sessionID) {

    if (req.params.code) {

      console.log(`Got authorization code = ${req.params.code}`);

      getToken(req.params.code, (response) => {
        console.log(`Got authorization token: \n\r${response}`)
        req.session.token = response.access_token;
        res.render('main', {token: response.access_token})
      })
      
    }

    else if (req.params.error) {
      console.log(`Got error while authorization: ${req.params.error}`,);
      res.status(503).send(`Error while authorization: ${req.params.error}`);
    }

    else {
      console.log(`Unexpected server behavior`);
      res.status(500).send(`Some unexpected error`);
    }

  }

  else res.redirect('/');

})

app.use('/', (req, res) => {

  if (!req.sessionID) {
    await req.session.regenerate();
  }

  if (req.session.token) {
    //authorized user
    //res.send('Authorized user with token ' + req.session.token);
    res.render('main', {token: req.session.token});
  }
  else {
    res.render('auth', { authUrl: getAuthUrl(req.sessionID) });
  }

})


function getAuthUrl(state) {

  return `https://www.bungie.net/ru/OAuth/Authorize?response_type=code&client_id=${client_id}&state=${encodeURIComponent(state)}`;

}

function getToken(code, fn) {

  const urlGetToken = 'https://www.bungie.net/Platform/App/OAuth/token';

  const grant_type = 'authorization_code';

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: 'grant_type=' + encodeURIComponent(grant_type) + '&code=' + encodeURIComponent(code) + '&client_id=' + encodeURIComponent(client_id)
  }

  fetch(urlGetToken, options)
    .then(response => response.json())
    .then(fn(response));

}

function makeRequest(req)


https.createServer(options, app).listen(443);



