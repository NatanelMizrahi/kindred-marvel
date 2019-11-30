import { Component, OnInit } from '@angular/core';
import { Node, Link } from './d3/models';
import { ApiService } from './api/api.service';
import APP_CONFIG from './app.config';
import {forkJoin, Observable, Subscription} from 'rxjs';
import {Character} from './api/character';

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
  characters = [];
  charIDs = new Set<string>();
  events = new Map<number, any>();
  charMap = new Map<string, Character>();

  constructor(private apiService: ApiService) {
    const N = APP_CONFIG.N;
    const getIndex = n => n - 1;

    /** constructing the nodes array */
    for (let i = 1; i <= N; i++) {
      this.nodes.push(new Node(i)); //`test${i}`
    }

    for (let i = 1; i <= N; i++) {
      for (let m = 2; i * m <= N; m++) {
        /** increasing connections toll on connecting nodes */
        this.nodes[getIndex(i)].linkCount++;
        this.nodes[getIndex(i * m)].linkCount++;

        /** connecting the nodes before starting the simulation */
        this.links.push(new Link(i, i * m));
      }
    }
  }

  ngOnInit(): void {
    this.events$ = this.apiService.getEvents('events', { limit: 15 })
      .subscribe(this.getCharacterConnections);
  }
  private getCharacterConnections(events) {
    console.log(events);
    for (const event of events) {
      // save events by eventID
      this.events.set(event.id, event);
      // save new characters
      const eventCharacterIds = [];
      for (const char of event.characters) {
        eventCharacterIds.push(char.id);
        if (!this.charMap.has(char.id)) {
          this.charMap.set(char.id, new Character(char));
        }
      }
      // update the characters connected to this event
      for (const char of event.characters) {
        this.charMap.get(char.id).addConnections(eventCharacterIds);
      }
    }
  }
  private getCharacters() {
    this.apiService.getCharacters(Array.from(this.charIDs));
  }
}
