var fs = require("fs");
var rp = require("request-promise");
var bodyParser = require("body-parser");
var infobox = require("wiki-infobox");
const mongo = require("mongodb");
var express = require("express");

// params
const port = 8080;
const RESULT_LIMIT = 100;
const CACHE_REFRESH_RATE = 7*24*60*60*1000; //one week
// Api and MongoDB URLs
const mongoURI = "mongodb://kindred:m4rv3l@ds257648.mlab.com:57648/kindred-marvel";
const marvelApiAllEventsUrl = "https://gateway.marvel.com/v1/public/events?limit=100&ts=1575390183429&apikey=da725c95a6cdd0e7ace2765ba70b4b27&hash=a41b24dab9bb86d95cdd16bf6e17cb74";
const superHeroAPIUrl = "https://www.superheroapi.com/api.php/2470261009752468/search/";
const appBaseUrl = 'http://localhost:' + String(port)
// express
const app = express();
var distDir = __dirname + "/dist/";
var jsonParser = bodyParser.json({limit: 1024 * 1024 * 20, type: "application/json"});
app.use(express.static(distDir));
app.use(jsonParser);

// MongoDB
var eventsCollection;
var heroesCollection;
var eventCharactersCollection;

mongo.connect(mongoURI,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) {
      console.error(err);
      process.exit(0);
    }
    const db = client.db("kindred-marvel");
    eventsCollection = db.collection("events");
    heroesCollection = db.collection("heroes");
    eventCharactersCollection = db.collection("eventCharacters");
    setInterval(refreshAPICache, CACHE_REFRESH_RATE)
  });

/* Routes */

// wikipedia API
app.get("/wiki/:title", getInfoBox);

// Marvel API Cache
app.get("/events",  getAllEventsData);
app.get("/events/:id",  getEventData);
app.get("/events/:id/characters",  getEventCharacters);

// Superhero API Cache
app.get("/heroes/:name",  getSuperHeroData);
app.get("/heroes",  getAllSuperHeroesData);

// Cache API calls to DB
// TODO: change to put after this works
app.put("/cache/super-heroes",  cacheSuperHeroAPIEntries);
app.put("/cache/marvel/events", cacheMarvelAPIEvents);
app.put("/cache/marvel/characters", cacheMarvelAPIEventCharacters);

app.listen(port, () => console.log(`app running on port ${port}`));

function stringifyEventIds(event) {
  event.id = String(event.id);
  event.characters.forEach(char => char.id = String(char.id));
  return event;
}

function getSuperHeroData(req, res) {
  const heroNameSubstring = new RegExp(req.params.name, "i");
  heroesCollection
    .find({ name: heroNameSubstring }).toArray()
    .then(items => res.status(201).json(items))
    .catch(err => res.status(503).json(err));
}

function getAllSuperHeroesData(req, res) {
  heroesCollection
    .find({}).toArray()
    .then(items => res.status(201).json(items))
    .catch(err => res.status(503).json(err));
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

function getInfoBox(req, res) {
  infobox(req.params.title, "en", (err, data) => {
    if (err) {
      console.log(err);
    }
    res.json(data);
  });
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
      if (err.code === 26 || err.codeName === "NamespaceNotFound") {
        return true;
      } else {
        throw err;
      }
    });
}
function cacheSuperHeroAPIEntries(req, res) {
  console.log('caching SuperHero API Entries');
  const indexCharacters = "AEIOUYX".split("");
  const addUniqueFn = (arr, character) => arr.some(c => c.id === character.id) ? arr : arr.concat([character]);
  const getCharactersPromises = indexCharacters
    .map(indexChar => rp(superHeroAPIUrl + indexChar)
      .then(JSON.parse));
  tryDropCollectionPromise(heroesCollection)
    .then(dropped => Promise.all(getCharactersPromises))
    .then(characterArrays => characterArrays.map(arr => arr.results).flat())
    .then(characterArrayFlat => characterArrayFlat.reduce(addUniqueFn, []))
    .then(uniqueCharacters => heroesCollection.insertMany(uniqueCharacters))
    .then(cachedCharacters => res.status(201).json(cachedCharacters))
    .catch(err => res.status(503).json(err));
}

function cacheMarvelAPIEvents(req, res) {
  console.log('caching Marvel API Events');
  tryDropCollectionPromise(eventsCollection)
    .then(dropped => rp(marvelApiAllEventsUrl))
    .then(JSON.parse)
    .then(response => response.data.results)
    .then(events => eventsCollection.insertMany(events))
    .then(cachedEvents => res.status(201).json(cachedEvents))
    .catch(err => res.status(503).json(err));
}
function cacheMarvelAPIEventCharacters(req, res) {
  console.log('caching Marvel API Event Characters');
  tryDropCollectionPromise(eventCharactersCollection)
    .then(getEventIds)
    .then(eventIds => eventIds.map(getEventCharactersApiCalls))
    .then(mergeAllEventsCharacterRequests)
    .then(eventCharacters => eventCharactersCollection.insertMany(eventCharacters))
    .then(cachedEventCharacters => res.status(201).json(cachedEventCharacters))
    .catch(err => console.log(err) || res.status(503).json(err));
}

function refreshAPICache() {
  const options = { method: 'PUT' };
  rp(appBaseUrl +"/cache/super-heroes",  options)
    .then(success => rp(appBaseUrl +"/cache/marvel/events",  options))
    .then(success => rp(appBaseUrl +"/cache/marvel/characters",  options))
    .then(success => console.log('caches refreshed successfully'))
    .catch(console.error)
}
