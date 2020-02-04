import {Directive, Input, ElementRef, OnInit} from '@angular/core';
import { Node, ForceDirectedGraph } from '../models';
import { D3Service } from '../d3.service';

@Directive({
  selector: '[hoverableNode]'
})
export class HoverableDirective implements OnInit {
  @Input('hoverableNode') hoverableNode: Node;
  @Input('hoverableInGraph') hoverableInGraph: ForceDirectedGraph;

  constructor(private d3Service: D3Service, private _element: ElementRef) { }

  ngOnInit() {
    this.d3Service.applyHoverableBehaviour(this._element.nativeElement, this.hoverableNode, this.hoverableInGraph);
  }
}
