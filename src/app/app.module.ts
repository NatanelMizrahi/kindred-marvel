import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { GraphComponent } from './visuals/graph/graph.component';
import { NodeVisualComponent } from './visuals/shared/node-visual/node-visual.component';
import { LinkVisualComponent } from './visuals/shared/link-visual/link-visual.component';
import { D3Service, DraggableDirective, ZoomableDirective } from './d3';
import { D3TooltipModule } from 'ngx-d3-tooltip';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { D3TooltipComponent } from './d3/models/d3-tooltip/d3-tooltip.component';

@NgModule({
  declarations: [
    AppComponent,
    GraphComponent,
    NodeVisualComponent,
    LinkVisualComponent,
    DraggableDirective,
    ZoomableDirective,
    D3TooltipComponent
  ],
  imports: [
    BrowserModule,
    D3TooltipModule,
    HttpClientModule,
    FormsModule],
  providers: [D3Service],
  bootstrap: [AppComponent],
  entryComponents: [D3TooltipComponent]
})
export class AppModule { }
