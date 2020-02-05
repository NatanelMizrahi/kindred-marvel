import APP_CONFIG from '../app.config';

export const FORCES = {
  center: {
    x: 0.5,
    y: 0.5
  },
  charge: {
    enabled: true,
    strength: -50 * Math.log2(APP_CONFIG.MAX_VISIBLE_CHARS),
    distanceMin: 1,
    distanceMax: 2000
  },
  collide: {
    enabled: true,
    strength: .7,
    iterations: 1,
    radius: 5
  },
  forceX: {
    enabled: false,
    strength: .1,
    x: .5
  },
  forceY: {
    enabled: false,
    strength: .1,
    y: .5
  },
  link: {
    enabled: true,
    distance: 300,
    iterations: 1,
    strength: 0.02
  }
};
