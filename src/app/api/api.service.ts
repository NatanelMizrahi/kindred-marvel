import APP_CONFIG from '../app.config';
// import { eventsDB } from '../../assets/test-db/events-db';
// import { charactersDB } from '../../assets/test-db/superhero-db';

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Md5} from 'ts-md5/dist/md5';
import {catchError, map} from 'rxjs/operators';
import {forkJoin, throwError} from 'rxjs';
import {Filter} from './filter';
import { Character} from './character';
import {flatten} from '@angular/compiler';

interface APIResponse<T> {
  data: { results: T[] };
}
interface EventCharacters {
  id: string;
  characters: any[];
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
    const getCharacterChunk = chunkFilter => this.apiGet('characters', chunkFilter)
      .pipe(map(characters => characters.map(char => new Character(char)))
    );

    const characterRequests = this.chunkApiFilters(total, this.MAX_CHARACTERS);
    console.log(characterRequests);
    return forkJoin(characterRequests.map(getCharacterChunk));
  }

  getCharWiki(characterName) {
    return this.http.get(`/wiki/${characterName}`);
  }

  getEvents(limit) {
    const filter = new Filter({ limit });
    const extractEventData = event => ({
        id: String(event.id),
        title: event.title,
        description: event.description,
        thumbnailURL: `${event.thumbnail.path}.${event.thumbnail.extension}`,
        characters: event.characters.items.map(this.getCharAttributes),
        numCharacters: event.characters.available
      });
    const extractAllEventsData = events => events.map(extractEventData);
    if (APP_CONFIG.USE_CACHE) {
      return this.http.get<APIResponse<any>>('/events')
        .pipe(map(events => extractAllEventsData(events.data.results.slice(0, limit))));
    }
    return this.apiGet('events', filter)
      .pipe(map(extractAllEventsData));
  }

  private getHash(timestamp: string) {
    return new Md5().appendStr(`${timestamp}${this.PRIVATE_KEY}${this.PUBLIC_KEY}`).end();
  }
  get now() {
    return String(new Date().getTime());
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

  getAllEventsCharacters(events, callback) {
    return forkJoin(events.map(event => this.getEventCharacters(event.id, event.numCharacters)
      .pipe(map(callback))));
  }
  getEventCharacters(eventId: string, total: number) {
    // if (APP_CONFIG.USE_CACHE) {
    //   return this.http.get(`/events/${eventId}`)
    //     .pipe(map((event: EventCharacters) => {
    //       console.log('for:', eventId, event);
    //       event.characters.forEach(char => char.id = String(char.id));
    //       return event;
    //     }));
    // }
    const saveEventToDB = event => {
      if ([231, 314, 229, 293, 234, 320].includes(+event.id)) {
        this.http.post(`/events/${eventId}`, event)
          .subscribe(console.log);
      }
      return event;
    };
    const getEventCharactersChunk = chunkFilter => this.apiGet(`events/${eventId}/characters`, chunkFilter)
    const characterRequestFilters = this.chunkApiFilters(total, this.MAX_CHARACTERS);
    return forkJoin(characterRequestFilters.map(getEventCharactersChunk))
      .pipe(
        map(flatten),
        map(eventCharacters => ({id: String(eventId), characters: eventCharacters})),
        map(saveEventToDB)
      );
  }
  private apiGet(route, filter: Filter = {}) {
    return this.http.get<APIResponse<any>>(this.apiUrl(route, filter))
      .pipe(map(res => res.data.results));
  }

  private errorHandler() {
    return catchError(error => {
      const errMsg = (error.message) ? error.message : error.status ? `${error.status} - ${error.statusText}` : 'Server error';
      console.error(errMsg);
      return throwError(error);
    });
  }
}

