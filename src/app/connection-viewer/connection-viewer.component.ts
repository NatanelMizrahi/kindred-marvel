import { Component, OnInit } from '@angular/core';
import {D3Service} from '../d3';

@Component({
  selector: 'app-connection-viewer',
  templateUrl: './connection-viewer.component.html',
  styleUrls: ['./connection-viewer.component.css']
})
export class ConnectionViewerComponent implements OnInit {
  constructor(private d3Service: D3Service) { }

  ngOnInit() {
  }

}
