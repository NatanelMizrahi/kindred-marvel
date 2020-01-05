import { Node } from '../d3/models';
import APP_CONFIG from '../app.config';

type CharacterId = number;
type EventId = number;

export interface APICharacter {
  id: CharacterId;
  name: string;
  description?: string;
  thumbnail?: {
    path: string,
    extension: string
  };
  events?: {
    items: Array<{
      resourceURI: string,
      name: string
    }>;
  };
  aliases?: string[];
  alliances?: string[];
}

export class Character {
  static N = 0;

  id: CharacterId;
  name: string;
  description?: string;
  thumbnailURL: string;
  connections: Map<CharacterId, Set<EventId>>;
  node?: Node;
  aliases?: string[];
  alliances?: string[];

  constructor(apiCharacter: APICharacter) {
    Character.N = Character.N + 1;
    this.id = apiCharacter.id;
    this.name = apiCharacter.name;
    this.description = apiCharacter.description;
    this.connections = new Map();
    this.thumbnailURL = apiCharacter.thumbnail ?
      `${apiCharacter.thumbnail.path}/standard_xlarge.${apiCharacter.thumbnail.extension}` :
      this.randImage();
  }

  update(apiCharacter: APICharacter) {
    if (!this.description) {
      this.description = apiCharacter.description;
    }
    this.alliances = apiCharacter.alliances;
    this.aliases = apiCharacter.aliases;
    console.log(this.alliances, this.aliases);
  }

  get lexicalStringLinks() {
    return this.connected.map(id => this.id < id ? `${this.id}_${id}` : `${id}_${this.id}`);
  }
  get connected() {
    return [...this.connections.keys()];
  }
  get linkCount() {
    return this.connections.size;
  }

  addConnection = (characterId, eventId) => {
    if (!this.connections.has(characterId)) {
      this.connections.set(characterId, new Set([eventId]));
    } else {
      this.connections.get(characterId).add(eventId);
    }
  }

  linkStrength(character: Character) {
    return this.connections.get(character.id).size;
  }

  addConnections = (characterIds, eventId) => {
    for (const id of characterIds) {
      if (id !== this.id) {
        this.addConnection(id, eventId);
      }
    }
  }
  randImage() {
    const rand = Math.floor(Math.random() * (APP_CONFIG.N_IMAGES));
    return `assets/sprites/${rand}.svg`;
  }
}

