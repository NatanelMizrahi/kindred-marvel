import { Injectable } from '@angular/core';
import {Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RenderService {
  resetGraph: Subject<boolean>;
  fixCoords: Subject<{nodeId: string, x: number, y: number}>;

  constructor() {
    this.resetGraph = new Subject();
    this.fixCoords = new Subject();
  }

  pinNode(id: string, x: number, y: number) {
    this.fixCoords.next({ nodeId: id, x, y });
  }
}
