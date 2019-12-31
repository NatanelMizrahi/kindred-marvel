const rp = require("request-promise");
const WIKI_API_RETRY_DELAY = 3000;
const TOO_MANY_REQUESTS_ERR_CODE = 429;
function p(x){console.log(x); return x;}

function extractInfoboxText(wikiPageRaw){
  const wikiPageRawText = wikiPageRaw.body;
  const infoBoxStartRegex = /\{\{\s*(info|superhero|supersupporting)box/i;
  const startIndex = wikiPageRawText.search(infoBoxStartRegex);
  if (startIndex === -1)
    throw new Error('No InfoBox found for :' + wikiPageRaw.title);

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
  const entries = infoBoxText
    .map(entry => entry.split('=').map(x => x.trim()))
    .filter(entry => entry.length === 2)
  return Object.fromEntries(entries);
}
function cleanWikiText(wikiText) {
  return wikiText
    .replace(/\{\{Plainlist/g,'')
    .replace(/\}/g,'')
    .replace(/<ref name/g,'')
    .replace(/<ref>.*?<\/ref>/g,'')
}
function parseInfoboxListAttributes(wikiInfoboxData){
  const delimiterRegex = /,|;|\*|<br\s?\/?>/;
  const parseList = listString => (typeof listString === 'undefined') ? listString :
    listString
    .split(delimiterRegex)
    .map(a => a.trim())
    .filter(x => x !== '');
  wikiInfoboxData.powers =    parseList(wikiInfoboxData.powers);
  wikiInfoboxData.aliases =   parseList(wikiInfoboxData.aliases);
  wikiInfoboxData.partners =  parseList(wikiInfoboxData.partners);
  wikiInfoboxData.alliances = parseList(wikiInfoboxData.alliances);
  return wikiInfoboxData;
  }

function extractCharacterAttributes(wikiInfoboxData) {
  const alignment = wikiInfoboxData.hero ? 'good' : wikiInfoboxData.villain ? 'bad' : 'N/A';
  const extractCharFields = ({ powers, aliases, partners, alliances }) =>
    ({
      powers,
      aliases,
      partners,
      alliances,
      alignment
    });
  return extractCharFields(wikiInfoboxData);
}

function toSnakeCase(str) {
  return str.replace(/ /g,'_');
}
function manualRedirectToInfoboxPage(wikiTitle, wikiJsonResponse){
  if (wikiJsonResponse.parse.hasOwnProperty('wikitext')){
    return {
      title: wikiTitle,
      body:wikiJsonResponse.parse.wikitext['*']
    };
  }
  else if (wikiJsonResponse.parse.hasOwnProperty('text')){
    wikiTitle = wikiJsonResponse.parse.title
    return parseWikiInfobox(wikiTitle);
  }
  else
    throw new TypeError('Unexpected JSON response from wiki API');
}

function parseWikiInfobox(wikiPageTitle){
  const getAttributes = text => text.split('|');
  const wikiTitle = toSnakeCase(wikiPageTitle)
  const wikiTextRawApiCall = `https://en.wikipedia.org/w/api.php?action=parse&format=json&page=${wikiTitle}&prop=wikitext&redirects`;
  return rp(wikiTextRawApiCall)
    .then(JSON.parse)
    .then(wikiJsonResponse => manualRedirectToInfoboxPage(wikiTitle, wikiJsonResponse))
    .then(extractInfoboxText)
    .then(extractInfoboxLinksText)
    .then(cleanWikiText)
    .then(getAttributes)
    .then(infoboxTextToJson)
    .then(parseInfoboxListAttributes)
    .then(extractCharacterAttributes)
    // .catch(e => console.error(wikiPageTitle, e)) //TODO: statusCode == 429 : too many requests, set timeout
    .catch(handleWikiAPIError)
}

async function parseAnyWikiPageInfobox(wikiTitlesArray){
  for (const wikiTitle of wikiTitlesArray){
    try {
      return await parseWikiInfobox(wikiTitle);
    } catch (e) {
      console.log(wikiTitle, e);
    }
  }
  console.log('No infoBox found for any page:', wikiTitlesArray);
  return null;
}


function extractCharacterNamesFromWikiList(pageWikiText) {
  const extractcharacterAliases = match => match[2].indexOf(match[1]) === -1 ? [match[1], match[2]]: [match[2]];
  const characterMatches = pageWikiText.matchAll(/==([\w\s\-\.]+)==\s*\{\{\s*Main\|(.*?)\}/gi);
  const namesMatches = [...characterMatches].map(extractcharacterAliases);
  return namesMatches;
}

function getMarvelCharactersWikiPages() {
  const charIndexArray = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split('')
    .concat(encodeURIComponent('0–9'));
  const charListWikiApiQuery =  "https://en.wikipedia.org/w/api.php?action=parse&format=json&page=List_of_Marvel_Comics_characters:_$$$&prop=wikitext";
  const perIndexCharacterListPromises = charIndexArray
    .map(c => charListWikiApiQuery.replace('$$$', c))
    .map(perCharListApiQuery => rp(perCharListApiQuery)
      .then(JSON.parse)
      .then(response => response.parse.wikitext['*'])
      .then(extractCharacterNamesFromWikiList)
      .then(perCharacterResults => perCharacterResults.flat())
      .catch(console.error))
  return Promise.all(perIndexCharacterListPromises)
    .then(perIndexCharacters => perIndexCharacters.flat())
    ;
}

exports.parseWikiInfobox = parseWikiInfobox;
exports.parseAnyWikiPageInfobox = parseAnyWikiPageInfobox;
exports.getMarvelCharactersWikiPages = getMarvelCharactersWikiPages;
exports.testWikiDB = getMarvelCharactersWikiData;

/////////////////////////
function getRedirectingPages(wikiPageTitle){
  const wikiTitle = toSnakeCase(wikiPageTitle);
  const redirectsQuery = `https://en.wikipedia.org/w/api.php?action=query&blfilterredir=redirects&bllimit=max&bltitle=${wikiTitle}&format=json&list=backlinks`;
  return rp(redirectsQuery)
    .then(JSON.parse)
    .then(response => response.query.backlinks.map(link => link.title))
}

function extractCharacterNamesFromWikiList2(pageWikiText) {
  const characterMatches = pageWikiText.matchAll(/\{\{\s*Main\|(.*?)\}/gi);
  return [...characterMatches].map(x => x[1]);
}
function getMarvelCharactersWikiPages2() {
  const charIndexArray = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split('')
    .concat(encodeURIComponent('0–9'));
  const charListWikiApiQuery =  "https://en.wikipedia.org/w/api.php?action=parse&format=json&page=List_of_Marvel_Comics_characters:_$$$&prop=wikitext";
  const perIndexCharacterListPromises = charIndexArray
    .map(c => charListWikiApiQuery.replace('$$$', c))
    .map(perCharListApiQuery => rp(perCharListApiQuery)
      .then(JSON.parse)
      .then(response => response.parse.wikitext['*'])
      .then(extractCharacterNamesFromWikiList2)
      .catch(console.error))
  return Promise.all(perIndexCharacterListPromises)
    .then(perIndexCharacters => perIndexCharacters.flat())
    ;
}
function getMarvelCharactersWikiData(req,res){
  getMarvelCharactersWikiPages2()
    .then(characterWikiPageTitles => Promise.all(characterWikiPageTitles.map(parseWikiInfobox)))
    .then(p);
}

function delay(t){
  return new Promise(resolve => setTimeout(resolve, t));
}
function randDelay(){
  return Math.floor(Math.random() * WIKI_API_RETRY_DELAY);
}
function handleWikiAPIError(wikiPageTitle, err){
  if (err.statusCode === TOO_MANY_REQUESTS_ERR_CODE){
    let retryDelay = randDelay();
    console.log(`Error: Too many requests, retrying in ${retryDelay} ms`);
    return delay(retryDelay).then(x => parseWikiInobox(wikiPageTitle));
  }
  console.log(err);
}
