import { Component, OnInit } from '@angular/core';
import {Node, Link, LinkType} from './d3/models';
import { MarvelApiService } from './api/marvel.api.service';
import {Character} from './api/character';
import {RenderService} from './shared/render.service';
import APP_CONFIG from './app.config';
import {flatten} from '@angular/compiler';
import {Event} from './api/event';
import {D3Service} from './d3';
import {TeamName} from './api/types';

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
  events: Map<EventId, Event>;

  filteredCharMap: Map<CharName, Character>;
  filteredCharacterNames: CharName[] = [];
  characterQuery: any;
  private loaded: boolean;



  constructor(
    private apiService: MarvelApiService,
    private renderService: RenderService,
    private d3Service: D3Service
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

    const addEventCharacters = event => {
      for (const char of event.characters) {
        if (!this.charMap.has(char.id)) {
          addCharacterNode(new Character(char));
        }
      }
    };

    const linkEventCharacters = event => {
      const eventCharacterIds = event.characters.map(character => character.id);
      this.events.get(event.id).updateCharacters(eventCharacterIds);
      eventCharacterIds.forEach(charId =>
        this.charMap.get(charId)
          .addConnections(eventCharacterIds, event.id));
    };

    const registerEvent = event => {
      const savedEvent = this.events.get(event.id);
      if (!savedEvent) {
        this.events.set(event.id, event);
      }
    };

    const saveEventData = event => {
      registerEvent(event);
      addEventCharacters(event);
      linkEventCharacters(event);
    };

    const saveEvents = events => events.forEach(saveEventData);
    const registerEvents = events => events.forEach(registerEvent);
    const connectCharacterNodes = connectionSet => {
      for (const pairId of connectionSet) {
        const [id1, id2, linkType] = pairId.split('_');
        const char1 = this.charMap.get(+id1);
        const char2 = this.charMap.get(+id2);
        if (!this.linkMap.has(pairId)) {
          const link = new Link(char1.node, char2.node, linkType);
          this.links.push(link);
          this.linkMap.set(pairId, link);
        }
      }
    };

    const getCharactersConnections = (linkType: LinkType) => {
      let connectionPairs = [];
      this.characters.forEach(char => connectionPairs.push(...char.lexicalStringLinks(linkType)));
      connectionPairs = [...new Set(connectionPairs)];
      console.log('#links=', connectionPairs.length);
      return connectionPairs;
    };

    const updateAllCharactersLinks = (linkType: LinkType) => connectCharacterNodes(getCharactersConnections(linkType));
    const updateAllCharactersEventLinks = () => updateAllCharactersLinks('EVENT');
    const updateAllCharactersAllianceLinks = () => updateAllCharactersLinks('ALLIANCE');

    const updateCharactersWiki = charactersData =>
      charactersData.forEach(charData => this.charMap.get(charData.id).update(charData));

    const getEventsCharactersWiki = () =>
      this.apiService.getEventsCharactersWiki()
        .then(updateCharactersWiki);

    const updateCharacterAlliances = () => {
      const teamMembersMap: Map<TeamName, Character[]> = new Map()
      for (const char of this.characters) {
        if (char.alliances) {
          for (const team of char.alliances) {
            if (!teamMembersMap.has(team)) {
              teamMembersMap.set(team, []);
            }
            teamMembersMap.get(team).push(char);
          }
        }
      }
      // TODO: maybe remove teams later on.
      for (const char of this.characters) {
        if (teamMembersMap.has(char.name)) {
          // character is actually a team, add a link to each of its members
          teamMembersMap.get(char.name).push(char);
        }
      }
      teamMembersMap.forEach((allies, team, map) =>
        allies.forEach(char => char.updateAllies(team, allies)));
    }
    const AddAlliancesLinks = () => {
      updateCharacterAlliances();
      updateAllCharactersAllianceLinks();
    }
    const getEventsCharacters = () => this.apiService.getAllEventsCharacters();
    const renderGraph = () => this.chooseNClique(APP_CONFIG.MAX_VISIBLE_CHARS);
    const getEvents = () => this.apiService
      .getEvents(this.eventLimit)
      .then(registerEvents);
    let n = 0;
    const p = a => { console.log(n, a); n++; return a; };
    // start of events request
    getEvents()
      .then(getEventsCharacters)
      .then(saveEvents)
      .then(updateAllCharactersEventLinks)
      .then(renderGraph)
      .then(getEventsCharactersWiki)
      .then(AddAlliancesLinks)
      .then(disableLoadAnimation)
      .then(renderGraph);
  }

  get characters() {
    return [...this.charMap.values()];
  }

  private searchCharacterSuggest = (filterText: string) => {
    this.filteredCharMap = new Map();
    const allCharacters = this.characters;
    filterText = filterText.toLowerCase();
    for (const char of allCharacters) {
      if (char.name.toLowerCase().includes(filterText)) {
        this.filteredCharMap.set(char.name, char);
        if (this.filteredCharMap.size === APP_CONFIG.SEARCH_LIMIT) {
          break;
        }
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

  private chooseNClique(numCharacters: number) {
    console.log('rendering graph');
    const nodeSizeComparator = (nodeA, nodeB) => nodeB.linkCount - nodeA.linkCount;
    this.activeNodes = this.nodes
      .sort(nodeSizeComparator)
      .slice(0, numCharacters);
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
  private setChosenChars(name: string) {
    const char = this.getCharFromName(name);
    this.d3Service.chooseCharacter(char);
  }
}
