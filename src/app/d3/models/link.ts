import { Node } from './index';
import APP_CONFIG from '../../app.config';
import {Character} from '../../api/character';

// Implementing SimulationLinkDatum interface into our custom Link class
export class Link implements d3.SimulationLinkDatum<Node> {
  // Optional - defining optional implementation properties - required for relevant typing assistance
  index?: number;

  // Must - defining enforced implementation properties
  source: Node;
  target: Node;

  constructor(source, target, context = null) {
    this.source = source;
    this.target = target;
  }

  get strength() {
    return 100 * (this.source.character.linkStrength(this.target.character) / Character.N);
  }
  get opacity() {
    return Math.sqrt(this.strength) / 30;
  }
  get isDragged() {
    return (this.source.isDragged || this.target.isDragged);
  }
  get color() {
    const alpha = this.isDragged ? Math.max(0.1, 2 * this.opacity) : this.opacity;
    return this.isDragged ? `rgba(256,80,50,${alpha})` : `rgba(200,200,50,${alpha})`;

  }
  get isVisible() {
    return this.strength > APP_CONFIG.VIEW_THRESHOLD || this.isDragged;
  }
}
