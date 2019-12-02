import { Component, OnInit } from '@angular/core';
import { Node, Link } from './d3/models';
import { ApiService } from './api/api.service';
import APP_CONFIG from './app.config';
import {forkJoin, Observable, Subject, Subscription} from 'rxjs';
import {Character} from './api/character';
import {RenderService} from './shared/render.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [ApiService]

})
export class AppComponent  implements OnInit {
  title = 'kindred-marvel';
  nodes: Node[] = [];
  links: Link[] = [];
  events$: Subscription;
  events: Map<number, any>;
  charMap: Map<string, Character>;
  constructor(private apiService: ApiService,
              private renderService: RenderService) {

    this.events = new Map();
    this.charMap = new Map();
  }

  ngOnInit(): void {
    const addCharacterNode = charId => {
      const char = this.charMap.get(charId);
      const charNode = new Node(char);
      char.node = charNode;
      this.nodes.push(charNode);
    };

    const connectCharacterNodes = (connectionSet) => {
      for (const ids of connectionSet) {
        const [id1, id2] = [...ids];
        const char1 = this.charMap.get(id1);
        const char2 = this.charMap.get(id2);
        this.links.push(new Link(char1.node, char2.node));
      }
    };

    const getCharacterConnections = (events) => {
      for (const event of events) {
        // save events by eventID
        this.events.set(event.id, event);
        // save new characters
        const eventCharacterIds = [];
        for (const char of event.characters) {
          eventCharacterIds.push(char.id);
          if (!this.charMap.has(char.id)) {
            this.charMap.set(char.id, new Character(char));
            addCharacterNode(char.id);
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
        console.log(connectionPairs);
        const connectionPairsStrings = connectionPairs.map(x => JSON.stringify(x));
        console.log(connectionPairsStrings);
        const connesctionsSet = [...new Set(connectionPairsStrings)].map(x => JSON.parse(x));
        console.log(connesctionsSet);
        const connectionsMap = new Map(connesctionsSet);
        connectCharacterNodes(connesctionsSet);
      }
      this.renderService.resetGraph.next(true);
    };

    this.events$ = this.apiService.getEvents({ limit: 12 })
      .subscribe(getCharacterConnections);
  }

  private getCharacters() {
    this.apiService.getCharacters(Array.from(this.charMap.keys()));
  }

  get characters() {
    return [...this.charMap.values()];
  }
}
