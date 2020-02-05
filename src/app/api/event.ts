import {APIEvent, CharIdObject} from './types';

export class Event {
  id: number;
  title: string;
  thumbnailURL: string;
  marvelURL: string;
  numCharacters: number;
  description: string;
  characterIds: Set<number>;

  constructor(event: APIEvent) {
    this.id = event.id;
    this.title = event.title;
    this.description = event.description;
    this.numCharacters = event.characters.available;
    this.thumbnailURL = `${event.thumbnail.path}.${event.thumbnail.extension}`;
    this.marvelURL = event.urls.filter(url => url.type === 'detail')[0].url;
    this.characterIds = new Set();
  }
  updateCharacters(characters: CharIdObject[]) {
    characters.forEach(char => this.characterIds.add(char.id));
  }

}

