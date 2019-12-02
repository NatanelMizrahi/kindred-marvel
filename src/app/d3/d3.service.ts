import {Injectable} from '@angular/core';
import {ForceDirectedGraph, Link, Node} from './models';
import * as d3 from 'd3';
import d3Tip from 'd3-tip';

@Injectable({
  providedIn: 'root'
})
export class D3Service {
  /** This service will provide methods to enable user interaction with elements
   * while maintaining the d3 simulations physics
   */
  pinnedNode: Node = Node.dummy;
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
    // const tip = d3Tip()
    //   .attr("class", "d3-tip")
    //   .html(d => d.toFixed(2))
    //   .direction('nw')
    //   .offset([0, 3])
    // ;
    //
    // // .html(d => `<strong>Frequency:</strong> <span style="color:red"> ${d}</span>`);
    // svg.call(tip);

  }

  /** A method to bind a draggable behaviour to an svg element */
  applyDraggableBehaviour(element, node: Node, graph: ForceDirectedGraph) {
    const d3element = d3.select(element);

    const pinNode = (nodeToPin) => this.pinnedNode = nodeToPin;
    const releaseNode = () => Object.assign(this.pinnedNode, { fx : null, fy : null});

    function started() {
      releaseNode();
      /** Preventing propagation of dragstart to parent elements */
      d3.event.sourceEvent.stopPropagation();

      if (!d3.event.active) {
        graph.simulation.alphaTarget(0.3).restart();
      }

      d3.event.on('drag', dragged).on('end', ended);

      function dragged() {
        node.fx = d3.event.x;
        node.fy = d3.event.y;
        node.isDragged = true;
      }

      function ended() {
        if (!d3.event.active) {
          graph.simulation.alphaTarget(0);
        }
        pinNode(node);
        node.isDragged = false;
      }
    }

    d3element.call(d3.drag()
      .on('start', started));
  /////
    d3element.on('contextmenu', (d, i) => {
      d3.event.preventDefault();
      console.log('right click!');
    });
    const tip = d3Tip()
      .attr("class", "d3-tip")
      .html(d => d.toFixed(2))
      .direction('nw')
      .offset([0, 3])
    ;

      // .html(d => `<strong>Frequency:</strong> <span style="color:red"> ${d}</span>`);
    d3element.call(tip);
    d3element
      .on("mouseover", d => tip.show(d))
      .on("mouseout", d => tip.hide(d));

    //////////
    var vis = d3.select(document.body)
      .append('svg')
      .attr('width', w)
      .attr('height', h)
      .append('g')
      .attr('transform', 'translate(20, 20)')
      .call(tip)
  }

  getForceDirectedGraph(nodes: Node[], links: Link[], options: { width, height} ) {
    return new ForceDirectedGraph(nodes, links, options);
  }
}
