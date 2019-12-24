import { Component, OnInit } from '@angular/core';
import { Node, Link } from './d3/models';
import { MarvelApiService } from './api/marvel.api.service';
import { HeroesApiService } from './api/heroes.api.service';
import {Character} from './api/character';
import {RenderService} from './shared/render.service';
import APP_CONFIG from './app.config';
import {flatten} from '@angular/compiler';
interface Pair {
  id1: any;
  id2: any;
}

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
  linkMap: Map<Pair, Link>;
  events: Map<number, any>;
  charMap: Map<string, Character>;
  filteredCharMap: Map<string, Character>;
  names: string[] = [];

  constructor(
    private apiService: MarvelApiService,
    private renderService: RenderService,
    private heroesApiService: HeroesApiService
  ) {
    this.events = new Map();
    this.charMap = new Map();
    this.linkMap = new Map();
    this.filteredCharMap = new Map();
  }

  ngOnInit(): void {
    const addCharacterNode = (char: Character) => {
      this.nodes.push(new Node(char));
      this.charMap.set(char.id, char);
    };
    const connectCharacterNodes = (connectionSet) => {
      for (const ids of connectionSet) {
        const [id1, id2] = [...ids];
        const char1 = this.charMap.get(id1);
        const char2 = this.charMap.get(id2);
        if (!this.linkMap.has({ id1, id2 })) {
          const link = new Link(char1.node, char2.node);
          this.links.push(link);
          this.linkMap.set({ id1, id2 }, link);
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
          .addConnections(eventCharacterIds, event));
    };
    const refreshGraph = () => this.renderService.refreshView();
    const registerEvent = event => this.events.set(event.id, event);
    const addAndLinkEventCharacters = event => {
      addEventCharacters(event);
      linkEventCharacters(event);
      updateCharacterLinks();
    };
    const saveEventData = event => {
      registerEvent(event);
      addAndLinkEventCharacters(event);
    };

    const saveEvents = events => events.forEach(saveEventData);
    const getCharactersConnections = () => {
      const connectionPairs = [];
      for (const char of this.characters) {
        connectionPairs.push(...char.lexicalLinks);
      }
      const pairToString = pair => JSON.stringify(pair);
      const stringToPair = str => JSON.parse(str);
      const connectionPairsStrings = connectionPairs.map(pairToString);
      const connectionsSet = [...new Set(connectionPairsStrings)].map(stringToPair);
      return connectionsSet;
    };
    const updateCharacterLinks = () => connectCharacterNodes(getCharactersConnections());
    const updateCharactersData = newCharactersData => newCharactersData
      .forEach(charData => this.charMap.get(charData.id).update(charData));
    const updateEventData = eventData => {
      console.log('updating:', eventData.id);
      addAndLinkEventCharacters(eventData);
      updateCharactersData(eventData.characters);
    };
    const getCharacterConnections = (events) => {
      saveEvents(events);
      refreshGraph();
    };
    const getEventCharactersData = events => events
      .map(event =>
        this.apiService.getEventCharacters(event.id, event.numCharacters)
          .toPromise().then(updateEventData))
          // .subscribe(updateEventData).add());

    const getAllEventCharactersData = events => this.apiService.getAllEventsCharacters(events, updateEventData)
      .subscribe(x => console.log('all done!', x));
    // start of events request
    this.apiService.getEvents(this.eventLimit).subscribe(events => {
      getCharacterConnections(events);
      Promise.all(getEventCharactersData(events))
        .then(refreshGraph);
      // getAllEventCharactersData(events);
    });

    this.setHeroesGroups();
  }

  private setHeroesGroups = () => {
    const characters = this.charMap.values();
    for (const char of characters) {
      this.heroesApiService.addGroups(char);
    }
  }

  private searchCharacterSuggest = (filterText: string) => {
    this.filteredCharMap = new Map();
    const allCharacters = this.characters;
    filterText = filterText.toLowerCase();
    for (const char of allCharacters) {
      if (char.name.toLowerCase().indexOf(filterText.toLowerCase()) !== -1) {
        this.filteredCharMap.set(char.name, char);
      }
    }
    this.names = Array.from(this.filteredCharMap.keys());
  }

  private getCharFromName = (name: string): Character => {
    return this.filteredCharMap.get(name);
  }

  private getTopConnections(connections: Map<string, Set<string>>) {
    const connectionsComparator = (connA, connB) => connA[1].size - connB[1].size
    const sortedConnections = Array.from(connections).sort(connectionsComparator);
    return sortedConnections.slice(0, APP_CONFIG.MAX_VISIBLE_CHARS - 1).map(x => x[0]);
  }

  private searchCharacterButton = (name: string) => {
    const char = this.getCharFromName(name);
    const topConnections = this.getTopConnections(char.connections);
    topConnections.push(char.id);
    const filterNodes = this.nodes.filter(node =>
      topConnections.includes(node.character.id)
    );

    const activeNodesSet = new Set(filterNodes);
    const activeLinks = flatten(filterNodes.map(node => node.links)).filter(
      (link: Link) =>
        activeNodesSet.has(link.source) && activeNodesSet.has(link.target)
    );
    this.nodes = filterNodes;
    this.links = activeLinks;
    this.renderService.refreshView();
  }

  private getCharacters() {
    this.apiService.getCharacters(Array.from(this.charMap.keys()));
  }

  get characters() {
    return [...this.charMap.values()];
  }
  private getAllCharacters(limit= 200) {
    this.apiService.getCharacters(Array.from(this.charMap.keys()));
  }
}
