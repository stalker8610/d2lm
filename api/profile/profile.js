const express = require('express')
const fetch = require('node-fetch');

const BUNGIE_API_KEY = 'ed47e3f48b054bd5a323af81c1990a78'


const prepareApiRequest = (apiUrl, accessToken) => {

    const baseUrl = 'https://www.bungie.net/Platform'

    return {
        url: baseUrl + apiUrl,
        headers: {
            'Authorization': `Bearer  ${accessToken}`,
            'X-API-Key': BUNGIE_API_KEY
        }
    }

}


function getProfileData(membership_id, accessToken, callback) {

    const reqOptions = prepareApiRequest(`/User/GetBungieNetUserById/${membership_id}/`, accessToken);

    fetch(reqOptions.url, { headers: reqOptions.headers })
        .then(
            response => response.json(),
            (err) => {
                console.log(`Error occured while get request to bungie.net:`)
                console.log(`  membership_id = ${membership_id}`)
                console.log(`  request = ${reqOptions}`)
                console.log(`  error = ${err}`);
                callback(err,{});
            })
        .then( json => callback(json) );

}


var profileRouter = express();

profileRouter.get('/', (req, res)=>{

    if (!req.session || !req.session.token || (req.session.token_expired_at < new Date())){
        res.status(401).json({membership_id: ''});
    }else{
        getProfileData(req.session.membership_id, req.session.token, (err=undefined, userData)=>{
            if (err) res.status(500).json({});
            else{
                console.log(userData);
                res.status(200).json(userData);
            } 
        })
    }

})

export default profileRouter

