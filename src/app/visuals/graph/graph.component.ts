import { Component, Input, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, AfterViewInit, HostListener} from '@angular/core';
import { D3Service } from '../../d3/d3.service';
import { ForceDirectedGraph} from '../../d3/models/force-directed-graph';
import { Node, Link } from '../../d3/models';
import {RenderService} from '../../shared/render.service';


@Component({
  selector: 'graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css']
})
export class GraphComponent implements OnInit, AfterViewInit {
  @Input('nodes') nodes: Node[];
  @Input('links') links: Link[];
  graph: ForceDirectedGraph;
  nodeMap: Map<string, Node>;
  private _options: { width, height } = { width: 800, height: 600 };

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
    console.log("resetting simulation");
    /** Receiving an initialized simulated graph from our custom d3 service */
    this.nodeMap = new Map(this.nodes.map(node => [node.id, node]));
    this.graph = this.d3Service.getForceDirectedGraph(this.nodes, this.links, this.options);
    this.graph.ticker.subscribe(d => {
      this.ref.markForCheck();
    });
  }

  ngAfterViewInit() {
    this.graph.initSimulation(this.options);
  }

  get options() {
    return this._options = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
}
