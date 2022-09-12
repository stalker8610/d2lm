const fetch = require('node-fetch');

const BUNGIE_API_KEY = 'ed47e3f48b054bd5a323af81c1990a78'

var manifestCollections = new Map();

async function getDataFromCollection(collectionName, id){

    value = manifestCollections.get(collectionName);

    if (value.data == null){
        let json = await fetch(`https://www.bungie.net${path}`, { 'headers': { 'X-API-Key': BUNGIE_API_KEY } }).then(res => res.json())
        value.data = json;
    }

    console.log(value.data);


}

let json = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest', { 'headers': { 'X-API-Key': BUNGIE_API_KEY } })
    .then(res => res.json())

for (let collection in json.Response.jsonWorldComponentContentPath[language]) {
    manifestCollections.set(dict, { path: json.Response.jsonWorldComponentContentPath[language][collection], data: null });
}

console.log(manifestCollections);



// module.exports = manifestRouter