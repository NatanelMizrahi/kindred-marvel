import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Md5} from 'ts-md5/dist/md5';
import { map } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import {Filter} from './filter';
import { Character} from './character';
import {flatten} from '@angular/compiler';

interface APIResponse<T> {
  data: { results: T[] };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseURL = 'http://gateway.marvel.com/v1/public/';
  private PRIVATE_KEY = '872a9515627d6214b47da87ddfd57c087df00bef';
  private PUBLIC_KEY = 'da725c95a6cdd0e7ace2765ba70b4b27';
  private MAX_CHARACTERS = 100;

  constructor(private http: HttpClient) {}

  private getCharAttributes(char) {
    const id = char.resourceURI.split('/').splice(-1)[0];
    return { id, name: char.name };
  }
  private getCharacter(charId: string) {
    return this.apiGet(`characters/${charId}`);
  }

  getCharacters(charIds: string[]) {
    return forkJoin(charIds.map(this.getCharacter));
  }

  getAllCharacters(total: number) {
    const getCharacterChunk = chuckFilter => this.apiGet('characters', chuckFilter)
      .pipe(map(characters => characters.map(char => new Character(char)))
    );

    const characterRequests = this.chunkApiFilters(total, this.MAX_CHARACTERS);
    console.log(characterRequests);
    return forkJoin(characterRequests.map(getCharacterChunk));
  }
  getEvents(limit) {
    const filter = new Filter({ limit });
    const extractEventsData = events => events.map(event =>
      ({
        id: event.id.toString(),
        title: event.title,
        description: event.description,
        thumbnailURL: `${event.thumbnail.path}.${event.thumbnail.extension}`,
        characters: event.characters.items.map(this.getCharAttributes),
        numCharacters: event.characters.available
      }));
    return this.apiGet('events', filter)
      .pipe(map(extractEventsData));
  }
  private handleError(error: any) {
    const errMsg = (error.message) ? error.message :
      error.status ? `${error.status} - ${error.statusText}` : 'Server error';
    console.error(errMsg); // log to console instead
  }
  private getHash(timestamp: string) {
    return new Md5().appendStr(`${timestamp}${this.PRIVATE_KEY}${this.PUBLIC_KEY}`).end();
  }
  get now() {
    return new Date().getTime().toString();
  }
  get suffix() {
    const timestamp = this.now;
    return `&ts=${timestamp}&apikey=${this.PUBLIC_KEY}&hash=${this.getHash(timestamp)}`;
  }
  private jsonToQuery(json) {
    return Object.entries(json).map(prop => prop.join('=')).join('&');
  }
  private apiUrl(route, filter: Filter = {}) {
    return `${this.baseURL}${route}?${this.jsonToQuery(filter)}${this.suffix}`;
  }

  private chunk(arr, size) {
    return arr.reduce((arrays, _, i) =>
      (i % size === 0) ? [...arrays, arr.slice(i, i + size)] : arrays, []);
  }

  private chunkApiFilters(total, limit) {
    const numChunks = Math.ceil(total / limit);
    const requestsfilters = [];
    for (let chunk = 0; chunk < numChunks; chunk++) {
      requestsfilters.push(
        new Filter({
          limit,
          offset: limit * chunk
        }));
    }
    return requestsfilters;
  }

  getEventCharacters(eventId: string, total: number) {
    const getEventCharactersChunk = chunkFilter => this.apiGet(`events/${eventId}/characters`, chunkFilter)
    const characterRequestFilters = this.chunkApiFilters(total, this.MAX_CHARACTERS);
    return forkJoin(characterRequestFilters.map(getEventCharactersChunk))
      .pipe(
        map(flatten),
        map(eventCharacters => ({id: eventId, characters: eventCharacters}))
      );
}
  private apiGet(route, filter: Filter = {}) {
    return this.http.get<APIResponse<any>>(this.apiUrl(route, filter)).pipe(
      map(res => res.data.results)
    );
  }
}

// getEventCharacters(eventIds: string[]) {
//   const getEventCharactersChunk = (eventIdsChunk: string[]) => {
//     const eventIdsQuery = new Filter();
//     eventIdsQuery.events = eventIdsChunk.join('%2c');
//     return this.http.get(this.apiUrl('characters', eventIdsQuery));
//   };
//
//   // limited to 10 events in every API call
//   const eventIdChunks = this.chunk(eventIds, 10);
//   forkJoin(eventIdChunks.map(getEventCharactersChunk))
//   //   .pipe(
//   //   map(eventCharResponses => eventCharResponses.map(response => response.data.results))
//   // )
//     .subscribe(console.log);
// }
