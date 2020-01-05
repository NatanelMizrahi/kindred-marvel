export class Filter {
  limit?: number;
  events?: string;
  offset?: string;

  constructor(data= {}) {
    Object.assign(this, data);
  }
}
