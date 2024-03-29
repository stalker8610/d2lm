import express from 'express';
import fetch from 'node-fetch';
import { prepareApiRequest, getDataArrayFromDB } from '../common.js';
import { checkAuth } from '../auth/auth.js'

let itemsRouter = express();

async function getItemData(accessToken, storeMembershipData, itemId) {

    let result = {};
    const URL = `/Destiny2/${storeMembershipData.storeMembershipType}/Profile/${storeMembershipData.storeMembershipId}\
    /Item/${itemId}?components=ItemCommonData,ItemInstances,ItemPerks,ItemStats`;
    const reqOptions = prepareApiRequest(URL, accessToken);

    try {
        let response = await fetch(reqOptions.url, { headers: reqOptions.headers })
        if (response.status == 401) {
            throw Error('Not authorized');
        }

        let responseJSON = await response.json();
        if (responseJSON.ErrorCode !== 1) {
            return { err: responseJSON.Message };
        }

        result.characterId = responseJSON.Response.characterId;
        result.itemHash = responseJSON.Response.item.data.itemHash;
        result.itemInstanceId = responseJSON.Response.item.data.itemInstanceId;
        result.isEquipped = responseJSON.Response.instance.data.isEquipped;
        result.itemLevel = responseJSON.Response.instance.data.primaryStat.value;

        if (responseJSON.Response.perks.data) {
            let itemPerksData = responseJSON.Response.perks.data.perks.filter((value) => value.visible); //array of items
            if (itemPerksData.length > 0) {

                let perks = (await getDataArrayFromDB('DestinySandboxPerkDefinition',
                    {
                        hash: {
                            $in: itemPerksData.map((el) => { return el.perkHash })
                        }
                    },
                    {
                        _id: 0,
                        hash: 1,
                        displayProperties: 1
                    }));

                itemPerksData.forEach((el) => Object.assign(el, perks.find((value) => el.perkHash === value.hash)));
                result.perks = itemPerksData;

            }
        }

        if (responseJSON.Response.stats.data) {
            let itemStatsData = responseJSON.Response.stats.data.stats;
            if (Object.keys(itemStatsData).length > 0) {

                let stats = await getDataArrayFromDB('DestinyStatDefinition',
                    {
                        hash: {
                            $in: Object.keys(itemStatsData).map(el => Number(el))
                        }
                    },
                    {
                        _id: 0,
                        hash: 1,
                        'displayProperties.name': 1,
                        statCategory: 1,
                        index: 1,
                    });
                
                 result.stats = stats.map(stData => ({
                    ...stData,
                    value: itemStatsData[stData.hash].value,
                }));

            }
        }

        let itemHashArray = await getDataArrayFromDB('DestinyInventoryItemDefinition',
            {
                hash: result.itemHash
            },
            {
                _id: 0,
                hash: 1,
                displayProperties: 1,
                itemTypeDisplayName: 1,
                screenshot: 1,
            });

        result = { ...result, ...itemHashArray[0] }

        return result;

    } catch (err) {
        result.err = err;
        console.log(`Error while getItemData: `, err);
        return result;
    }

}

async function transferItem(accessToken, storeMembershipData, itemData, transferToVault) {
    let result = {};
    const URL = `/Destiny2/Actions/Items/TransferItem`;
    const reqOptions = prepareApiRequest(URL, accessToken);

    const reqBody = {
        itemReferenceHash: itemData.itemReferenceHash,
        transferToVault,
        itemId: itemData.itemId,
        stackSize: 1,
        characterId: itemData.characterId,
        membershipType: storeMembershipData.storeMembershipType
    }

    try {
        let response = await fetch(reqOptions.url,
            {
                headers: reqOptions.headers,
                method: 'POST',
                body: reqBody
            })

        if (response.status == 401) {
            throw Error('Not authorized');
        }

        let responseJSON = await response.json();
        if (responseJSON.ErrorCode !== 1) {
            return { err: responseJSON.Message };
        }

        return responseJSON;

    } catch (err) {
        result.err = err;
        console.log(`Error while getItemData: `, err);
        return result;
    }
}

itemsRouter.get('/:itemId/transfer', checkAuth, async (req, res) => {
    const result = await transferItem(req.session.token, req.session.storeMembershipData, req.params.itemId);
    if (result.err) {
        res.status(200).json({ error: result.err });
    } else {
        res.status(200).json(result);
    }
})

itemsRouter.get('/:itemId', checkAuth, async (req, res) => {
    const result = await getItemData(req.session.token, req.session.storeMembershipData, req.params.itemId);
    if (result.err) {
        res.status(200).json({ error: result.err });
    } else {
        res.status(200).json(result);
    }
})

export { itemsRouter }
