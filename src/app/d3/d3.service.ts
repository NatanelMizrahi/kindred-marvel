import {Injectable} from '@angular/core';
import {ForceDirectedGraph, Link, Node} from './models';
import * as d3 from 'd3';

@Injectable({
  providedIn: 'root'
})
export class D3Service {
  /** This service will provide methods to enable user interaction with elements
   * while maintaining the d3 simulations physics
   */
  lastDragged: Node;
  constructor() {}

  /** A method to bind a pan and zoom behaviour to an svg element */
  applyZoomableBehaviour(svgElement, containerElement) {
    const svg = d3.select(svgElement);
    const container = d3.select(containerElement);

    const zoomed = () => {
      const transform = d3.event.transform;
      container.attr('transform', `translate(${transform.x},${transform.y}) scale(${transform.k})`);
    };

    const zoom = d3.zoom().on('zoom', zoomed);
    svg.call(zoom);
  }

  /** A method to bind a draggable behaviour to an svg element */
  applyDraggableBehaviour(element, node: Node, graph: ForceDirectedGraph) {
    const d3element = d3.select(element);

    function started() {
      /** Preventing propagation of dragstart to parent elements */

      d3.event.sourceEvent.stopPropagation();

      if (!d3.event.active) {
        graph.simulation.alphaTarget(0.3).restart();
      }

      d3.event.on('drag', dragged).on('end', ended);

      function dragged() {
        if (that.lastDragged) {
          that.lastDragged.fx = null;
          that.lastDragged.fy = null;
        }
        node.fx = d3.event.x;
        node.fy = d3.event.y;
        node.isDragged = true;
      }

      function ended() {
        if (!d3.event.active) {
          graph.simulation.alphaTarget(0);
        }

        // node.fx = null;
        // node.fy = null;
        node.isDragged = false;
        this.lastDragged = node;
      }
    }

    d3element.call(d3.drag()
      .on('start', started));

    d3element.on('contextmenu', (d, i) => {
      d3.event.preventDefault();
      console.log('right click!');
    });
  }

  getForceDirectedGraph(nodes: Node[], links: Link[], options: { width, height} ) {
    return new ForceDirectedGraph(nodes, links, options);
  }
}
