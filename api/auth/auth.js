import express from 'express';
import fetch from 'node-fetch';

var authRouter = express();

const BUNGIE_CLIENT_ID = 41031
const BUNGIE_API_KEY = ""
const BUNGIE_AUTH_URL = "https://www.bungie.net/ru/OAuth/Authorize"
const BUNGIE_TOKEN_URL = "https://www.bungie.net/Platform/App/OAuth/token"


function getAuthUrl(state) {

    const authUrl = `${BUNGIE_AUTH_URL}?reauth=true&response_type=code&client_id=${BUNGIE_CLIENT_ID}&state=${encodeURIComponent(state)}`;
    return authUrl;

}

function getToken(code, cb) {

    const urlGetToken = BUNGIE_TOKEN_URL;

    const grant_type = 'authorization_code';

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: 'grant_type=' + encodeURIComponent(grant_type) + '&code=' + encodeURIComponent(code) + '&client_id=' + encodeURIComponent(BUNGIE_CLIENT_ID)
    }

    fetch(urlGetToken, options)
        .then(response => response.json())
        .then(responseJSON => cb(responseJSON));

}

function redirectBack(req, res){

    const backURL = req.session.backURL;
    req.session.backURL = '';
    console.log(`redirect URL = ${backURL}`);

    res.redirect(backURL);

}

/* authRouter.options('/getAuthUrl', (req, res) => {
    console.log('get options');
    res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
    }).status(200).send('OK');
})

authRouter.get('/getAuthUrl', (req, res) => {

    res.status(200).set('Access-Control-Allow-Origin', '*').send(getAuthUrl(req.sessionID));

    // if (req.hostname.localeCompare("d2lm.ru")) {
    //   res.status(200).send(getAuthUrl(req.sessionID));
    // }
    // else res.end();

}) */

function isAuthorized(req){
    return req.session && req.session.token && new Date(req.session.token_expired_at) > new Date(); 
}

function  checkAuth(req, res, next){
    if (!isAuthorized(req)) {
        console.log('checkAuth failed, sent 401 Not authorized')
        res.status(401).json(null);
    }else{
        next();
    }
}



authRouter.get('/', (req, res, next) => {

    if (req.query.state && decodeURIComponent(req.query.state) == req.sessionID) {

        if (req.query.code) {

            console.log(`Got authorization code = ${req.query.code}`);

            getToken(req.query.code, (response) => {
                console.log(`Got authorization token: \n\r${JSON.stringify(response)}`)
                req.session.token = response.access_token;
                req.session.token_expired_at = new Date((new Date()).getTime() + response.expires_in * 1000);
                req.session.membership_id = response.membership_id;
                redirectBack(req, res);
            })

        }

        else if (req.query.error) {
            console.log(`Got error while authorization: ${req.query.error}`,);
            redirectBack(req, res);
        }

        else {
            console.log(`Unexpected server behavior, req = ${req}`);
            redirectBack(req, res);
        }

    }

    else
        redirectBack(req, res);

})

authRouter.get('/isAuthorized', (req, res)=>{
    res.status(200).json({isAuthorized: isAuthorized(req)}); 
})

export { getAuthUrl, checkAuth, authRouter }
