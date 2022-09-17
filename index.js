let https;
try {
    https = require('https');
} catch (err) {
    console.log('https support is disabled!');
    process.exit(1);
}

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const fs = require('fs');
const path = require('path');
const { authRouter, getAuthUrl } = require('./api/auth/auth');
const { profileRouter } = require('./api/profile/profile');

const dbConnectConfig = require('./dbconnect.config.json');
const sslConfig = require('./ssl.config.json');

var app = express();

app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: 'dd9s02a2f9dsa',
    cookie: { secure: true, sameSite: 'lax' },
    store: MongoStore.create({mongoUrl: `mongodb://${dbConnectConfig.userName}:${dbConnectConfig.password}@${dbConnectConfig.server}:${dbConnectConfig.port}
                                        /d2lm?authSource=${dbConnectConfig.authSource}`})
	
}));

const sslOptions = {
    key: fs.readFileSync(sslConfig.keyPath),
    cert: fs.readFileSync(sslConfig.certPath)
}

app.use(express.urlencoded())
app.use(express.static(path.join(__dirname, 'client/')));

const generateSession = async (req, res, next) => {
    if (!req.sessionID) {
        await req.session.regenerate();
        console.log('new session generated with ID =', req.sessionID);
    }
    next();
}

app.use('/auth', authRouter);
app.use('/api/profile', profileRouter);

app.get('/login', generateSession, (req, res)=>{

    if (!req.session.backURL){
        req.session.backURL = req.header('Referer') || '/';
    }

    const authUrl = getAuthUrl(req.sessionID);
    console.log(`authUrl = ${authUrl}`);
    res.redirect(authUrl);

})

app.get('/logout', (req, res)=>{
	req.session.regenerate(()=>{
        res.redirect('/');
    });
	
})

app.get('*', async (req, res, next) => {
    res.sendFile(path.join(__dirname, 'client/index.html'));
})


https.createServer(sslOptions, app).listen(443, () => console.log(`Server started at port 443`));




