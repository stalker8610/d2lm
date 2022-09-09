let https;
try {
    https = require('https');
} catch (err) {
    console.log('https support is disabled!');
    process.exit(1);
}

const { urlencoded, express } = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
import { authRouter, getAuthUrl} from './api/auth/auth';

var app = express();

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
app.use(express.static(path.join(__dirname, 'client/')));

app.use(async ()=>{
    if (!req.sessionID) {
        await req.session.regenerate();
        console.log('new session generated with ID =', req.sessionID);
    }
})

app.use('/auth', authRouter);

app.get('/login', (req, res)=>{

    if (!req.session.backURL){
        req.session.backURL = req.header('Referer') || '/';
    }

    const authUrl = getAuthUrl();
    console.log(`authUrl = ${authUrl}`);
    res.redirect(authUrl);

})

app.get('*', async (req, res, next) => {

    // if (req.session.token) {
    //   //authorized user
    //   //res.send('Authorized user with token ' + req.session.token);
    //   res.render('main', { token: req.session.token });
    // }
    // else {
    //   res.render('auth', { authUrl: getAuthUrl(req.sessionID) });
    // }

    res.sendFile(path.join(__dirname, 'client/index.html'));

})


https.createServer(options, app).listen(443, () => console.log(`Server started at port 443`));



