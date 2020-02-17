import { Component, ViewEncapsulation } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'about-modal',
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-template #content let-modal>
      <div class="modal-header">
        <h4 class="modal-title" id="modal-basic-title">
          ABOUT
        </h4>
        <button
          type="button"
          class="close"
          aria-label="Close"
          (click)="modal.dismiss('Cross click')"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      <div class="modal-body">
        <h5>The Goal</h5>
        <p>This project was created as a part of the <a href="https://www.dh-bgu.org/cs/" target="_blank">Digital Humanities course in Ben-Gurion University</a>.
           The goal was to create a platform that enables users to explore and gain insights about the nature of the connections between Marvel Comics characters.</p>
        <hr>

        <h5>The Data</h5>
        <p>First, we needed to acquire the data.
          Our search began at the <a href="https://www.marvel.com/" target="_blank">Marvel website</a>, where we found an API for extracting fully structured data in JSON format about teams and characters.
          This was good news for us, believing we had all we needed in terms of data. However, we soon found out that the data from Marvel website is very limited and does not contain all the details we were hoping for.
          There was no clear notion of allies, powers or alignment for the characters.
          We started looking for other sources and the richest one we found was Wikipedia.</p>

        <p>The Wikipedia articles on Marvel Characters contained all we needed, and we were glad to find out it provides a rather intuitive API.
          We had to develop a way to recursively extract the articles from Marvel Characters subcategories though, as Wikipedia does not have that feature.</p>

        <p>The first caveat with the data from Wikipedia was that the output for the queries seemed completely unstructured in HTML format, too complicated for parsing and relation-extraction. Luckily, we noticed that most of what we were looking for in each article was encapsulated in a Wikipedia components called Infoboxes.
          Those still needed to be parsed, but the data in them was semi structured. Therefore, the parsing and data-extraction was still a challenge but complexity was greatly reduced.
          We found several modules created for parsing infoboxes in the web but we found them to be insufficient so we wrote one of our own.</p>

        <p>The main hurdle was linking the data acquired from both sources. The Marvel database and the Wikipedia Marvel characters articles weren't compatible and did not have a one-to-one match, or even close to it.
          This can be explained by the nature of the data: having fictional characters as the main theme, each character has at least 2 aliases, usually many more. Some had a partial match, e.g. "Dr. Strange" &ne; "Stephen Vincent Strange". Some were not even unique (turns out Sabertooth is also called Wolverine...).
          Using fuzzy string matching solved some of the discrepancies, but created another problem as different characters sometimes have similar names, e.g. Namora and Amora.
          Eventually we were able to get most of the connections between the Wikipedia articles and Marvel characters by cross-referencing names and aliases and reasoning preferences behind the selection of the character.</p>

        <p>Finally, we had to tackle the problem that both the Marvel website and the Wikipedia API were blocking some of our requests because we sent frequent requests in a short timespan.
           This was done by implementing a delaying mechanism in the requests (not all trigger at once) as well as a cache.
           The cache stores the Wikipedia API data, the Marvel API data, and other collaterals, and refreshes at fixed intervals to remain updated.
           As expected, once we did that we no longer experienced any request errors.
           This also improved the app's response time as querying our own database was much faster that waiting for API requests.</p>

        <hr>

        <h5>Visuals</h5>
        <p>The core of this app was built using the <a href="https://github.com/d3/d3" target="_blank">D3.js library.</a>.
           This was challenging even with the help of <a href="https://medium.com/netscape/visualizing-data-with-angular-and-d3-209dde784aeb">this example</a>, as neither of us is proficient in Angular and both of us were clueless about SVG.
           The After many iterations of trial-and-error we managed to create the graph you are seeing now. </p>

        <p>Performance-wise, the Marvel database has over 1000 characters, displaying them all at once crippled our app as rendering all the SVG links and nodes was computationally heavy.
           To solve this we decided to limit the view and add a search bar to look for a character and its most prominent connections.</p>

        <p>We later added the tooltips to allow quick access to each character's data, as well as a comparison-view option to explore the common alliances and Marvel Comics Universe events they share.</p>
        <hr>

        <h5>Tools and references</h5>
        <ol>
          <li>The website was developed with <a href="https://en.wikipedia.org/wiki/MEAN_(software_bundle)" target="_blank">MEAN stack</a></li>
          <li>Data provided by <a href="http://marvel.com" target="_blank">Marvel. © 2020 MARVEL</a> and Wikipedia</li>
          <li>In the early stages of building the D3 graph, we relied heavily on <a href="https://medium.com/netscape/visualizing-data-with-angular-and-d3-209dde784aeb" target="_blank">this tutorial</a></li>
          <li>Fuzzy string matching done with  <a href="https://glench.github.io/fuzzyset.js/" target="_blank">fuzzyset.js</a></li>
        </ol>
        <hr>

        <p class="text-center"> Natanel Mizrahi &bull; Harel Rasivan </p>
      </div>

      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-danger"
          (click)="modal.close('Save click')">
          Close
        </button>
      </div>
    </ng-template>

    <a href="#" (click)="open(content)">
      About
    </a>`
})

export class AboutModalComponent {
  options = {
    ariaLabelledBy: 'modal-basic-title',
    windowClass: 'dark-modal',
    scrollable: true,
    centered: true,
    size: 'lg'
  };
  constructor(private modalService: NgbModal) {}

  open(content) {
    this.modalService.open(content, this.options);
  }
}
