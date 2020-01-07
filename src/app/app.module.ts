import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { GraphComponent } from './visuals/graph/graph.component';
import { NodeVisualComponent } from './visuals/shared/node-visual/node-visual.component';
import { LinkVisualComponent } from './visuals/shared/link-visual/link-visual.component';
import { D3Service, DraggableDirective, ZoomableDirective } from './d3';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HoverableDirective } from './d3/directives/hoverable.directive';
import { TooltipComponent } from './visuals/tooltip/tooltip.component';
import { ConnectionViewerComponent } from './connection-viewer/connection-viewer.component';

@NgModule({
  declarations: [
    AppComponent,
    GraphComponent,
    NodeVisualComponent,
    LinkVisualComponent,
    DraggableDirective,
    ZoomableDirective,
    HoverableDirective,
    TooltipComponent,
    ConnectionViewerComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule],
  providers: [D3Service],
  bootstrap: [AppComponent],
})
export class AppModule { }
