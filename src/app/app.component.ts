import { Component, OnInit } from '@angular/core';
import { Node, Link } from './d3/models';
import { ApiService } from './api/api.service';
import {Character} from './api/character';
import {RenderService} from './shared/render.service';
import APP_CONFIG from './app.config';
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
  eventLimit = APP_CONFIG.EVENT_LIMIT;
  title = 'kindred-marvel';
  nodes: Node[] = [];
  links: Link[] = [];
  linkMap: Map<Pair, Link>;
  events: Map<number, any>;
  charMap: Map<string, Character>;
  charimgs = [];

  constructor(private apiService: ApiService,
              private renderService: RenderService) {

    this.events = new Map();
    this.charMap = new Map();
    this.linkMap = new Map();
  }

  ngOnInit(): void {
    // TODO: finish: after initial graph is rendered, add all the characters for each event. see events$.subscribe...
    // const getEventCharactersData = events => events.forEach(event =>
    //     this.apiService.getEventCharacters(event.id, event.numCharacters)
    //       // .subscribe(addAndLinkEventCharacters));
    //       .subscribe(ADD_EVENT_CHAR_TEST));
    //
    // const ADD_EVENT_CHAR_TEST = event => {
    //   console.log(this.charMap)
    //   for (const char of event.characters) {
    //     if (!this.charMap.has(char.id)) {
    //       console.log(new Character(char));
    //     }
    //   }
    // };
    ////////////////////////////////
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

    const addEventCharacters = event => {
      for (const char of event.characters) {
        if (!this.charMap.has(char.id)) {
          addCharacterNode(new Character(char));
        }
      }
    };
    const linkEventCharacters = event => {
      const eventCharacterIds = event.characters.map(character => character.id);
      // console.log(eventCharacterIds);
      // console.log(event);

      for (const charId of eventCharacterIds) {
        this.charMap.get(charId).addConnections(eventCharacterIds, event);
      }
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
      const pairToString = pair => JSON.stringify(pair)
      const stringToPair = str => JSON.parse(str)
      const connectionPairsStrings = connectionPairs.map(pairToString);
      const connectionsSet = [...new Set(connectionPairsStrings)].map(stringToPair);
      return connectionsSet;
    }
    const updateCharacterLinks = () => connectCharacterNodes(getCharactersConnections());
    const updateCharactersData = newCharactersData => newCharactersData
      .forEach(charData => this.charMap.get(charData.id).update(charData));
    const updateEventData = eventData => {
      console.log('updating:', eventData.id);
      addAndLinkEventCharacters(eventData);
      updateCharactersData(eventData.characters);
    }
    const getCharacterConnections = (events) => {
      saveEvents(events);
      refreshGraph();
    }
    const getEventCharactersData = events => events
      .forEach(event =>
        this.apiService.getEventCharacters(event.id, event.numCharacters)
          .subscribe(updateEventData));


    // const getAllEventCharactersData = events => Promise.all(events
    //   .map(event => this.apiService.getEventCharacters(event.id, event.numCharacters)
    //     .toPromise()
    //     .then(updateEventData)))
    //   .then(x => console.log('all done!'))
    const getAllEventCharactersData = events => this.apiService.getAllEventsCharacters(events, updateEventData)
      .subscribe(x => console.log('all done!', x));
    // start of events request
    this.apiService.getEvents(this.eventLimit).subscribe(events => {
      getCharacterConnections(events);
      getEventCharactersData(events);
      // getAllEventCharactersData(events);
    });
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
