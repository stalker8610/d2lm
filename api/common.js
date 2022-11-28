import { MongoClient } from 'mongodb';
import dbConCfg from './dbconnect.config.json' assert { type: "json" };

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

export { prepareApiRequest, getDataArrayFromDB }
