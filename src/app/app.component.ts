import { Component, OnInit } from '@angular/core';
import { Node, Link } from './d3/models';
import { MarvelApiService } from './api/marvel.api.service';
import {Character} from './api/character';
import {RenderService} from './shared/render.service';
import APP_CONFIG from './app.config';
import {flatten} from '@angular/compiler';

type IdPair = string;
type CharName = string;
type CharacterId = number;
type EventId = number;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [MarvelApiService]

})

export class AppComponent  implements OnInit {
  eventLimit = APP_CONFIG.EVENT_LIMIT;
  title = 'kindred-marvel';
  nodes: Node[] = [];
  links: Link[] = [];
  activeNodes: Node[] = [];
  activeLinks: Link[] = [];

  charMap: Map<CharacterId, Character>;
  linkMap: Map<IdPair, Link>;
  events: Map<EventId, any>; // Event

  filteredCharMap: Map<CharName, Character>;
  filteredCharacterNames: CharName[] = [];
  characterQuery: any;
  private loaded: boolean;



  constructor(
    private apiService: MarvelApiService,
    private renderService: RenderService,
  ) {
    this.events = new Map();
    this.charMap = new Map();
    this.linkMap = new Map();
    this.filteredCharMap = new Map();
    this.loaded = false;
  }

  ngOnInit(): void {
    const disableLoadAnimation = () => this.loaded = true;
    const addCharacterNode = (char: Character) => {
      this.nodes.push(new Node(char));
      this.charMap.set(char.id, char);
    };
    const connectCharacterNodes = (connectionSet) => {
      for (const pairId of connectionSet) {
        const [id1, id2] = pairId.split('_');
        const char1 = this.charMap.get(+id1);
        const char2 = this.charMap.get(+id2);
        if (!this.linkMap.has(pairId)) {
          const link = new Link(char1.node, char2.node);
          this.links.push(link);
          this.linkMap.set(pairId, link);
        }
      }
    };

    const addEventCharacters = event => {
      for (const char of event.characters) {
        if (!this.charMap.has(char.id)) {
          addCharacterNode(new Character(char));
        }
      }
    };
    const linkEventCharacters = event => {
      const eventCharacterIds = event.characters.map(character => character.id);
      eventCharacterIds.forEach(charId =>
        this.charMap.get(charId)
          .addConnections(eventCharacterIds, event.id));
    };
    const refreshGraph = () => this.renderService.refreshView();
    const registerEvent = event => this.events.set(event.id, event);
    const saveEventData = event => {
      registerEvent(event);
      addEventCharacters(event);
      linkEventCharacters(event);
    };

    const saveEvents = events => events.forEach(saveEventData);
    const getCharactersConnections = () => {
      let connectionPairs = [];
      this.characters.forEach(char => connectionPairs.push(...char.lexicalStringLinks));
      connectionPairs = [...new Set(connectionPairs)];
      console.log(connectionPairs.length);
      return connectionPairs;
    };
    const updateCharacterLinks = () => connectCharacterNodes(getCharactersConnections());
    const getCharacterConnections = (events) => saveEvents(events);
    const getEventCharactersData = events => Promise.all(events.map(event =>
        this.apiService.getEventCharacters(event.id)
          .toPromise()
          .then(saveEventData)));
    const updateCharactersWiki = charactersData =>
      charactersData.forEach(charData => this.charMap.get(charData.id).update(charData))
    const getEventsCharactersWiki = () =>
      this.apiService.getEventsCharactersWiki()
        .then(updateCharactersWiki);


    const getAllEventCharactersData = () => this.apiService
      .getAllEventsCharacters().then(saveEvents)


    const renderGraph = () => this.chooseNClique();
    // start of events request
    this.apiService.getAllEventsCharacters()
      .then(saveEvents)
    // this.apiService.getEvents(this.eventLimit)
    //   .then(getEventCharactersData)
      .then(updateCharacterLinks)
      .then(renderGraph)
      .then(getEventsCharactersWiki)
      .then(disableLoadAnimation)
      .then(renderGraph);
  }

  private searchCharacterSuggest = (filterText: string) => {
    this.filteredCharMap = new Map();
    const allCharacters = this.characters;
    filterText = filterText.toLowerCase();
    for (const char of allCharacters) {
      if (char.name.toLowerCase().includes(filterText)) {
        this.filteredCharMap.set(char.name, char);
      }
    }
    this.filteredCharacterNames = [...this.filteredCharMap.keys()];
  }

  private getCharFromName = (name: string): Character => {
    return this.filteredCharMap.get(name);
  }

  private getTopConnections(connections: Map<CharacterId, Set<EventId>>) {
    const connectionsComparator = (connA, connB) => connB[1].size - connA[1].size;
    const getCharacterId = connectionPair => connectionPair[0];
    const sortedConnections = Array
      .from(connections)
      .sort(connectionsComparator);
    return sortedConnections
      .slice(0, APP_CONFIG.MAX_VISIBLE_CHARS - 1)
      .map(getCharacterId);
  }

  private searchCharacterButton = (name: string) => {
    console.log('searchCharacterSuggest');
    const char = this.getCharFromName(name);
    const topConnections = this.getTopConnections(char.connections);
    topConnections.push(char.id);
    this.activeNodes = topConnections.map(charId => this.charMap.get(charId).node);
    this.updateActiveLinks();
  }

  get characters() {
    return [...this.charMap.values()];
  }
  private clear() {
    this.filteredCharacterNames = [];
  }
  private chooseNClique() {
    console.log('rendering graph');
    const nodeSizeComparator = (nodeA, nodeB) => nodeB.linkCount - nodeA.linkCount;
    this.activeNodes = this.nodes
      .sort(nodeSizeComparator)
      .slice(0, APP_CONFIG.MAX_VISIBLE_CHARS);
    this.updateActiveLinks();
  }

  private updateActiveLinks() {
    const activeNodesSet = new Set(this.activeNodes);
    this.activeLinks = flatten(this.activeNodes.map(node => node.links
      .filter(link =>
        activeNodesSet.has(link.source) &&
        activeNodesSet.has(link.target))
    ));
    this.renderService.refreshView();
  }
}
