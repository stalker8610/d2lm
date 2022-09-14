const express = require('express');
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


async function getProfileData(membershipId, accessToken, callback) {

    let result = { err: '', data: null };

    const reqOptions = prepareApiRequest(`/User/GetBungieNetUserById/${membershipId}/`, accessToken);

    //get profile data

    try {
        let response = await fetch(reqOptions.url, { headers: reqOptions.headers });
        if (response.status == 401) {
            result.err = 'Not authorized';
            throw Error('Not authorized');
        }
    } catch (err) {
        if (err != 'Not authorized') console.log(err);
        return result;
    }

    let responseJSON = await response.json();

    result.data.user = {
        bungieMembershipId: membershipId,
        name: responseJSON.Response.displayName,
        imgPath: responseJSON.Response.profilePicturePath
    }

    return result;

}

async function getStoreMembershipData(membershipId, accessToken, callback) {

    let result = {};

    const bungieNetMembershipType = 254;
    const reqOptions = prepareApiRequest(`/User/GetMembershipsById/${membershipId}/${bungieNetMembershipType}/`, accessToken);

    try {
        let response = await fetch(reqOptions.url, { headers: reqOptions.headers });
        if (response.status == 401) {
            result.err = 'Not authorized';
            throw Error('Not authorized');
        }
    } catch (err) {
        if (err != 'Not authorized') console.log(err);
        return result;
    }

    let responseJSON = await response.json();
    if (responseJSON.Response.destinyMemberships.length > 0) {
        result.membershipType = membershipsResponseJSON.Response.destinyMemberships[0].membershipType;
        result.membershipId = membershipsResponseJSON.Response.destinyMemberships[0].membershipId;
    }

    return result;

}

async function getCharactersData(accessToken, storeMembershipData) {

    let result = [];

    const reqOptions = prepareApiRequest(`/Destiny2/${storeMembershipData.membershipType}
                                            /Profile/${storeMembershipData.membershipId}/?components=Characters`, accessToken);

    try {
        let response = fetch(reqOptions.url, { headers: reqOptions.headers })
        if (response.status == 401) {
            result.err = 'Not authorized';
            throw Error('Not authorized');
        }
    } catch (err) {
        if (err != 'Not authorized') console.log(err);
        return result;
    }

    let responseJSON = await response.json();
    let charactersData = responseJSON.Response.characters.data;


    for (let key in charactersData) {
        
        let character = charactersData[key];

        if (character.characterId) {
            result.push({
                id: character.characterId,
                classType: character.classType,
                light: character.light,
                emblemPath: character.emblemPath
            })
        }

    }

    return result;

}




let profileRouter = express();

profileRouter.get('/', async (req, res) => {

    if (!req.session || !req.session.token || (req.session.token_expired_at < new Date())) {
        res.status(401).json(null);
    } else {
        const profileData = await getProfileData(req.session.membership_id, req.session.token);

        if (profileData.err) res.status(401).json(null);
        else {

            const storeMembershipData = await getStoreMembershipData(req.session.membership_id, req.session.token);

            profileData = { ...profileData, ...storeMembershipData };

            const charactersData = await getCharactersData(req.session.membership_id, req.session.token, storeMembershipData)
            profileData = { ...profileData, characters: [...charactersData] };

            res.status(200).json(profileData);

        }
    }

})

module.exports = { profileRouter }

