import { Node } from '../d3/models';
export class Character {
  id: string;
  name: string;
  node?: Node;
  thumbnailURL: string;
  connections: Map<string, string[]>;

  constructor(props: {id, name}) {
    this.id = props.id;
    this.name = props.name;
    this.connections = [];
    this.thumbnailURL = `http://gateway.marvel.com/v1/public/characters/${props.id}`;
  }
  addConnections = (characterIds, event) =>
    this.connections.push(...characterIds
      .filter(id => (id !== this.id) && !this.connections.includes(id)))
}
