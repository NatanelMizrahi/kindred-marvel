import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Md5} from 'ts-md5/dist/md5';
import { map } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import {Filter} from './filter';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseURL = 'http://gateway.marvel.com/v1/public/';
  private PRIVATE_KEY = '45fa4b195968ea83950ad2c3db4452896e3af40b';
  private PUBLIC_KEY = 'ba17846545643040dfa18e81f84c6c45';
  constructor(private http: HttpClient) {}

  private getCharAttributes(char) {
    const id = char.resourceURI.split('/').splice(-1)[0];
    return { id: id, name: char.name };
  }
  private getCharacter(charID: string) {
    return this.http.get(this.apiUrl(`characters/{char.id}`));
  }
  getCharacters(charIds: string[]) {
    return forkJoin(charIds.map(this.getCharacter));
  }
  getEvents(route , filter: Filter = {}) {
    const p = x => { console.dir(x); return x; };
    const responseToArray = res => res.data.results;
    const eventsToCharacters = events => events.map(event =>
      ({
        id: event.id,
        title: event.title,
        sum: event.description,
        thumbnailURL: `${event.thumbnail.path}.${event.thumbnail.extension}`,
        characters: event.characters.items.map(this.getCharAttributes)
      })
    );
    return this.http.get(this.apiUrl(route, filter))
      .pipe(
        map(responseToArray),
        map(eventsToCharacters)
      );
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
  private urlToQuery(url, filters= {}) {
   return this.apiUrl(url.split('marvel.com/v1/public/')[1], filters);
  }
}
