# KindredMarvel
A GUI based platform that enables users to explore the connections between Marvel Comics characters.

[Go to KindredMarvel](https://kindred-marvel.herokuapp.com/)

![](demo.gif)

## Tools and references
This web app was developed with MEAN stack and [D3.js](https://github.com/d3/d3)
Data provided by [Marvel. © 2020 MARVEL](https://www.marvel.com/) and Wikipedia APIs.
In the early stages of building the D3 graph, we relied heavily on [this tutorial] (https://medium.com/netscape/visualizing-data-with-angular-and-d3-209dde784aeb)
Fuzzy string matching done with [fuzzyset.js](https://glench.github.io/fuzzyset.js) and regex.
Natanel Mizrahi • Harel Rasivan

## TODO
* Build Graph DS + implement Dijkstra (weight = 1/link_strength + account for bigger nodes)
* search box with fuzzy strmatch and sugggetions 
* double click => add to searchbox
* show connection with link description
* pipeline node creation  via forkJoin() of several observables
