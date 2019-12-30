const rp = require("request-promise");
const mongo = require("mongodb");
function p(x){console.log(x); return x;}

// params
const port = 8080;
const RESULT_LIMIT = 100;
const CACHE_REFRESH_RATE = 7*24*60*60*1000; //one week

// Api and MongoDB URLs
const mongoURI = "mongodb://kindred:m4rv3l@ds257648.mlab.com:57648/kindred-marvel";
const marvelApiAllEventsUrl = "https://gateway.marvel.com/v1/public/events?limit=100&ts=1575390183429&apikey=da725c95a6cdd0e7ace2765ba70b4b27&hash=a41b24dab9bb86d95cdd16bf6e17cb74";
const marvelApiCharactersUrl = "https://gateway.marvel.com/v1/public/characters?limit=100&ts=1575390183429&apikey=da725c95a6cdd0e7ace2765ba70b4b27&hash=a41b24dab9bb86d95cdd16bf6e17cb74";

// MongoDB
var eventsCollection;
var charactersCollection;
var eventCharactersCollection;

function connectMongoDB(){
  mongo.connect(mongoURI,
    { useNewUrlParser: true, useUnifiedTopology: true },
    (err, client) => {
      if (err) {
        console.error(err);
        process.exit(0);
      }
      const db = client.db("kindred-marvel");
      eventsCollection = db.collection("events");
      charactersCollection = db.collection("characters");
      eventCharactersCollection = db.collection("eventCharacters");
      setInterval(refreshMarvelAPICachePromise, CACHE_REFRESH_RATE)
    });
}

function stringifyEventIds(event) {
  event.id = String(event.id);
  event.characters.forEach(char => char.id = String(char.id));
  return event;
}

function getAllEventsData(req, res) {
  console.log("getting all events from DB");
  eventsCollection
    .find({}).toArray()
    .then(events => res.status(201).json(events)) //.then(console.log)
    .catch(err => res.status(503).json(err))
    .catch(console.error);
}

function getEventData(req, res) {
  const id = +req.params.id;
  console.log(`getting event #${id} from DB`);
  eventsCollection
    .findOne({ id })
    .then(event => res.status(201).json(event)) //.then(console.log)
    .catch(err => res.status(503).json(err)).catch(console.error);
}

function getEventCharacters(req, res) {
  const id = +req.params.id;
  eventCharactersCollection
    .findOne({ id })
    .then(eventCharacters => stringifyEventIds(eventCharacters))
    .then(eventCharacters => res.status(201).json(eventCharacters)) //.then(console.log)
    .catch(err => res.status(503).json(err)).catch(console.error);
}

function mergeApiCallResults(apiCallURLs){
return Promise.all(apiCallURLs.map(
  apiCall =>
    rp(apiCall)
      .then(JSON.parse)
      .then(res => res.data.results)
  ))
  .then(characterBatches => characterBatches.flat())
}
function getAllCharacters(){
  console.log('getting Marvel API Characters');
  return rp(marvelApiCharactersUrl)
    .then(JSON.parse)
    .then(response => response.data.total)
    .then(total => chunkApiCall(total))
    .then(apiCalloffsets => apiCalloffsets.map(offset => marvelApiCharactersUrl + '&offset=' +offset))
    .then(mergeApiCallResults)
    .catch(console.error)
}

function getAllMarvelAPICharacterNames(){
  const extractNames = chars => chars.map(char => char.name);
  return charactersCollection.find({})
    .project({ _id: 0, name: 1 })
    .toArray()
    .then(extractNames);
}

// API cache

function eventCharactersUrl(eventId, offset= 0) {
  return marvelApiAllEventsUrl
    .replace("/events?", `/events/${eventId}/characters?offset=${offset}&`);
}
function getEventIds(filter= {}) {
  return eventsCollection.find({})
    .project({ _id: 0, id: 1, "characters.available": 1}).toArray();
}

function chunkApiCall(totalEntries) {
  const offsets = [];
  const numChunks = Math.ceil(totalEntries / RESULT_LIMIT);
  for ( let i = 0; i < numChunks; i++) {
    offsets.push(i * RESULT_LIMIT);
  }
  return offsets;
}
function getEventCharactersApiCalls(event) {
  const offsets = chunkApiCall(event.characters.available);
  return {
    id: event.id,
    apiCalls: offsets.map(offset => eventCharactersUrl(event.id, offset)),
  };
}

function mergeAllEventsCharacterRequests(perEventCharactersAPICalls) {
  const perEventCharactersPromiseArrays = perEventCharactersAPICalls.map(mergeCharacterRequestsPromises);
  return Promise.all(perEventCharactersPromiseArrays);
}
function mergeCharacterRequestsPromises(eventCharactersAPICallsArray) {
  const eventId = eventCharactersAPICallsArray.id;
  const eventCharactersAPICalls = eventCharactersAPICallsArray.apiCalls;
  const eventCharactersPromises = eventCharactersAPICalls
    .map(apiCall => rp(apiCall)
      .then(JSON.parse)
      .then(response => response.data.results));
  return Promise
    .all(eventCharactersPromises)
    .then(charactersChunks => ({
      id: eventId,
      characters: charactersChunks.flat(),
    }));
}

function tryDropCollectionPromise(collection) {
  return collection.drop()
    .catch(err => {
      if (err.code === 26 || err.codeName === "NamespaceNotFound")
        return true;
      throw err;
    });
}

function cacheMarvelAPIEvents() {
  console.log('Caching Marvel API Events');
  return tryDropCollectionPromise(eventsCollection)
    .then(dropped => rp(marvelApiAllEventsUrl))
    .then(JSON.parse)
    .then(response => response.data.results)
    .then(events => eventsCollection.insertMany(events))
    .catch(console.error);

}
function cacheMarvelAPIEventCharacters() {
  console.log('Caching Marvel API Event Characters');
  return tryDropCollectionPromise(eventCharactersCollection)
    .then(getEventIds)
    .then(eventIds => eventIds.map(getEventCharactersApiCalls))
    .then(mergeAllEventsCharacterRequests)
    .then(eventCharacters => eventCharactersCollection.insertMany(eventCharacters))
    .catch(console.error);
}

function getTotalNumberOfCharacters() {
  rp(marvelApiCharactersUrl)
    .then(JSON.parse)
    .then(response => response.data.total)
}


function cacheMarvelAPICharacters() {
  console.log('Caching Marvel API Characters');
  return tryDropCollectionPromise(charactersCollection)
    .then(getAllCharacters)
    .then(marvelCharacters => charactersCollection.insertMany(marvelCharacters))
    .then(console.log)
    .catch(console.error);
}


// Cache API calls to DB
function refreshMarvelAPICachePromise(){
  return cacheMarvelAPIEvents()
    .then(cacheMarvelAPIEventCharacters)
    .then(cacheMarvelAPICharacters)
}
function refreshMarvelAPICache(req, res) {
  refreshMarvelAPICachePromise()
    .then(cachedEventCharacters => res.status(201).json(cachedEventCharacters))
    .then(success => console.log('marvel API cache refreshed successfully'))
    .catch(err => res.status(503).json(err))
    .catch(console.error);
}

module.exports = function () {
  connectMongoDB();
  this.getEventData = getEventData;
  this.getAllEventsData = getAllEventsData;
  this.getEventCharacters = getEventCharacters;
  this.getAllMarvelAPICharacterNames = getAllMarvelAPICharacterNames;
  this.refreshMarvelAPICache = refreshMarvelAPICache;
}

