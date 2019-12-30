const rp = require("request-promise");
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

function parseWikiInfobox(wikiPageTitle){
  const getAttributes = text => text.split('|');
  const snakeCaseTitle = wikiPageTitle
    .replace(/ /g,'_')
    .replace(/#.*/,'');
  const wikiTextRawApiCall = `https://en.wikipedia.org/w/api.php?action=parse&format=json&page=${snakeCaseTitle}&prop=wikitext&redirects`;
  return rp(wikiTextRawApiCall)
    .then(JSON.parse)
    .then(wikiJsonResponse => ({title:snakeCaseTitle, body:wikiJsonResponse.parse.wikitext['*']}))
    .then(extractInfoboxText)
    .then(extractInfoboxLinksText)
    .then(cleanWikiText)
    .then(getAttributes)
    .then(infoboxTextToJson)
    .then(parseInfoboxListAttributes)
    .then(extractCharacterAttributes)
    .catch(e => console.error(wikiPageTitle, e))
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
  const characterMatches = pageWikiText.matchAll(/\{Main\|(.*?)\}/gi);
  return [...characterMatches].map(x => x[1]);
}

function getWikiMarvelCharacterNames() {
  const charIndexArray = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    .split('')
    .concat(encodeURIComponent('0–9'));
  const charListWikiApiQuery =  "https://en.wikipedia.org/w/api.php?action=parse&format=json&page=List_of_Marvel_Comics_characters:_$$$&prop=wikitext";
  const perIndexCharacterListPromises = charIndexArray
    .map(c => charListWikiApiQuery.replace('$$$', c))
    .map(perCharListApiQuery => rp(perCharListApiQuery)
      .then(extractCharacterNamesFromWikiList)
      .catch(console.error))
  return Promise.all(perIndexCharacterListPromises)
    .then(perIndexCharacters => perIndexCharacters.flat());
}

exports.parseWikiInfobox = parseWikiInfobox;
exports.parseAnyWikiPageInfobox = parseAnyWikiPageInfobox;
exports.getWikiMarvelCharacterNames = getWikiMarvelCharacterNames;


