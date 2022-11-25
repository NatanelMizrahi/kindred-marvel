var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var marvelWikiWrapper = require('./marvel-wiki.js');
var marvelAPIWrapper = require('./marvel-api.js');
const marvelAPI = new marvelAPIWrapper();
const marvelWiki = new marvelWikiWrapper();

// express
const port = process.env.PORT || 8080;
const app = express();
const jsonParser = bodyParser.json({limit: 1024 * 1024 * 20, type: "application/json"});

app.use(express.static(path.join(__dirname, "dist")));
app.use(jsonParser);

// Marvel API
app.get("/events",                  marvelAPI.getAllEventsData);
app.get("/events/:id/characters",   marvelAPI.getEventCharacters);
app.get("/events/characters/",      marvelAPI.expressGetAllEventsCharacters);
app.get("/events/:id",              marvelAPI.getEventData);
app.get("/events/characters/wiki",  getAllEventCharactersData);

// Marvel & Wiki API Cache // TODO: change to PUT requests
app.get("/cache/marvel",  marvelAPI.refreshMarvelAPICache);
app.get("/cache/wiki",    marvelWiki.refreshWikiAPICharactersCache);

// wiki API
app.listen(port, () => console.log(`app running on port ${port}`));

function crossReferenceWikiAndMarvelDB([wikiCharactersMap, marvelCharacters]){
  const characterDataMap = new Map();
  let charAliases = null;
  let aliasWikiMatch = null;
  for(const character of marvelCharacters){
    charAliases = marvelWiki.nameToAliasArray(character.name).reverse();
    aliasWikiMatch = wikiCharactersMap.get(charAliases);
    if(aliasWikiMatch)
      characterDataMap.set(character.name, {
        ...character,
        ...aliasWikiMatch
      });
    else
      characterDataMap.set(character.name, character);
  }
  const alliancesSet = new Set([...characterDataMap.values()].map(char => char.alliances).flat());
  for (const [charName, charData] of characterDataMap.entries()){
    charData.type = alliancesSet.has(charName) ? 'team' : 'character';
    delete charData.characters;
  }
  return [...characterDataMap.values()];
}

function getAllEventCharactersData(req,res){
  const wikiCharactersPromise = marvelWiki.getMarvelCharactersWikiDataMap();
  const marvelCharactersPromise = marvelAPI.getAllEventsCharacters();
  Promise.all([
    wikiCharactersPromise,
    marvelCharactersPromise
  ]).then(crossReferenceWikiAndMarvelDB)
    .then(eventCharacters => res.status(201).json(eventCharacters))
    .catch(err => res.status(503).json(err)).catch(console.error);
}
//TODO: status: wiki cache works, need to integrate to server (cross reference with marvel API) + do clean up.
