import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {catchError, map} from 'rxjs/operators';
import {throwError} from 'rxjs';
import { Character } from './character';
import { Event, APIEvent, CharIdObject } from './event';

interface APIResponse<T> {
  data: { results: T[] };
}

interface EventCharacters {
  id: number;
  characters: CharIdObject[];
}

@Injectable({
  providedIn: 'root'
})
export class MarvelApiService {
  constructor(private http: HttpClient) {}

  getEventCharacters(eventId: string) {
    return this.http.get(`events/${eventId}/characters`);
  }

  getAllCharacters(total: number) {
    return this.http.get<Array<any>>('/characters/')
      .pipe(map(characters => characters.map(char => new Character(char))));
  }

  getEvents(limit) {
    return this.http.get<Array<any>>('/events/')
      .toPromise()
      .then(events => events.slice(0, limit))
      .then(events => events.map(event => new Event(event)));
  }

  getAllEventsCharacters() {
    return this.http.get<Array<any>>('/events/characters/').toPromise();
  }

  getEventsCharactersWiki() {
    return this.http.get<Array<any>>('/events/characters/wiki').toPromise();
  }
  // TODO: deprecate
  // API call signature aux fuctions
  private errorHandler() {
    return catchError(error => {
      const errMsg = (error.message) ? error.message : error.status ? `${error.status} - ${error.statusText}` : 'Server error';
      console.error(errMsg);
      return throwError(error);
    });
  }

}

