// var fs = require("fs");
// var rp = require("request-promise");
// var bodyParser = require("body-parser");
// var infobox = require("wiki-infobox");
// const mongo = require("mongodb");
// var express = require("express");
//
// // params
// const port = 8080;
// const RESULT_LIMIT = 100;
//
// // Api and MongoDB URLs
// const mongoURI = "mongodb://kindred:m4rv3l@ds257648.mlab.com:57648/kindred-marvel";
// const marvelApiAllEventsUrl = 'https://gateway.marvel.com/v1/public/events?limit=100&ts=1575390183429&apikey=da725c95a6cdd0e7ace2765ba70b4b27&hash=a41b24dab9bb86d95cdd16bf6e17cb74'
// const superHeroAPIUrl = 'https://www.superheroapi.com/api.php/2470261009752468/search/';
//
// // express
// const app = express();
//
// var distDir = __dirname + "/dist/";
// var jsonParser = bodyParser.json({limit: 1024 * 1024 * 20, type: "application/json"});
// app.use(express.static(distDir));
// app.use(jsonParser);
//
// // MongoDB
// var eventsCollection;
// var heroesCollection;
// var eventCharactersCollection;
//
// mongo.connect(mongoURI,
//   { useNewUrlParser: true, useUnifiedTopology: true },
//   (err, client) => {
//     if (err) {
//       console.error(err);
//       process.exit(0);
//     }
//     const db = client.db("kindred-marvel");
//     eventsCollection = db.collection("events");
//     heroesCollection = db.collection("heroes");
//     eventCharactersCollection = db.collection("eventCharacters");
//   });
//
// // Routes
//
// // wikipedia API
// app.get("/wiki/:title", getInfoBox);
//
// // Marvel API Cache
// app.post("/events/:id", saveEventData);
// app.get("/events/:id",  getEventData);
// app.get("/events",  getAllEventsData);
//
// // Superhero API Cache
// app.post("/heroes",  saveSuperHeroesArrayData);
// app.get("/heroes/:name",  getSuperHeroData);
// app.post("/heroes/:name",  saveSuperHeroData);
//
// // Cache API calls to DB
// // TODO: change to put after this works
// app.get("/cache/super-heroes",  cacheSuperHeroAPIEntries);
// app.get("/cache/marvel/events", cacheMarvelAPIEvents);
// app.get("/cache/marvel/characters", cacheMarvelAPIEventCharacters);
//
// app.listen(port, () => console.log(`app running on port ${port}`));
//
// // functions
// function saveEventData(req, res) {
//   const eventId = req.body.id;
//   const successMessage = `event ${eventId} data written to DB`;
//   eventsCollection
//     .insertOne(req.body)
//     .then(item => res.status(201).json(successMessage))
//     .catch(err => res.status(503).json(err));
// }
//
// function saveAllEventData(req, res) {
//   const eventId = req.body.id;
//   const successMessage = `event ${eventId} data written to DB`;
//   eventsCollection
//     .insertOne(req.body)
//     .then(item => res.status(201).json(successMessage))
//     .catch(err => res.status(503).json(err));
// }
//
// function saveSuperHeroData(req, res) {
//   const characterName = req.body.name;
//   const successMessage = `character ${characterName} data written to DB`;
//   console.log("writing character` to DB:", characterName);
//   heroesCollection
//     .insertOne(req.body)
//     .then(item => res.status(201).json(successMessage))
//     .catch(err => res.status(503).json(err));
// }
// function saveSuperHeroesArrayData(req, res) {
//   const charactersArray = req.body;
//   const charNames = charactersArray.map(char=> char.name);
//   console.log("writing characters to DB:", charNames);
//   heroesCollection
//     .insertMany(req.body)
//     .then(item => res.status(201).json(charNames))
//     .catch(err => res.status(503).json(err));
// }
//
// function getSuperHeroData(req, res) {
//   const heroNameSubstring = new RegExp(req.params.name, 'i');
//   heroesCollection
//     .find({ name: heroNameSubstring }).toArray()
//     .then(items => res.status(201).json(items))
//     .catch(err => res.status(503).json(err));
// }
//
// function getAllEventsData(req, res) {
//   console.log("getting all events from DB");
//   eventsCollection
//     .findOne({ code : 200 })
//     .then(events => res.status(201).json(events)) //.then(console.log)
//     .catch(err => res.status(503).json(err)).catch(console.error);
// }
// function getEventData(req, res) {
//   const id = req.params.id;
//   eventsCollection
//     .findOne({ id })
//     .then(event => res.status(201).json(event)) //.then(console.log)
//     .catch(err => res.status(503).json(err)).catch(console.error);
// }
//
// function getInfoBox(req, res) {
//   infobox(req.params.title, "en", (err, data) => {
//     if (err) { console.log(err); }
//     res.json(data);
//   });
// }
//
// function cacheSuperHeroAPIEntries(req, res) {
//   const indexCharacters = 'AEIOUYX'.split('');
//   const addUniqueFn = (arr, character) => arr.some(c => c.id === character.id) ? arr : arr.concat([character])
//   const getCharactersPromises = indexCharacters
//     .map(indexChar => rp(superHeroAPIUrl + indexChar).then(JSON.parse));
//     heroesCollection.drop()
//       .then(dropped => Promise.all(getCharactersPromises))
//       .then(characterArrays => characterArrays.map(arr => arr.results).flat())
//       .then(characterArrayFlat => characterArrayFlat.reduce(addUniqueFn, []))
//       .then(uniqueCharacters => heroesCollection.insertMany(uniqueCharacters))
//       .then(cachedCharacters => res.status(201).json(cachedCharacters))
//       .catch(err => res.status(503).json(err))
// }
//
// function tryDropCollectionPromise(collection) {
//   return collection.drop()
//     .catch(err => {
//       if(err.code === 26 || err.codeName === "NamespaceNotFound") {
//         return true;
//       } else {
//         throw err;
//       }
//     });
// }
// function cacheMarvelAPIEvents(req, res) {
//     tryDropCollectionPromise(eventsCollection)
//       .then(dropped => rp(marvelApiAllEventsUrl))
//       .then(JSON.parse)
//       .then(response => response.data.results)
//       .then(events => eventsCollection.insertMany(events))
//       .then(cachedEvents => res.status(201).json(cachedEvents))
//       .catch(err => res.status(503).json(err))
// }
// function eventCharactersUrl(eventId, offset=0) {
//   return marvelApiAllEventsUrl.replace('/events?', `/events/${eventId}/characters?offset=${offset}&`)
// }
// function getEventIds(filter={}) {
//   return eventsCollection
//     .find({})
//     .project({ _id: 0, id: 1, 'characters.available': 1})
//     .toArray()
// }
//
// function chunkApiCall(totalEntries) {
//   const offsets = [];
//   const numChunks = Math.ceil(totalEntries / RESULT_LIMIT);
//   for( let i = 0; i < numChunks; i++){
//     offsets.push(i * RESULT_LIMIT)
//   }
//   return offsets
// }
// function getEventCharactersApiCalls(event) {
//   const offsets = chunkApiCall(event.characters.available);
//   // return offsets.map(offset => eventCharactersUrl(event.id, offset));
//   return {
//     id: event.id,
//     apiCalls: offsets.map(offset => eventCharactersUrl(event.id, offset))
//   };
//
// }
//
// function mergeAllEventsCharacterRequests(perEventCharactersAPICalls) {
//   const perEventCharactersPromiseArrays = perEventCharactersAPICalls.map(mergeCharacterRequestsPromises)
//   return Promise.all(perEventCharactersPromiseArrays);
// }
// function mergeCharacterRequestsPromises(eventCharactersAPICallsArray) {
//   const eventId = eventCharactersAPICallsArray.id;
//   const eventCharactersAPICalls = eventCharactersAPICallsArray.apiCalls;
//   const eventCharactersPromises = eventCharactersAPICalls
//     .map(apiCall => rp(apiCall)
//       .then(JSON.parse)
//       .then(response => response.data.results));
//   return Promise
//     .all(eventCharactersPromises)
//     .then(charactersChunks => ({
//       id: eventId,
//       characters: charactersChunks.flat()
//     }));
// }
// function cacheMarvelAPIEventCharacters(req, res) {
//   // eventCharactersCollection.drop()
//     new Promise((g,d)=>g('yup'))
//     .then(getEventIds)
//     .then(eventIds => eventIds.map(getEventCharactersApiCalls))
//     .then(mergeAllEventsCharacterRequests)
//     .then(eventCharacters => eventCharactersCollection.insertMany(eventCharacters))
//     .then(cachedEventCharacters => res.status(201).json(cachedEventCharacters))
//     .catch(err => console.log(err) || res.status(503).json(err))
// }
// // events/${eventId}/characters




// // wiki
// async function getWikiCategoryEnries(category) {
//   let wikiApiCatergoryQuery = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${category}&cmlimit=max&format=json&exintro`
//   let categoryMembers = [];
//   let hasContinuation = true;
//   let wikiApiCatergoryEntriesResponse = null;
//   let categoryBatchQuery = wikiApiCatergoryQuery;
//   while (hasContinuation) {
//     wikiApiCatergoryEntriesResponse = await rp(categoryBatchQuery)
//       .then(JSON.parse)
//       .catch(console.error);
//     hasContinuation = wikiApiCatergoryEntriesResponse.hasOwnProperty('continue');
//     categoryBatchQuery = wikiApiCatergoryQuery + '&' + getContinuationQuery(wikiApiCatergoryEntriesResponse);
//     categoryMembers = categoryMembers.concat(wikiApiCatergoryEntriesResponse.query.categorymembers)
//   }
//   return categoryMembers;
// }
//
// function extractWikiAttributes(powers) {
//   let powersString = "";
//   if (!powers){
//     return [];
//   }
//   if(Array.isArray(powers)){
//     for (let el of powers) {
//       if (el.type === "link") {
//         powersString += el.text;
//       } else if (el.type === "text") {
//         powersString += el.value;
//       }
//     }
//   }
//   else if (powers.hasOwnProperty('value')){
//     powersString = powers.value;
//   }
//   else if (powers.hasOwnProperty('text')){
//     powersString = powers.text;
//   }
//   const clearWikiField = el => el
//     .replace('}}','')
//     .replace(/<ref>.*<\/ref>/,'')
//     .replace('<ref name','')
//     .trim()
//   let powersArray = powersString.split(/\*|<br\s?\/?>/).filter(x => x !== '');
//   powersArray = powersArray.map(clearWikiField);
//   return powersArray;
// };

// wikiInfobox(wikiTitle.replace(' ','_'), "en", (err, data) => {
//   if (err) {
//     console.log('No wikiInfobox found for ' + wikiTitle);
//     return charData;
//   }
//   charData.alliances =  extractWikiAttributes(data.alliances);
//   charData.powers =     extractWikiAttributes(data.powers);
//   console.log(charData);
//   return charData;
// });
