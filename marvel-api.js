const rp = require("request-promise");
const mongo = require("mongodb");

// params
const RESULT_LIMIT = 100;
const CACHE_REFRESH_RATE = 7*24*60*60*1000; //one week

// marvel API and MongoDB URLs
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

function getAllEventsData(req, res) {
  console.log("getting all events from DB");
  eventsCollection
    .find({}).toArray()
    .then(events => res.status(201).json(events))
    .catch(err => res.status(503).json(err))
    .catch(console.error);
}

function getEventData(req, res) {
  const id = +req.params.id;
  console.log(`getting event #${id} from DB`);
  eventsCollection
    .findOne({ id })
    .then(event => res.status(201).json(event))
    .catch(err => res.status(503).json(err)).catch(console.error);
}

function getEventCharacters(req, res) {
  const id = +req.params.id;
  eventCharactersCollection
    .findOne({ id })
    .then(eventCharacters => res.status(201).json(eventCharacters))
    .catch(err => res.status(503).json(err)).catch(console.error);
}
function getAllEventsCharacters(){
  return eventCharactersCollection
    .distinct("characters.id")
    .then(uniqueIds => charactersCollection
      .find({id: { $in: uniqueIds }})
      .toArray())
    .catch(console.error)
}
function expressGetAllEventsCharacters(req,res){
  return getAllEventsCharacters()
    .then(eventCharacters => res.status(201).json(eventCharacters))
    .catch(err => res.status(503).json(err)).catch(console.error);
}
function filterResponseFields(apiResponseArray){
  const filterFields =  ({id, name, description, thumbnail, events, characters, urls}) =>
                        ({id, name, description, thumbnail, events, characters, urls});
  return apiResponseArray.map(filterFields);
}
function marvelApiGET(uri){
  return rp({ uri , json: true })
    .then(res => res.data.results)
    .then(filterResponseFields)
    .catch(console.error);
}
function mergeApiCallResults(apiCallURLs){
return Promise
  .all(apiCallURLs.map(marvelApiGET))
  .then(resultBatches => resultBatches.flat())
}

function getTotalNumberOfCharacters() {
  return rp(marvelApiCharactersUrl)
    .then(JSON.parse)
    .then(response => response.data.total)
}

function getAllCharacters(){
  console.log('getting Marvel API Characters');
  return getTotalNumberOfCharacters()
    .then(total => chunkApiCall(total))
    .then(apiCallOffsets => apiCallOffsets.map(offset => marvelApiCharactersUrl + '&offset=' +offset))
    .then(mergeApiCallResults)
    .catch(console.error)
}

function getAllMarvelAPICharacterNames(){
  const extractNames = chars => chars.map(char => char.name);
  return charactersCollection.find({})
    .project({ _id: 0, name: 1 })
    .toArray()
    .then(extractNames)
}

// API cache
function eventCharactersRequestURI(eventId, offset= 0) {
  return marvelApiAllEventsUrl
    .replace("/events?", `/events/${eventId}/characters?offset=${offset}&`);
}
function getEventIdsAndCount(filter= {}) {
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

function tryDropCollectionPromise(collection) {
  return collection.drop()
    .catch(err => {
      if (err.code === 26 || err.codeName === "NamespaceNotFound")
        return true;
      throw err;
    });
}

function getAllEventCharacters({id, characters}) {
  const chunkOffsets = chunkApiCall(characters.available);
  const chunkOffsetRequests = chunkOffsets.map(offset => eventCharactersRequestURI(id,offset));
  return mergeApiCallResults(chunkOffsetRequests)
    .then(characters => ({ id, characters }));
}
function getEachEventCharacters(eventIdCountPairs) {
  return Promise.all(eventIdCountPairs.map(getAllEventCharacters))
}

function cacheMarvelAPIEvents() {
  console.log('Caching Marvel API Events');
  return tryDropCollectionPromise(eventsCollection)
    .then(dropped => marvelApiGET(marvelApiAllEventsUrl))
    .then(events => eventsCollection.insertMany(events))
    .catch(console.error);
}

function cacheMarvelAPIEventCharacters() {
  console.log('Caching Marvel API Event Characters');
  return tryDropCollectionPromise(eventCharactersCollection)
    .then(getEventIdsAndCount)
    .then(getEachEventCharacters)
    .then(eventCharacters => eventCharactersCollection.insertMany(eventCharacters))
    .catch(console.error);
}

function cacheMarvelAPICharacters() {
  console.log('Caching Marvel API Characters');
  return tryDropCollectionPromise(charactersCollection)
    .then(getAllCharacters)
    .then(marvelCharacters => charactersCollection.insertMany(marvelCharacters))
    .catch(console.error);
}


// Cache API calls to DB
function refreshMarvelAPICachePromise(){
  return cacheMarvelAPIEvents()
    .then(cacheMarvelAPICharacters)
    .then(cacheMarvelAPIEventCharacters)
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
  this.getAllEventsCharacters = getAllEventsCharacters;
  this.refreshMarvelAPICache = refreshMarvelAPICache;
  this.getAllMarvelAPICharacterNames = getAllMarvelAPICharacterNames;
  this.expressGetAllEventsCharacters = expressGetAllEventsCharacters;
}

