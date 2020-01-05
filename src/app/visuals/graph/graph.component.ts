import { Component, Input, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, AfterViewInit, HostListener} from '@angular/core';
import { D3Service } from '../../d3/d3.service';
import { ForceDirectedGraph} from '../../d3/models/force-directed-graph';
import { Node, Link } from '../../d3/models';
import {RenderService} from '../../shared/render.service';
import {flatten} from '@angular/compiler';
import APP_CONFIG from '../../app.config';


@Component({
  selector: 'graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export class GraphComponent implements OnInit, AfterViewInit {
  private _options: { width, height } = { width: 800, height: 600 };
  @Input('nodes') nodes: Node[];
  @Input('links') links: Link[];
  activeNodes: Node[];
  activeLinks: Link[];
  graph: ForceDirectedGraph;
  nodeMap: Map<string, Node>;

  @HostListener('window:resize', ['$event']) onResize(event) {
    this.graph.initSimulation(this.options);
  }

  constructor(private ref: ChangeDetectorRef,
              private d3Service: D3Service,
              private renderService: RenderService) {

    this.renderService.resetGraph.subscribe(resetMessage => {
      this.graph.simulation.stop();
      this.ngOnInit();
    });

    this.renderService.fixCoords.subscribe(forcedCoords => {
      const node = this.nodeMap.get(forcedCoords.nodeId);
      node.fx = forcedCoords.x;
      node.fy = forcedCoords.y;
    });

  }
  ngOnInit() {
    console.log('Starting simulation');
    this.updateActive();
    this.graph = this.d3Service.getForceDirectedGraph(this.activeNodes, this.activeLinks, this.options);
    /** Receiving an initialized simulated graph from our custom d3 service */
    this.nodeMap = new Map(this.nodes.map(node => [node.id, node]));
    this.graph.ticker.subscribe(d => {
      this.ref.markForCheck();
    });
  }

  ngAfterViewInit() {
    this.graph.initSimulation(this.options);
  }

  getActiveNodes() {
    this.activeNodes = this.nodes
      .sort((a, b) => b.character.linkCount - a.character.linkCount)
      .slice(0, APP_CONFIG.MAX_VISIBLE_CHARS);
  }
  getActiveLinks() {
    const activeNodesSet = new Set(this.activeNodes);
    this.activeLinks = flatten(this.activeNodes.map(node => node.links))
      .filter((link: Link) => activeNodesSet.has(link.source) && activeNodesSet.has(link.target));
  }
  updateActive() {
    this.getActiveNodes();
    this.getActiveLinks();
  }
  get options() {
    return this._options = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
}
