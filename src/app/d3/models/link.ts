import APP_CONFIG from '../../app.config';
import { Node } from './index';

export type LinkType = 'EVENT' | 'ALLIANCE';

export class Link implements d3.SimulationLinkDatum<Node> {
  static STRENGTH_FACTOR = ((APP_CONFIG.LINK_WIDTH_FACTOR) / (APP_CONFIG.MAX_VISIBLE_CHARS)); // * Math.log10(APP_CONFIG.EVENT_LIMIT)
  index?: number;

  source: Node;
  target: Node;
  type: LinkType;
  constructor(source, target, type: LinkType = 'EVENT') {
    this.type = type;
    this.source = source;
    this.target = target;
    this.source.links.push(this);
    this.target.links.push(this);
  }

  get strength() {
    return  Link.STRENGTH_FACTOR * this.source.character.linkStrength(this.target.character) ;
  }
  get opacity() {
    return APP_CONFIG.BASE_OPACITY * Math.log2(this.strength) / 100;
  }
  get isDragged() {
    return (this.source.isDragged || this.target.isDragged);
  }
  get color() {
    return this.isDragged ?
      `rgba(200,0,50,${this.opacity})` :
      this.type === 'EVENT' ?
        `rgba(200,200,50,${this.opacity})` :
        `rgba(0,50,200,${2 * this.opacity})`;
  }
  get isVisible() {
    return this.strength > APP_CONFIG.VIEW_THRESHOLD || this.isDragged;
  }
}

