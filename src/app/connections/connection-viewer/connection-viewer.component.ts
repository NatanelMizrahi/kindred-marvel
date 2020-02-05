import { Component, Input, ViewEncapsulation } from '@angular/core';
import {Character} from '../../api/character';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Event } from '../../api/event';
import {TeamName} from '../../api/types';

@Component({
  selector: 'connection-viewer',
  templateUrl: './connection-viewer.component.html',
  encapsulation: ViewEncapsulation.None,

})
export class ConnectionViewerComponent {
  @Input() char1: Character;
  @Input() char2: Character;
  @Input() allEvents: Map<number, Event>;
  characters: Character[];
  commonEvents: Event[];
  commonAlliances: TeamName[];
  options = {
    ariaLabelledBy: 'modal-basic-title',
    windowClass: 'dark-modal',
    scrollable: true,
    size: 'xl'
  };
  constructor(private modalService: NgbModal) {
    // TODO: change Char to contain event instead of eventId
  }
  havePowers() {
    return this.characters.some(char => char.hasPowers);
  }

  open(content) {
    this.characters = [this.char1, this.char2];
    console.log(this.characters);
    this.commonEvents = [...this.char1.connections.get(this.char2.id)].map(eventId => this.allEvents.get(eventId));
    this.commonAlliances = [...(this.char1.allies.get(this.char2.id) || [])];
    this.modalService.open(content, this.options);
  }


}
