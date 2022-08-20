
let https;
try {
  https = require('https');
} catch (err) {
  console.log('https support is disabled!');
  process.exit(1);
}

const client_id = 41031;
const { urlencoded } = require('express');
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');

var app = express();

app.set('view engine', 'pug');

app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'dd9s02a2f9dsa',
  cookie: { secure: true, sameSite: 'lax' }
}));

let keyPath = '/etc/letsencrypt/live/d2lm.ru/privkey.pem';
let certPath = '/etc/letsencrypt/live/d2lm.ru/fullchain.pem';

const options = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
}

app.use(express.urlencoded())

app.use(express.static(path.join(__dirname, 'client/build')));

app.get('/getAuthUrl', (req, res) => {

  res.status(200).send(getAuthUrl(req.sessionID));

  // if (req.hostname.localeCompare("d2lm.ru")) {
  //   res.status(200).send(getAuthUrl(req.sessionID));
  // }
  // else res.end();

})

app.get('/auth', (req, res, next) => {

  if (req.query.state && decodeURIComponent(req.query.state) == req.sessionID) {

    if (req.query.code) {

      console.log(`Got authorization code = ${req.query.code}`);

      getToken(req.query.code, (response) => {
        console.log(`Got authorization token: \n\r${JSON.stringify(response)}`)
        req.session.token = response.access_token;
        //res.render('main', { token: response.access_token })
        res.redirect(`/?sessionId=${urlencoded(req.sessionID)}`);
      })

    }

    else if (req.query.error) {
      console.log(`Got error while authorization: ${req.query.error}`,);
      res.redirect(`/?authError=${urlencoded(req.query.error)}`);
      //res.status(503).send(`Error while authorization: ${req.query.error}`);
    }

    else {
      console.log(`Unexpected server behavior`);
      res.redirect(`/?authError=${urlencoded("Unexpected server behavior")}}`);
      //res.status(500).send(`Some unexpected error`);
    }

  }

  else 
    res.redirect('/');
    //next();

})

app.get('/logout', (req, res) => {

  req.session.regenerate(() => {
    res.status(200).send('Logout done successfully');
  });

});

app.get('*', async (req, res) => {

 console.log('get in *');
 
 if (!req.sessionID) {
    await req.session.regenerate();
  }

  // if (req.session.token) {
  //   //authorized user
  //   //res.send('Authorized user with token ' + req.session.token);
  //   res.render('main', { token: req.session.token });
  // }
  // else {
  //   res.render('auth', { authUrl: getAuthUrl(req.sessionID) });
  // }

})



function getAuthUrl(state) {

	console.log('getAuthUrl');
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
    .then(responseJSON => fn(responseJSON));

}

https.createServer(options, app).listen(443, ()=> console.log(`Server started at port 443`));



