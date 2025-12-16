class ItemMapEvents extends EventTarget {
  static redraw = "redraw";
  #map
  constructor() {
    super();
    this.#map = new Map();
  }
  get remaining() {
    return this.#map.values().reduce(
      (total, loading) => total+loading, 0
    )
  }
  get reset() {
    return () => {
      [...this.#map.keys()].forEach(
        key => this.#map.set(key, true)
      );
    }
  }
  loaded(key) {
    const { redraw } = this.constructor;
    const detail = { };
    return () => {
      this.update(key, false);
      if (this.remaining === 0) {
        this.reset();
        this.dispatchEvent(
          new CustomEvent(redraw, { detail })
        );
      }
    }
  }
  add(key) {
    this.update(key, true);
  }
  update(key, value) {
    this.#map.set(key, value);
  }
  addRedrawLayer(layer, callback) {
    this.addEventListener(
      ItemMapEvents.redraw, callback 
    );
    callback();
  }
}

export {
  ItemMapEvents
}
