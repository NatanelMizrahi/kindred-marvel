import {Injectable} from '@angular/core';
import {ForceDirectedGraph, Link, Node} from './models';
import * as d3 from 'd3';
import d3Tip from 'd3-tip';
import {Character} from '../api/character';

@Injectable({
  providedIn: 'root'
})
export class D3Service {
  /** This service will provide methods to enable user interaction with elements
   * while maintaining the d3 simulations physics
   */
  pinnedNode: Node = Node.dummy;
  chosenCharacters: Character[] = [];
  constructor() {}

  applyHoverableBehaviour(element, node: Node, graph: ForceDirectedGraph) {

    const pinNode = () => {
      this.pinnedNode = node;
      this.pinnedNode.fx = this.pinnedNode.x;
      this.pinnedNode.fy = this.pinnedNode.y;
    };
    const releaseNode = () => {
      this.pinnedNode.fx = null;
      this.pinnedNode.fy = null;
    };

    const d3element = d3.select(element);
    const tip = d3Tip().html(node.getTooltipHTML);

    const onRightClick = (d, i) => {
      d3.event.preventDefault();
      this.chooseCharacter(node.character);
    };

    function onHover(d) {
        pinNode();
        tip.show(d, this);
    }

    function onMouseOut(d) {
      releaseNode();
      tip.hide(d, this);
    }
    d3element.call(tip);
    d3element
      .on('contextmenu', onRightClick)
      .on('mouseover', onHover)
      .on('mouseout', onMouseOut);
  }
  chooseCharacter(character) {
      if (this.chosenCharacters.indexOf(character) === -1){
        this.chosenCharacters = [character, ...this.chosenCharacters].slice(0, 2);
      }
  }
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

    const pinNode = nodeToPin => this.pinnedNode = nodeToPin;
    const releaseNode = () => {
      this.pinnedNode.fx = null;
      this.pinnedNode.fy = null;
    };

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
  }

  getForceDirectedGraph(nodes: Node[], links: Link[], options: { width, height} ) {
    return new ForceDirectedGraph(nodes, links, options);
  }
}
