var bodyParser = require("body-parser");
var express = require("express");
var fuzzySet = require('fuzzyset.js')
var marvelWiki = require('./marvel-wiki.js')
var marvelAPIWrapper = require('./marvel-api.js');
const marvelAPI = new marvelAPIWrapper();

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

// see https://www.mediawiki.org/wiki/API:Query#Example_4:_Continuing_queries
function getContinuationQuery(queryResultJson){
  return queryResultJson.continue ? Object.entries(queryResultJson.continue).map(prop => prop.join('=')).join('&') : '';
}

function splitAlterEgo (str) {
  const match = str.match(/(.*)\((.*)\)/);
  return match ? {name: match[1].trim(), alterEgo: match[2].trim()} : null;
}

function TEST(req,res) {
  const FUZZY_MATCH_THRESHOLD = 0.75;
  const clearCharName = rawName => rawName.replace(/\(.*comics.*\)/i,'').trim();
  const chartacterNamesSet = fuzzySet([],false);
  const chartacterAliasSet = fuzzySet([],false);
  const nameToWikiPageMap = new Map();
  const aliasToWikiPageMap = new Map();
  const updateSet2 = wikiPageTitles => wikiPageTitles
    .forEach(pageTitle => {
      const charNameVariations = clearCharName(pageTitle).split('\|');
      const pageTitleVariations = pageTitle.split('\|');
      for (const charName of charNameVariations) {
        nameToWikiPageMap.set(charName, pageTitleVariations);
        chartacterNamesSet.add(charName);
        const charAliases = splitAlterEgo(charName);
        if (charAliases !== null){
          chartacterAliasSet.add(charAliases.name);
          chartacterAliasSet.add(charAliases.alterEgo);
          aliasToWikiPageMap.set(charAliases.name, pageTitleVariations);
          aliasToWikiPageMap.set(charAliases.alterEgo, pageTitleVariations);
        }
      }
    });
  const getWikiData2 = charData => {
    const appendWikiData = wikiData => ({...charData, ...wikiData});
    const wikiTitlesOptions = charData.wiki;
    if (!wikiTitlesOptions)
      return;
    if (wikiTitlesOptions.length > 1)
      console.log(wikiTitlesOptions);
    marvelWiki.parseAnyWikiPageInfobox(wikiTitlesOptions)
      .then(appendWikiData)
      .then(console.log)

  }

  const characterNamesPromise = marvelAPI.getAllMarvelAPICharacterNames();
  const wikiCharactersPromise = marvelWiki.getWikiMarvelCharacterNames()
    .then(updateSet2);


  Promise.all([wikiCharactersPromise, characterNamesPromise])
    .then(results => {
      [wikiPageTitles, characterNames] = [...results];
      characterNames.map(characterName => {
        const charData = { name: characterName};
        let fuzzySetMatches = chartacterNamesSet.get(characterName);
        console.log('##' + characterName);
        console.log(fuzzySetMatches);
        if (fuzzySetMatches === null) {
          console.log('NO MATCH FOR: ' + characterName);
          return charData;
        }
        [confidence, topMatch] = [...fuzzySetMatches[0]];
        if (confidence >= FUZZY_MATCH_THRESHOLD) {
          console.log(characterName + ' =~ ' + topMatch);
          charData.wiki = nameToWikiPageMap.get(topMatch);
          return charData;
        }
        fuzzySetMatches = chartacterAliasSet.get(characterName);
        if (fuzzySetMatches === null) {
          console.log('NO MATCH IN ALIASES FOR: ' + characterName);
          return charData;
        }
        [confidence, topMatch] = [...fuzzySetMatches[0]];
        if (confidence === 1) {
          console.log(characterName, '==', topMatch);
          charData.wiki = aliasToWikiPageMap.get(topMatch);
          return charData;
        }
        const charAliases = splitAlterEgo(characterName);
        if (charAliases == null) {
          console.log('NO PARTIAL MATCH IN ALIASES FOR: ' + characterName);
          return charData;
        }
        fuzzySetMatches = chartacterNamesSet.get(charAliases.alterEgo);
        if (fuzzySetMatches !== null) {
          [confidence, topMatch] = [...fuzzySetMatches[0]];
          if (confidence === 1) {
            console.log(charAliases.alterEgo, '==', topMatch);
            charData.wiki = aliasToWikiPageMap.get(topMatch);
            return charData;
          }
        }

        fuzzySetMatches = chartacterNamesSet.get(charAliases.name);
        if (fuzzySetMatches !== null) {
          [confidence, topMatch] = [...fuzzySetMatches[0]];
          if (confidence === 1) {
            console.log(charAliases.name, '==', topMatch);
            charData.wiki = aliasToWikiPageMap.get(topMatch);
            return charData;
          }
        }

        console.log('NO PARTIAL MATCH IN ALIASES FOR: ' + characterName);
        return charData;
      })
        .map(getWikiData2)
      })
    .catch(console.error);
}
