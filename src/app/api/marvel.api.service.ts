import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {catchError, map} from 'rxjs/operators';
import {throwError} from 'rxjs';
import { Character} from './character';

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
export class MarvelApiService {
  constructor(private http: HttpClient) {}

  private getCharAttributes(char) {
    const id = +(char.resourceURI.split('/').splice(-1)[0]);
    return { id, name: char.name };
  }

  getAllCharacters(total: number) {
    return this.http.get<Array<any>>('/characters/')
      .pipe(map(characters => characters.map(char => new Character(char))));
  }

  getEvents(limit) {
    const extractEventData = event =>
      ({
        id:             event.id,
        title:          event.title,
        description:    event.description,
        numCharacters:  event.characters.available,
        characters:     event.characters.items.map(this.getCharAttributes),
        thumbnailURL:   `${event.thumbnail.path}.${event.thumbnail.extension}`
      });
    const extractAllEventsData = events =>
      events.map(extractEventData);

    return this.http.get<Array<any>>('/events/').toPromise()
      .then(events => extractAllEventsData(events.slice(0, limit)));
  }

  getAllEventsCharacters() {
    return this.http.get<Array<any>>('/events/characters/').toPromise();
  }
  getEventCharacters(eventId: string) {
    return this.http.get(`events/${eventId}/characters`);
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

