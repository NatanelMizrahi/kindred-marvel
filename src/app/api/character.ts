import {LinkType, Node} from '../d3/models';
import APP_CONFIG from '../app.config';
import {APICharacter, CharacterId, EventId, TeamName} from './types';

export class Character {
  static N = 0;

  id: CharacterId;
  name: string;
  description?: string;
  thumbnailURL: string;
  marvelURL?: string;
  connections: Map<CharacterId, Set<EventId>>;
  allies: Map<CharacterId, Set<TeamName>>;
  powers: string[];

  node?: Node;
  events: Set<EventId>;
  aliases?: string[];
  alliances?: string[];
  alignment?: string;
  fullName?: string;
  type?: string;

  constructor(apiCharacter: APICharacter) {
    Character.N = Character.N + 1;
    this.id = apiCharacter.id;
    this.name = apiCharacter.name;
    this.description = apiCharacter.description;
    this.connections = new Map();
    this.allies = new Map();
    this.events = new Set();
    this.powers = [];
    this.thumbnailURL = apiCharacter.thumbnail ?
      `${apiCharacter.thumbnail.path}/standard_xlarge.${apiCharacter.thumbnail.extension}` :
      this.randImage();
  }

  update(apiCharacter: APICharacter) {
    this.alliances =  apiCharacter.alliances;
    this.aliases =    apiCharacter.aliases;
    this.powers =     apiCharacter.powers;
    this.fullName =   apiCharacter.full_name;
    this.alignment =  apiCharacter.alignment;
    this.type =       apiCharacter.type;
    const wikiUrls = apiCharacter.urls.filter(url => url.type === 'wiki');
    this.marvelURL = wikiUrls.length > 0 ? wikiUrls[0].url : apiCharacter.urls[0].url;
  }

  lexicalStringLinks(linkType: LinkType) {
    const connections = linkType === 'EVENT' ? this.connected : this.allied;
    return connections.map(id => this.id < id ? `${this.id}_${id}_${linkType}` : `${id}_${this.id}_${linkType}`);
  }
  get connected() {
    return [...this.connections.keys()];
  }
  get allied() {
    return [...this.allies.keys()];
  }
  get linkCount() {
    return this.connections.size;
  }
  get alignemntIcon() {
    const img = this.alignment ? this.alignment.replace('/', '') : '0'
    return `assets/sprites/${img}.png`;
  }
  get hasPowers() {
    return this.powers.length > 0;
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
    this.events.add(eventId);
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

  updateAllies(team: TeamName, allies: Character[]) {
    for (const ally of allies) {
      if (ally.id !== this.id) {
        if (!this.allies.has(ally.id)) {
          this.allies.set(ally.id, new Set<TeamName>());
        }
        this.allies.get(ally.id).add(team);
      }
    }
  }

  // only serialize the following when exporting to JSON
  toJSON() {
    const allies = {};
    const eventConnections = {};
    const eventIds = [...this.events];
    for (const [char, teams] of this.allies.entries()) {
      allies[char] = [...teams];
    }
    for (const [char, events] of this.connections.entries()) {
      eventConnections[char] = [...events];
    }
    const { id, name, alignment, description, powers, fullName, thumbnailURL, marvelURL} = this;
    return { id, name, alignment, description, powers, fullName, thumbnailURL, marvelURL, eventIds, allies, eventConnections};
  }
}

