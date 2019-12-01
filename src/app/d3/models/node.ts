import * as d3 from 'd3';
import APP_CONFIG from '../../app.config';
import {Character} from '../../api/character';

// Implementing SimulationNodeDatum interface into our custom Node class
export class Node implements d3.SimulationNodeDatum {
  // Optional - defining optional implementation properties - required for relevant typing assistance
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

  constructor(character: Character) {
    this.id = character.name;
    this.character = character;
    this.image = this.randImage();
    this.isDragged = false;
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
    return this.r/3;//(30 * this.normal + 10) + 'px';
  }


  get color() {
    const index = Math.floor(APP_CONFIG.SPECTRUM.length * this.normal);
    return APP_CONFIG.SPECTRUM[index];
  }

  randImage() {
    const rand = Math.round(Math.random() * (APP_CONFIG.N_IMAGES));
    return `assets/sprites/${rand}.svg`;
  }
}
