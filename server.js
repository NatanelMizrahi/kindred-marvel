const Rx = require('rx');
const fetch = require('node-fetch');
const crypto = require('crypto');

const baseURL = "http://gateway.marvel.com/v1/public/";
const PRIVATE_KEY = "45fa4b195968ea83950ad2c3db4452896e3af40b";
const PUBLIC_KEY = "ba17846545643040dfa18e81f84c6c45";

const p = (x, verbose=true) => { 
	if(verbose)
		console.log(x); 
	return x; 
}
const now = () => new Date().getTime();
const get_hash = (timestamp) => crypto.createHash('md5').update(`${timestamp}${PRIVATE_KEY}${PUBLIC_KEY}`).digest('hex');
const get_suffix = (timestamp) => `&ts=${timestamp}&apikey=${PUBLIC_KEY}&hash=${get_hash(timestamp)}`;
const json_to_query = (obj) => Object.entries(obj).map(prop => prop.join('=')).join('&')
const api_call = (route,filters={}) => `${baseURL}${route}?${json_to_query(filters)}${get_suffix(now())}`
const url_to_query = (url,filters={}) => api_call(url.split('marvel.com/v1/public/')[1],filters)

const charToEvents = (char) => char.events.collectionURI.toString(); //({ name: char.name, eventsURL: char.events.collectionURI }); //, eventPromises:
const to_api_promise = (fetchPromise,verbose=false) => 
	fetchPromise
	  .then(res => res.json())
	  .then(json => p(json.data.results, verbose))
	  .catch(err => console.error(err))

const eventPromise = (URL) => to_api_promise(fetch(url_to_query(URL,{limit:10})))
		

const awaitEvents = (eventPromises) => {
  Promise.all(eventPromises)
  	.then(events => console.log(events.flatMap(charEvents => charEvents.map(event => ({title: event.title, sum: event.description})))))
  	.catch(err => console.error(err));
  return true;
}

var call = api_call('characters', {limit:15});
console.log(call);
// fetch(call)
//   .then(res => res.json())
//   .then(json => p(json.data.results.map(charToEvents)))
//   .then(chars => p(chars.map(eventPromise)))
//   .then(promises => awaitEvents(promises))
//   .catch(err => console.error(err))


var call = api_call('events', {limit:100});
// var call = api_call('characters/1010773/events', filter);
to_api_promise(fetch(call),verbose=true)
	.then(events=> events.map(event => p({
	  title: event.title,
	  sum: event.description,
	  thumbnailURL: `${event.thumbnail.path}.${event.thumbnail.extension}`,
	  characters: event.characters.items.map(char => ({
	  	ID: char.resourceURI.split('/').splice(-1)[0],
	  	name: char.name
	  }))
    })
));


// var source = Rx.Observable.create(observer => {
//   // Yield a single value and complete
//   for (let i =0; i< 100; i++){
//   	observer.onNext(i);
//   }
//   observer.onCompleted();

//   // Any cleanup logic might go here
//   return () => console.log('subscription disposed')
// });

// var subscription = source.subscribe(
//   data => console.log('onNext: %s', data),
//   err  => console.log('onError: %s', err),
//   ()   => console.log('onCompleted'));

// subscription.dispose();
