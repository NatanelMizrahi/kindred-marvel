import {APIEvent, CharacterId, EventId} from './types';

export class Event {
  id: EventId;
  title: string;
  thumbnailURL: string;
  marvelURL: string;
  numCharacters: number;
  description: string;
  characterIds: Set<CharacterId>;

  constructor(event: APIEvent) {
    this.id = event.id;
    this.title = event.title;
    this.description = event.description;
    this.numCharacters = event.characters.available;
    this.thumbnailURL = `${event.thumbnail.path}.${event.thumbnail.extension}`;
    this.marvelURL = event.urls.filter(url => url.type === 'detail')[0].url;
    this.characterIds = new Set();
  }

  updateCharacters(characterIds: CharacterId[]) {
    characterIds.forEach(charId => this.characterIds.add(charId));
  }

  // only serialize the following when exporting to JSON
  toJSON() {
    console.log([...this.characterIds]);
    return {
      eventId: this.id,
      eventTitle: this.title,
      description: this.description,
      numOfCharacters: this.numCharacters,
      thumbnailURL: this.thumbnailURL,
      marvelURL: this.marvelURL,
      characterIds: [...this.characterIds]
    };
  }
}

