import { Node } from './index';

// Implementing SimulationLinkDatum interface into our custom Link class
export class Link implements d3.SimulationLinkDatum<Node> {
  // Optional - defining optional implementation properties - required for relevant typing assistance
  index?: number;

  // Must - defining enforced implementation properties
  source: Node | string | number;
  target: Node | string | number;
  context?: any;

  constructor(source, target, context = null) {
    this.source = source;
    this.target = target;
    this.context = context;
  }
}
