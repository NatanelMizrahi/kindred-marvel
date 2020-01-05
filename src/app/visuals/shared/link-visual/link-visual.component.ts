import { Component, Input } from '@angular/core';
import { Link } from '../../../d3/models/link';
import APP_CONFIG from '../../../app.config';
@Component({
  selector: '[linkVisual]',
  templateUrl: './link-visual.component.html',
  styleUrls: ['./link-visual.component.css']
})
export class LinkVisualComponent  {
  @Input('linkVisual') link: Link;
  visible = APP_CONFIG.VIEW_LINKS;
}
