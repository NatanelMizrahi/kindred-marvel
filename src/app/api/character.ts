export class Character {
  id: string;
  name?: string;
  thumbnailURL: string;
  connections: string[];

  constructor(props: {id, name}) {
    this.connections = [];
    this.id = props.id;
    this.name = props.name;
    this.thumbnailURL = `http://gateway.marvel.com/v1/public/characters/${props.id}`;
  }
  addConnections = (characterIds) =>
    this.connections.push(...characterIds
      .filter(id => (id !== this.id) && !this.connections.includes(id)))
}
