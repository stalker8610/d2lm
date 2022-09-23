const express = require('express');
const fetch = require('node-fetch');
const { MongoClient } = require('mongodb');

const dbConCfg = require('../../dbconnect.config.json');

const BUNGIE_API_KEY = 'ed47e3f48b054bd5a323af81c1990a78'

var mongoClient;


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


async function getDataArrayFromDB(collectionName, filter, projection) {

    if (!mongoClient) {
        const URL = `mongodb://${dbConCfg.userName}:${dbConCfg.password}@${dbConCfg.server}:${dbConCfg.port}/d2lm?authSource=${dbConCfg.authSource}`;
        mongoClient = new MongoClient(URL);
        await mongoClient.connect();
    }

    const mongoCollection = mongoClient.db('d2lm').collection(collectionName);

    return await mongoCollection.find(filter).project(projection).toArray();

}


async function getProfileData(membershipId, accessToken) {

    let result = { err: '', user: null };

    const reqOptions = prepareApiRequest(`/User/GetBungieNetUserById/${membershipId}/`, accessToken);

    //get profile data

    try {

        let response = await fetch(reqOptions.url, { headers: reqOptions.headers });
        if (response.status == 401) {
            throw Error('Not authorized');
        }

        let responseJSON = await response.json();

        result.user = {
            bungieMembershipId: membershipId,
            name: responseJSON.Response.displayName,
            imgPath: responseJSON.Response.profilePicturePath
        }

        return result;

    } catch (err) {
        result.err = err;
        console.log(`Error while getProfileData: `, err);
        return result;
    }

}

async function getStoreMembershipData(membershipId, accessToken) {

    let result = {};

    const bungieNetMembershipType = 254;
    const reqOptions = prepareApiRequest(`/User/GetMembershipsById/${membershipId}/${bungieNetMembershipType}/`, accessToken);

    try {
        let response = await fetch(reqOptions.url, { headers: reqOptions.headers });
        if (response.status == 401) {
            throw Error('Not authorized');
        }

        let responseJSON = await response.json();
        if (responseJSON.Response.destinyMemberships.length > 0) {
            result.storeMembershipType = responseJSON.Response.destinyMemberships[0].membershipType;
            result.storeMembershipId = responseJSON.Response.destinyMemberships[0].membershipId;
        }

        return result;

    } catch (err) {
        result.err = err;
        console.log(`Error while getStoreMembershipData: `, err);
        return result;
    }

}

async function getCharactersData(accessToken, storeMembershipData) {

    let result = [];

    const URL = `/Destiny2/${storeMembershipData.storeMembershipType}` + `/Profile/${storeMembershipData.storeMembershipId}/?components=Characters`;
    const reqOptions = prepareApiRequest(URL, accessToken);

    try {
        let response = await fetch(reqOptions.url, { headers: reqOptions.headers })
        if (response.status == 401) {
            throw Error('Not authorized');
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

    } catch (err) {
        result.err = err;
        console.log(`Error while getCharactersData: `, err);
        return result;
    }

}

async function getEquipmentData(accessToken, storeMembershipData, characterId) {

    let result = [];
    const URL = `/Destiny2/${storeMembershipData.storeMembershipType}/Profile/${storeMembershipData.storeMembershipId}/Character/${characterId}?components=CharacterEquipment`;
    const reqOptions = prepareApiRequest(URL, accessToken);

    try {
        let response = await fetch(reqOptions.url, { headers: reqOptions.headers })
        if (response.status == 401) {
            throw Error('Not authorized');
        }

        let responseJSON = await response.json();
        let equipmentData = responseJSON.Response.equipment.data.items; //array of items

        let itemHashSet = new Set();

        equipmentData.forEach((el) => {
            result.push(
                {
                    itemHash: el.itemHash,
                    itemInstanceId: el.itemInstanceId,
                    location: el.location,
                    bucketHash: el.bucketHash
                })

            itemHashSet.add(el.itemHash);

        }
        );

        //now append respose by data from definitions

        if (itemHashSet.size > 0) {

            const buckets = await getDataArrayFromDB('DestinyInventoryBucketDefinition',
            {
                location: 1, //inventory
                category: 3 //equipable
            },
            {
                _id: 0,
                hash: 1,
                displayProperties: 1,
                bucketOrder: 1
            });


            let itemHashArray = await getDataArrayFromDB('DestinyInventoryItemDefinition',
                {
                    hash: {
                        $in: Array.from(itemHashSet)
                    }
                },
                {
                    _id: 0,
                    hash: 1,
                    displayProperties: 1,
                    itemTypeDisplayName: 1
                });


            result.forEach((el) => {
                el.data = itemHashArray.find((item) => item.hash === el.itemHash);
                el.data.bucket = buckets.find((bucket) => bucket.hash === el.bucketHash);
            });
      

        }

        return result;

    } catch (err) {
        result.err = err;
        console.log(`Error while getEquipmentData: `, err);
        return result;
    }

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

            req.session.storeMembershipData = storeMembershipData;

            const charactersData = await getCharactersData(req.session.token, storeMembershipData)

            const result = {
                main: profileData.user,
                storeMembership: storeMembershipData,
                characters: [...charactersData]
            };

            res.status(200).json(result);

        }
    }

})

profileRouter.get('/equipment', async (req, res) => {

    if (!req.session || !req.session.token || (req.session.token_expired_at < new Date()) || !req.session.storeMembershipData) {
        res.status(401).json(null);
    } else {
        const result = await getEquipmentData(req.session.token, req.session.storeMembershipData, req.query.characterId);
        res.status(200).json(result);
    }

})

module.exports = { profileRouter }

