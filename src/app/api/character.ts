import { Node } from '../d3/models';
export class Character {

  constructor(props: { id, name }) {
    this.id = props.id;
    this.name = props.name;
    this.connections = new Map();
    this.thumbnailURL = `http://gateway.marvel.com/v1/public/characters/${props.id}`;
    Character.N = Character.N + 1;
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

  static N = 0;
  id: string;
  name: string;
  node?: Node;
  thumbnailURL: string;
  connections: Map<string, Set<string>>;

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

