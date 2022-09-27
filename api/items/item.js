const express = require('express');
const fetch = require('node-fetch');
const { prepareApiRequest, getDataArrayFromDB } = require('../common');

let itemsRouter = express();

async function getItemData(accessToken, storeMembershipData, itemId){

    let result = { };
    const URL = `/Destiny2/${storeMembershipData.storeMembershipType}/Profile/${storeMembershipData.storeMembershipId}/Item/${itemId}?components=ItemPerks,ItemStats`;
    const reqOptions = prepareApiRequest(URL, accessToken);

    try {
        let response = await fetch(reqOptions.url, { headers: reqOptions.headers })
        if (response.status == 401) {
            throw Error('Not authorized');
        }

        let responseJSON = await response.json();
        let itemPerksData = responseJSON.Response.perks.data.perks.filter((value)=>value.visible); //array of items
        let itemStatsData = responseJSON.Response.stats.data.stats; //object with keys = hashes
        //let itemSocketsData = responseJSON.Response.sockets.data.sockets //array of items

        if (itemPerksData.length > 0) {

            let perks = (await getDataArrayFromDB('DestinySandboxPerkDefinition',
            {
                hash: {
                    $in: itemPerksData.map( (el) => { return el.perkHash } )
                }
            },
            {
                _id: 0,
                hash: 1,
                displayProperties: 1
            }));

            itemPerksData.forEach( (el)=> el.displayProperties = perks.find( (value) => el.perkHash === value.hash) );
            result.perks = itemPerksData;

        }

        if (Object.keys(itemStatsData).length > 0) {

            let stats = (await getDataArrayFromDB('DestinyStatDefinition',
            {
                hash: {
                    $in: Object.keys(itemStatsData).map(el=>Number(el))
                }
            },
            {
                _id: 0,
                hash: 1,
                displayProperties: 1
            }));

            Object.entries(itemStatsData).forEach( ([key,value]) => {
                value.displayProperties = stats.find( (el) => el.hash === value.statHash )
            })

            result.stats = Object.values(itemStatsData);

        }


        return result;

    } catch (err) {
        result.err = err;
        console.log(`Error while getItemData: `, err);
        return result;
    }

}


itemsRouter.get('/:itemId', async (req, res)=>{
    if (!req.session || !req.session.token || (req.session.token_expired_at < new Date()) || !req.session.storeMembershipData) {
        res.status(401).json(null);
    } else {
        const result = await getItemData(req.session.token, req.session.storeMembershipData, req.params.itemId);
        res.status(200).json(result);
    }
})

module.exports = { itemsRouter }
