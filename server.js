var bodyParser = require("body-parser");
var express = require("express");
var marvelWiki = require('./marvel-wiki.js')
var marvelAPIWrapper = require('./marvel-api.js');
const marvelAPI = new marvelAPIWrapper();
const fuzzyMap = require('./fuzzy-map.js');

//params
const FUZZY_MATCH_THRESHOLD = 0.75;
const PARTIAL_FUZZY_MATCH_THRESHOLD = 0.95;

// express
const port = 8080;
const app = express();
const distDir = __dirname + "/dist/";
const jsonParser = bodyParser.json({limit: 1024 * 1024 * 20, type: "application/json"});
app.use(express.static(distDir));
app.use(jsonParser);

/* Routes */

// Marvel API
app.get("/events",  marvelAPI.getAllEventsData);
app.get("/events/:id",  marvelAPI.getEventData);
app.get("/events/:id/characters",  marvelAPI.getEventCharacters);

// Marvel API Cache
app.get("/cache/marvel", marvelAPI.refreshMarvelAPICache); // TODO: change to put after this works

app.listen(port, () => console.log(`app running on port ${port}`));

app.get("/test", TEST);
app.get("/test/wiki", marvelWiki.testWikiDB);

function nameToAliasArray (str) {
  const trimAll = arr => arr.map(x => x.trim())
  const match = str.match(/[\w\s\-\.]+/g);
  return match && match.length > 1 ? trimAll(match) : [];
}

function TEST(req,res) {
  const clearCharName = rawName => rawName.replace(/\(.*(comics|character).*\)/i,'').trim();
  const nameToWikiPageMap  = new fuzzyMap(FUZZY_MATCH_THRESHOLD);
  const aliasToWikiPageMap = new fuzzyMap(PARTIAL_FUZZY_MATCH_THRESHOLD);
  const updateSet2 = wikiPageTitles => wikiPageTitles
    .forEach(pageTitle => {
      const charNameVariations = clearCharName(pageTitle).split('\|');
      const pageTitleVariations = pageTitle.split('\|');
      for (const charName of charNameVariations) {
        nameToWikiPageMap.set(charName, pageTitleVariations);
        const charAliases = nameToAliasArray(charName);
        for (const alias of charAliases){
          aliasToWikiPageMap.set(alias, pageTitleVariations);
        }
      }
    });
  const getWikiData2 = charData => {
    const appendWikiData = wikiData => ({...charData, ...wikiData});
    const wikiTitlesOptions = charData.wiki;
    if (!wikiTitlesOptions)
      return charData;
    if (wikiTitlesOptions.length > 1)
      console.log(charData.name, wikiTitlesOptions);
    return marvelWiki.parseAnyWikiPageInfobox(wikiTitlesOptions)
      .then(appendWikiData)
      .then(p)
  }
  const getWikiTitle = characterName => {
    const charData = { name: characterName };
    const charAliases = nameToAliasArray(characterName);
    let topMatch = null;
    for (const key of [characterName, ...charAliases]){
      for (const fuzzyMapping of [nameToWikiPageMap, aliasToWikiPageMap]){
        topMatch = fuzzyMapping.get(key);
        if (topMatch !== null) {
          charData.wiki = topMatch;
          return charData;
        }
      }
    }
    console.log('NO MATCH FOR: ' + characterName);
    return charData;
  }
  const characterNamesPromise = marvelAPI.getAllMarvelAPICharacterNames();
  const wikiCharactersPromise = marvelWiki.getMarvelCharactersWikiPages()
    .then(updateSet2);

  Promise.all([wikiCharactersPromise, characterNamesPromise])
    .then(results => {
      [_, characterNames] = [...results];
      characterNames
        .map(getWikiTitle)
        .map(getWikiData2)
      })
    .catch(console.error);
}

function p(x){console.log(x); return x;}
