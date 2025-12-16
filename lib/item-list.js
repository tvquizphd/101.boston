import StyleVariables from '@lib/variables.css' with { type: "css" };
import StyleItemList from '@lib/item-list.css' with { type: "css" };

class ItemList extends HTMLElement {

  static eventHandlerKeys = [ ];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [
      StyleVariables, StyleItemList
    ];
  }

  async connectedCallback() {
    await this.render();
  }

  async render() {
    this.shadowRoot.innerHTML = "";
    const items = JSON.parse(
      this.getAttribute("items") || "[]"
    );
    const stops = JSON.parse(
      this.getAttribute("stops") || "{}"
    );
    const item_key = this.getAttribute("item_key");
    const can_show_meetings = (
      !!this.getAttribute("session") &&
      this.hasAttribute("show_meetings")
    )
    if (can_show_meetings) {
      this.shadowRoot.setAttribute("shown","");
    }
    items.forEach(item => {
      const el = document.createElement("button"); 
      const name_el = document.createElement("div"); 
      const blank_el = document.createElement("div"); 
      const stop_el = document.createElement("div"); 
      const stop = stops[item.stop_key] || "...";
      
      name_el.innerText = item.title;
      stop_el.innerText = stop;
      stop_el.style.fontWeight = "bold";
      const chosen = item.item_key == item_key;

      el.className = ["", "chosen"][+chosen];
      [
        name_el, blank_el, stop_el,
      ].forEach(item => {
        el.appendChild(item);
      })
      el.addEventListener("click", () => {
        if (chosen) {
          return this.sendCustomEvent("items/home-click", { })
        }
        this.sendCustomEvent("items/list-click", {
          item_key: item.item_key
        })
      });

      this.shadowRoot.appendChild(el);
    })
  }

}

export { ItemList };
