import { Component, OnInit } from '@angular/core';
import { Node, Link } from './d3/models';
import { ApiService } from './api/api.service';
import APP_CONFIG from './app.config';
import {forkJoin, Observable, Subject, Subscription} from 'rxjs';
import {Character} from './api/character';
import {RenderService} from './shared/render.service';
interface Pair {
  id1: any;
  id2: any;
}
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [ApiService]

})
export class AppComponent  implements OnInit {
  eventLimit = 12;
  title = 'kindred-marvel';
  nodes: Node[] = [];
  links: Link[] = [];
  linkMap: Map<Pair, Link>;
  events: Map<number, any>;
  charMap: Map<string, Character>;
  constructor(private apiService: ApiService,
              private renderService: RenderService) {

    this.events = new Map();
    this.charMap = new Map();
    this.linkMap = new Map();
  }

  ngOnInit(): void {
    const addCharacterNode = (char: Character) => {
      this.nodes.push(new Node(char));
      this.charMap.set(char.id, char);
    }
    const connectCharacterNodes = (connectionSet) => {
      for (const ids of connectionSet) {
        const [id1, id2] = [...ids];
        const char1 = this.charMap.get(id1);
        const char2 = this.charMap.get(id2);
        if (!this.linkMap.has({id1, id2})) {
          const link = new Link(char1.node, char2.node);
          this.links.push(link);
          this.linkMap.set({id1, id2}, link);
        }
      }
    };
    //TODO:
    // const getEventCharactersData = events => {
    //   events.forEach(event => {
    //     this.apiService.getEventCharacters(event.id, event.numCharacters)
    //       .subscribe(eventCharacters => {
    //         for (const character of eventCharacters) {
    //           if (!this.charMap.has(character.id)) {
    //
    //           }
    //
    //         }
    //       });
    //   })
    // };
    const addEventCharacters = event => {
      for (const char of event.characters) {
        if (!this.charMap.has(char.id)) {
          this.charMap.set(char.id, new Character(char));
          addCharacterNode(char);
        }
      }
    };
    const linkEventCharacters = event => {
      const eventCharacterIds = event.characters.map(character => character.id);
      for (const char of event.characters) {
        this.charMap.get(char.id).addConnections(eventCharacterIds, event);
      }
    };
    const refreshGraph = () => this.renderService.resetGraph.next(true);
    const registerEvent = event => this.events.set(event.id, event);
    const saveEvents = events => events.forEach(event => saveEventData(event));
    const saveEventData = (events: any[]) => {
      registerEvent(event);
      addEventCharacters(event);
      linkEventCharacters(event);
    };
    const getCharactersConnections = () => {
      const connectionPairs = [];
      for (const char of this.characters) {
        connectionPairs.push(...char.lexicalLinks);
      }
      const connectionPairsStrings = connectionPairs.map(x => JSON.stringify(x));
      const connectionsSet = [...new Set(connectionPairsStrings)].map(x => JSON.parse(x));
      return connectionsSet;
    }
    const updateCharacterLinks = () => connectCharacterNodes(getCharactersConnections());
    const getCharacterConnections = (events) => {
      for (const event of events) {
        // save events by eventID
        this.events.set(event.id, event);
        // save new characters
        const eventCharacterIds = [];
        for (const char of event.characters) {
          eventCharacterIds.push(char.id);
          if (!this.charMap.has(char.id)) {
            addCharacterNode(new Character(char));
          }
        }
        // update the characters connected to this event
        for (const char of event.characters) {
          this.charMap.get(char.id).addConnections(eventCharacterIds, event);
        }
        // update links
        const connectionPairs = [];
        for (const char of this.characters) {
          connectionPairs.push(...char.lexicalLinks);
        }
        const connectionPairsStrings = connectionPairs.map(x => JSON.stringify(x));
        const connectionsSet = [...new Set(connectionPairsStrings)].map(x => JSON.parse(x));
        connectCharacterNodes(connectionsSet);
      }
      this.renderService.resetGraph.next(true);
    };
    const test = () => {
      this.apiService.getEventCharacters('318', 144)
        .subscribe(console.log);
    };
    const events$ = this.apiService.getEvents(this.eventLimit);
    events$.subscribe(events => {
      getCharacterConnections(events);
      // getEventCharactersData(events);
      test();

    });
    // this.apiService.getAllCharacters(304)
    //   .subscribe(getCharacterConnections);
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
