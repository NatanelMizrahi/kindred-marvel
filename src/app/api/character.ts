import { Node } from '../d3/models';

interface APICharacter {
  id: string;
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
}

export class Character {
  static N = 0;

  id: string;
  name: string;
  description?: string;
  node?: Node;
  thumbnailURL: string;
  connections: Map<string, Set<string>>;
  eventIds: string[];

  constructor(apiCharacter: APICharacter) {
    Character.N = Character.N + 1;
    this.id = apiCharacter.id;
    this.name = apiCharacter.name;
    this.description = apiCharacter.description;
    this.connections = new Map();
    if (apiCharacter.thumbnail) {
      this.thumbnailURL = `${apiCharacter.thumbnail.path}/standard_large.${apiCharacter.thumbnail.extension}`;
    }

  }

  get lexicalLinks() {
    return this.connected.map(id => this.id < id ? [this.id, id] : [id, this.id]);
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
}

