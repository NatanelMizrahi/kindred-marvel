import {Character} from './character';

export interface CharIdObject {
  id: number;
}

export interface APIEvent {
  id: number;
  title: string;
  description: string;
  characters: {
    available: number;
    items: CharIdObject[];
  };
  thumbnail: {
    path: string;
    extension: string;
  };
}

export class Event {
  id: number;
  title: string;
  thumbnailURL: string;
  numCharacters: number;
  description: string;
  characterIds: Set<number>;

  constructor(event: APIEvent) {
    this.id = event.id;
    this.title = event.title;
    this.description = event.description;
    this.numCharacters = event.characters.available;
    this.thumbnailURL = `${event.thumbnail.path}.${event.thumbnail.extension}`;
    this.characterIds = new Set();
  }
  updateCharacters(characters: CharIdObject[]) {
    characters.forEach(char => this.characterIds.add(char.id));
  }

}

