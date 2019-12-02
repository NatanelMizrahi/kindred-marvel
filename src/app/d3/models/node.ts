import * as d3 from 'd3';
import APP_CONFIG from '../../app.config';
import {Character} from '../../api/character';
import {Link} from './link';

// Implementing SimulationNodeDatum interface into our custom Node class
export class Node implements d3.SimulationNodeDatum {
  static dummy: Node = new Node(new Character({id: 'dummy', name: 'dummy'}));

  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;

  id: string;
  image: string;
  isDragged: boolean;
  character: Character;
  links: Link[];
  constructor(character: Character) {
    this.id = character.name;
    this.character = character;
    this.image = this.randImage();
    this.isDragged = false;
    this.links = [];
  }

  get highlight() {
    return this.links.some(link => link.isDragged);
  }

  get linkCount() {
    return this.character.linkCount;
  }

  get normal() {
    // console.log(Character.N);
    return this.linkCount / Character.N;
  }

  get r() {
    return 50 * this.normal + 10;
  }

  get fontSize() {
    return this.r / 3;
  }

  get color() {
    const index = Math.floor(APP_CONFIG.SPECTRUM.length * this.normal);
    return APP_CONFIG.SPECTRUM[index];
  }
  randImage() {
    const rand = Math.floor(Math.random() * (APP_CONFIG.N_IMAGES));
    return `assets/sprites/${rand}.svg`;
  }
}
