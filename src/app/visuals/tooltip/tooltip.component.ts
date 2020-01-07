import {Component, ElementRef, Input, OnInit} from '@angular/core';
import {Node} from '../../d3/models';

@Component({
  selector: 'tooltip',
  templateUrl: './tooltip.component.html',
  styleUrls: ['./tooltip.component.css']
})
export class TooltipComponent implements OnInit {
  @Input('node') node: Node;
  N_VISIBLE_LIST_ELEMENTS = 4;

  constructor(private elementRef: ElementRef) {}
  ngOnInit() {
    this.node.getTooltipHTML = () => this.getInnerHtml();
  }
  getInnerHtml() {
    return this.elementRef.nativeElement.innerHTML;
  }
  get hasAlliances() {
    return this.node.character.alliances && this.node.character.alliances.length > 0;
  }
  get hasPowers() {
    return this.node.character.powers && this.node.character.powers.length > 0;
  }
  get charAlliances() {
    return this.spliceList(this.node.character.alliances);
  }
  get charPowers() {
    return this.spliceList(this.node.character.powers);
  }
  spliceList(arr: string[]) {
    if (!arr) {
      return [];
    }
    const suffix = arr.length > this.N_VISIBLE_LIST_ELEMENTS ? ['...'] : [];
    return arr.slice(0, this.N_VISIBLE_LIST_ELEMENTS).concat(suffix);
  }

}
