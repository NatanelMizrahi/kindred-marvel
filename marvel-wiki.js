const rp = require("request-promise");
const mongo = require("mongodb");
var fuzzyMap = require('./fuzzy-map.js');

const WIKI_API_RETRY_DELAY = 6000;
const TOO_MANY_REQUESTS_ERR_CODE = 429;
//params
const FUZZY_MATCH_THRESHOLD = 0.9;

// API and MongoDB URLs
const wikiURL = 'https://en.wikipedia.org/w/api.php?';
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/kindred-marvel";

// MongoDB
var wikiCharactersCollection;
const CACHE_REFRESH_RATE = 7*24*60*60*1000; //one week

function connectMongoDB(){
  mongo.connect(mongoURI,
    { useNewUrlParser: true, useUnifiedTopology: true },
    (err, client) => {
      if (err) {
        console.error(err);
        process.exit(0);
      }
      const db = client.db("kindred-marvel");
      wikiCharactersCollection = db.collection("wikiCharacters");
      setInterval(cacheWikiAPICharacters, CACHE_REFRESH_RATE)
    });
}

function tryDropCollection(collection) {
  return collection.drop()
    .catch(err => {
      if (err.code === 26 || err.codeName === "NamespaceNotFound")
        return true;
      throw err;
    });
}

function cacheWikiAPICharacters() {
  console.log('Caching Wiki API Characters');
  return tryDropCollection(wikiCharactersCollection)
    .then(dropped => getMarvelCharactersWikiData())
    .then(charDataArray => wikiCharactersCollection.insertMany(charDataArray))
    .catch(console.error);
}
function refreshWikiAPICharactersCache(req, res) {
  cacheWikiAPICharacters()
    .then(cachedWikiCharacters => res.status(201).json(cachedWikiCharacters))
    .then(success => console.log('wiki API cache refreshed successfully'))
    .catch(err => res.status(503).json(err))
    .catch(console.error);
}

// Wikipedia API methods
class NoInfoboxError extends Error {}
class wikiAPIError extends Error {}

const flatten = arr => arr.flat();

function extractInfoboxText(wikiPageRaw){
  const wikiPageRawText = wikiPageRaw.wikitext['*'];
  const infoBoxStartRegex = /\{\{\s*(info|superhero|supersupporting)box/i;
  const startIndex = wikiPageRawText.search(infoBoxStartRegex);
  if (startIndex === -1)
    throw new NoInfoboxError('No InfoBox found for: ' + wikiPageRaw.title);

  let numOpenedParentheses = 1;
  let i = startIndex + 1;
  while(numOpenedParentheses > 0) {
    if (wikiPageRawText.substring(i, i + 2) === '{{')
      numOpenedParentheses++;
    if (wikiPageRawText.substring(i, i + 2) === '}}')
      numOpenedParentheses--;
    i++;
  }
  return wikiPageRawText.substring(startIndex, i + 1);
}
function extractInfoboxLinksText(infoboxWikiText){
  return infoboxWikiText.replace(/\[\[(.*?)([^\|]*?)\]\]/g, '$2');
}

function infoboxTextToJson(infoBoxText){
  const getAttributes = text => text.split('|');
  const entries = getAttributes(infoBoxText)
    .map(entry => entry.split('=').map(x => x.trim()))
    .filter(entry => entry.length === 2)
  return Object.fromEntries(entries);
}
function cleanWikiText(wikiText) {
  return wikiText
    .replace(/\{\{\w+\s?list/gi,'')
    .replace(/\}/g,'')
    .replace(/'''(.*?)'''/g,'*<b>$1</b>')
    .replace(/<ref name/g,'')
    .replace(/<ref>.*?<\/ref>/g,'')
    .replace(/<!--.*?-->/g,'')
}
function parseInfoboxListAttributes(wikiInfoboxData){
  const delimiterRegex1 = /;|\*|<br\s?\/?>/i;
  const delimiterRegex2 = /;|\*|<br\s?\/?>|,/i;
  const parseList = (listString, delimiter=delimiterRegex1) => (typeof listString === 'undefined') ? [] :
    listString
    .split(delimiter)
    .map(a => a.trim())
    .filter(x => x !== '');
  wikiInfoboxData.aliases   = parseList(wikiInfoboxData.aliases, delimiterRegex2);
  wikiInfoboxData.powers    = parseList(wikiInfoboxData.powers);
  wikiInfoboxData.partners  = parseList(wikiInfoboxData.partners);
  wikiInfoboxData.alter_ego = parseList(wikiInfoboxData.alter_ego);
  wikiInfoboxData.alliances = parseList(wikiInfoboxData.alliances);
  return wikiInfoboxData;
  }

function extractCharacterAttributes(wikiInfoboxData) {
  const alignment = wikiInfoboxData.hero || wikiInfoboxData.Superhero ? 'good' :
    wikiInfoboxData.villain ? 'evil' : 'N/A';
  const extractCharFields = ({ powers, aliases, partners, alliances, full_name, alter_ego }) =>
    ({
      powers,
      aliases,
      partners,
      alliances,
      alignment,
      full_name,
      alter_ego
    });

  return extractCharFields(wikiInfoboxData);
}

function toSnakeCase(str) {
  return str.replace(/ /g,'_');
}
async function manualRedirectToInfoboxPage(wikiJsonResponse){
  if (wikiJsonResponse.error)
    throw new wikiAPIError(wikiJsonResponse.error.info);
  if (wikiJsonResponse.parse.hasOwnProperty('wikitext'))
    return wikiJsonResponse.parse;
  if (wikiJsonResponse.parse.hasOwnProperty('text'))
    return await getWikiPage(wikiJsonResponse.parse.title);
  throw new wikiAPIError('Unexpected JSON response from wiki API');
}

function arrayToOrderedSet(arr){
  const set = [];
  arr.forEach(item => set.indexOf(item) === -1 && set.push(item));
  return set;
}
function addSearchKeywords(characterData, wikiPageTitle) {
  // Order matters! some characters have identical aliases, but full names are unique so we try them first.
  characterData.keywords =
    [
      wikiPageTitle,
      characterData.full_name,
      ...characterData.alter_ego,
      ...characterData.aliases
    ].map(nameToAliasArray).flat()
    .filter(x => x);
  characterData.wikiPageTitle = wikiPageTitle;
  characterData.keywords = arrayToOrderedSet(characterData.keywords);
  return characterData;
}

function getWikiPage(wikiPageTitle){
  const requestParams = {
    action: 'parse',
    format: 'json',
    prop:   'wikitext' ,
    page:   wikiPageTitle,
    redirects: true
  };
  return wikiGET(requestParams);
}
function parseWikiInfobox(wikiPageTitle){
  const fallback = () => new Promise(resolve => resolve(null));
  return getWikiPage(wikiPageTitle)
    .then(manualRedirectToInfoboxPage)
    .then(extractInfoboxText)
    .then(extractInfoboxLinksText)
    .then(cleanWikiText)
    .then(infoboxTextToJson)
    .then(parseInfoboxListAttributes)
    .then(extractCharacterAttributes)
    .then(characterData => requestDB.updateAligmentByCategory(characterData, wikiPageTitle))
    .then(characterData => addSearchKeywords(characterData, wikiPageTitle))
    .catch(fallback)
}

function getMarvelCharactersWikiData(){
  return getMarvelCharactersWikiPages()
    .then(getAllCharactersInfoBoxes)
    .then(charsData => charsData.filter(x => x !== null))
    .catch(console.error)
}
function getAllCharactersInfoBoxes(characterWikiPageTitles){
  return Promise.all(characterWikiPageTitles.map(randDelayParseWikiInfobox));
}
function randDelay(){
  let delay = Math.floor(Math.random() * WIKI_API_RETRY_DELAY);
  return new Promise(resolve => setTimeout(resolve, delay));
}
function randDelayParseWikiInfobox(wikiPageTitle) {
  return randDelay().then(x => parseWikiInfobox(wikiPageTitle))
}
function handleWikiAPIError(wikiPageTitle, err){
  if (err.statusCode === TOO_MANY_REQUESTS_ERR_CODE || err.name === 'RequestError'){
    console.log(`Error: Too many requests, retrying GET with delay for "${wikiPageTitle}"`);
    return randDelay().then(x => getWikiPage(wikiPageTitle))
  }
  console.log(wikiPageTitle, err);
}

// wiki
async function getWikiCategoryEntries(wikiCategory, type = 'page') {
  typeof(type) != 'string' && (type = 'page'); //TODO: fix
  const categoryParams = {
    cmtype:   type,
    action:   'query',
    format:   'json',
    list:     'categorymembers',
    cmlimit:  'max',
    cmprop:   'title',
    cmtitle:  wikiCategory,
  };
  let continuation = {};
  let categoryMembers = [];
  let hasContinuation = true;
  let wikiApiCatergoryEntriesResponse = null;
  let requestParams = categoryParams;
  while (hasContinuation) {
    wikiApiCatergoryEntriesResponse = await wikiGET(requestParams);
    // see https://www.mediawiki.org/wiki/API:Query#Example_4:_Continuing_queries
    hasContinuation = wikiApiCatergoryEntriesResponse.hasOwnProperty('continue');
    continuation = wikiApiCatergoryEntriesResponse.continue;
    requestParams = {...categoryParams,...continuation};
    categoryMembers = categoryMembers.concat(wikiApiCatergoryEntriesResponse.query.categorymembers);
  }
  return categoryMembers.map(charWiki => charWiki.title);
}

function getWikiSubCategories(wikiCategory){
  return getWikiCategoryEntries(wikiCategory, 'subcat')
}
function getWikiSubCategoriesEntries(wikiCategory){
  // NOTE: don't search recursively because there may be loops.
  // It's possible to do it with a depth limited search later on.
  return getWikiSubCategories(wikiCategory)
    .then(subCategories =>  Promise.all(subCategories.map(getWikiCategoryEntries)))
    .then(flatten)
}
function getAllWikiCategoryEntries(wikiCategory) {
  return Promise.all([
      getWikiCategoryEntries(wikiCategory),
      getWikiSubCategoriesEntries(wikiCategory)
    ]).then(flatten);
}
function jsonToQuery(obj){
  return Object.entries(obj).map(prop => prop.join('=')).join('&');
}

class requestDB {
  static characterAlignments = new Map();
  static saveAlignmentByCategory(characters, alignment){
    characters.forEach(char => this.characterAlignments.set(char,alignment))
    return characters;
  }

  static updateAligmentByCategory(characterData, wikiPageTitle) {
    if (characterData.alignment === 'N/A')
      characterData.alignment = this.characterAlignments.get(wikiPageTitle) || 'N/A';
    return characterData;
  }
}
function getMarvelCharactersWikiPages(){
  const nonListPage = title => !title.startsWith('List of') && !title.startsWith('Alternative versions of');
  return Promise.all([
    getAllWikiCategoryEntries('Category:Marvel Comics characters'),
    getAllWikiCategoryEntries('Category:Marvel Comics supervillains')
      .then(chars => requestDB.saveAlignmentByCategory(chars,'evil')),
    getAllWikiCategoryEntries('Category:Marvel Comics superheroes')
      .then(chars => requestDB.saveAlignmentByCategory(chars,'good')),
  ]).then(flatten)
    .then(charWikis => [...new Set(charWikis)].filter(nonListPage))
}

function wikiGET(params){
  let request = {
    uri: wikiURL + jsonToQuery(params),
    json: true
  };
  return rp(request).catch(err => handleWikiAPIError(params.page, err));
}

function nameToAliasArray(rawCharName) {
  if (!rawCharName)
    return [];
  const clearCharName = rawName => rawName
    .replace(/\(.*(comics|character).*\)/i,'')
    .trim();
  const name = clearCharName(rawCharName);
  const nameBeforeTitle = [...name.matchAll(/([\w\s\-\.']+) the /gi)].map(m => m[1]);
  const trimAll = matches => matches.map(m => m.trim()
    .replace(/^The /i,'')
    .replace(/ /g,'-'));
  const match = name.match(/[\w\s\-\.']+/g);
  return match ?  [...nameBeforeTitle, ...trimAll(match)] :
                  [...nameBeforeTitle, rawCharName];
}

function getAllMarvelCharactersWikiData(){
  return wikiCharactersCollection.find({}).toArray();
}

function getMarvelCharactersWikiDataMap(){
  return getAllMarvelCharactersWikiData()
    .then(charsData => {
      charsData.forEach(wikiCharacter => wikiCharacter.tempKeywords = wikiCharacter.keywords.slice());
      const charMap = new fuzzyMap(FUZZY_MATCH_THRESHOLD);
      let updated = true;
      let key = null;
      while(updated){
        updated = false;
        for(const char of charsData){
          key = char.tempKeywords.shift();
          if(key){
            updated = true;
            if (!charMap.get(key))
              charMap.set(key, char);
          }
        }
      }
      charsData.forEach(wikiCharacter => delete wikiCharacter.tempKeywords);
      return charMap;
    })
}
module.exports = function() {
  connectMongoDB();
  this.getMarvelCharactersWikiDataMap = getMarvelCharactersWikiDataMap;
  this.refreshWikiAPICharactersCache = refreshWikiAPICharactersCache;
  this.nameToAliasArray = nameToAliasArray;
}

function p(x){console.log(x); return x;}
function pa(x){ x.forEach(e=>console.log(e)); return x;}
