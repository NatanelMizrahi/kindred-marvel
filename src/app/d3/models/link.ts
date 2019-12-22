import APP_CONFIG from '../../app.config';
import { Node } from './index';

// Implementing SimulationLinkDatum interface into our custom Link class
export class Link implements d3.SimulationLinkDatum<Node> {
  static STRENGTH_FACTOR = (APP_CONFIG.LINK_WIDTH_FACTOR / (APP_CONFIG.MAX_VISIBLE_CHARS * Math.sqrt(APP_CONFIG.EVENT_LIMIT)));
  index?: number;

  source: Node;
  target: Node;

  constructor(source, target) {
    this.source = source;
    this.target = target;
    this.source.links.push(this);
    this.target.links.push(this);
  }

  get strength() {
    return  Link.STRENGTH_FACTOR * this.source.character.linkStrength(this.target.character) ;
  }
  get opacity() {
    return Math.sqrt(this.strength) / 100;
  }
  get isDragged() {
    return (this.source.isDragged || this.target.isDragged);
  }
  get color() {
    return `rgba(200,200,50,${this.opacity})`;
  }
  get isVisible() {
    return this.strength > APP_CONFIG.VIEW_THRESHOLD || this.isDragged;
  }
}
