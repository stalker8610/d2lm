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


function getProfileData(membershipId, accessToken, callback) {

    const reqOptions = prepareApiRequest(`/User/GetBungieNetUserById/${membershipId}/`, accessToken);

    fetch(reqOptions.url, { headers: reqOptions.headers })
        .then(
            (response) => {
                if (response.status == 401) reject();
                else {
                    //console.log(response);
                    return response.json();
                }
            },
            (err) => {
                console.log(`Error occured while get request to bungie.net:`)
                console.log(`  membership_id = ${membershipId}`)
                console.log(`  request = ${reqOptions}`)
                console.log(`  error = ${err}`);
                reject();
            })
        .then(json => callback(json), () => callback(null, 401));

}

async function getGamePlatformMembershipId(membershipId, accessToken, callback) {

    const membershipType = 254; //BungieNext
    const reqOptions = prepareApiRequest(`/User/GetMembershipsById/${membershipId}/${membershipType}/`, accessToken);

    let membershipInfo;
    let membershipsResponseJSON;

    try {
        membershipsResponseJSON = await fetch(reqOptions.url, { headers: reqOptions.headers })
            .then(
                (response) => {
                    if (response.status == 401) reject(); //invalid token
                    else {
                        //console.log(response);
                        return response.json();
                    }
                },
                (err) => {
                    console.log(`Error occured while get request to bungie.net:`)
                    console.log(`  membership_id = ${membershipId}`)
                    console.log(`  request = ${reqOptions}`)
                    console.log(`  error = ${err}`);
                    reject();
                })

    }
    catch (err) {
        console.log(err);
    }

    if (membershipsResponseJSON){

        for(let membership in membershipsResponseJSON.Response.destinyMemberships){
            membershipInfo.membershipType = membership.membershipType;
            membershipInfo.membershipId = membership.membershipId
            break;
        }

    }
     
    return membershipInfo;

}


function getCharactersData(membershipId, accessToken, callback) {

    //first we have to know Steam / Epic store membership ID for further requests
    let membershipData = getGamePlatformMembershipId(membershipId, accessToken, callback)

    if (!membershipData) {
        callback(null);
        return;
    }

    const membershipType = 254; //BungieNet

    const reqOptions = prepareApiRequest(`/Destiny2/${membershipData.membershipType}/Profile/${membershipData.membershipId}/
                                            ?components=Profiles,Characters,CharacterProgressions`, accessToken);

    fetch(reqOptions.url, { headers: reqOptions.headers })
        .then(
            (response) => {
                if (response.status == 401) reject();
                else {
                    //console.log(response);
                    return response.json();
                }
            },
            (err) => {
                console.log(`Error occured while get request to bungie.net:`)
                console.log(`  membership_id = ${membershipId}`)
                console.log(`  request = ${reqOptions}`)
                console.log(`  error = ${err}`);
                reject();
            })
        .then(json => callback(json), () => callback(null, 401));

}

let profileRouter = express();

profileRouter.get('/', (req, res) => {

    if (!req.session || !req.session.token || (req.session.token_expired_at < new Date())) {
        res.status(401).json(null);
    } else {
        getProfileData(req.session.membership_id, req.session.token, (userData, err) => {
            if (err) res.status(401).json(null);
            else {
                console.log(userData);
                res.status(200).json(userData.Response);
            }
        })
    }

})

profileRouter.get('/characters', (req, res) => {

    if (!req.session.membership_id) {
        res.status(401).json(null);
    } else {

        getCharactersData(req.session.membership_id, req.session.token, (userData, err) => {
            if (err) res.status(401).json(null);
            else {
                console.log(userData);
                res.status(200).json(userData.Response);
            }
        })
    }

})

module.exports = { profileRouter }

