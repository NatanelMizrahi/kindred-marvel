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

  init() {
    const getIndex = n => n - 1;
    const N = APP_CONFIG.N;
    /** constructing the nodes array */
    for (let i = 1; i <= N; i++) {
      // this.nodes.push(new Node(i));
      this.nodes.push(new Node(`test${i}`)); //
    }

    for (let i = 1; i <= N; i++) {
      for (let m = 2; i * m <= N; m++) {
        /** increasing connections toll on connecting nodes */
        this.nodes[getIndex(i)].linkCount++;
        this.nodes[getIndex(i * m)].linkCount++;

        /** connecting the nodes before starting the simulation */
        this.links.push(new Link(`test${i}`, `test${i * m}`));
      }
    }
  }

  ngOnInit(): void {
    const addCharacterNode = charId => {
      const char = this.charMap.get(charId);
      const charNode = new Node(char.name, char);
      char.node = charNode;
      this.nodes.push(charNode);
    }

    const connectCharacterNodes = (id1, id2, context) => {
      const char1 = this.charMap.get(id1);
      const char2 = this.charMap.get(id2);
      this.links.push(new Link(char1.node, char2.node, context));
    }

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
        let allPairs= [];
        for (let char of this.charMap.values()) {
          allPairs.push(...char.connections.map(id => char.id < id ? `${char.id}_${id}` : `${id}_${char.id}`));
        }
        let set = new Set(allPairs);
        console.log(set);
        allPairs.forEach(pair => {
          const ids = pair.split('_');
          connectCharacterNodes(ids[0], ids[1], null);
        });
        this.renderService.resetGraph.next(true);
      }
    };

    this.events$ = this.apiService.getEvents({ limit: 1 })
      .subscribe(getCharacterConnections);
  }

  private getCharacters() {
    this.apiService.getCharacters(Array.from(this.charMap.keys()));
  }
}
