import StyleVariables from '@lib/variables.css' with { type: "css" };
import StyleItemForm from "@lib/item-form.css" with { type: "css" };
import { index_list } from '@lib/utils.js';
//import { post_item } from "api";

const post_item = () => {
  return {} // TODO
}

class ItemForm extends HTMLElement {

  static eventHandlerKeys = [ ];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [
      StyleVariables, StyleItemForm
    ];
  }

  async connectedCallback() {
    await this.render();
  }

  now() {
    const now = new Date();
    const tz_minutes = now.getTimezoneOffset();
    now.setTime(now.getTime() - (tz_minutes*60*1000));
    return now.toISOString().split('.').shift().slice(0,-3);
  }

  async render() {
    this.shadowRoot.innerHTML = "";
    const template = document.getElementById("item-form-view");
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    const stop_key_el = this.shadowRoot.getElementById("stop_key");
    const pickup_el = this.shadowRoot.getElementById("pickup");
    const title_el = this.shadowRoot.getElementById("title");
    const stops = JSON.parse(this.getAttribute("stops") || "{}");
    const sorted_stops = Object.entries(stops).toSorted(([_a,a], [_b,b]) => {
      const [a_num, b_num] = [a,b].map(v => !isNaN(parseInt(v[0])));
      const [a_at, b_at] = [a,b].map(
        v => v.includes('@') || v.includes('opp')
      );
      if (a_num == b_num) {
        if (a_at == b_at) {
          return a.localeCompare(b);
        }
        return a_at - b_at;
      }
      return a_num - b_num;
    });
    const submit_el = this.shadowRoot.getElementById("submit");
    const item_key = this.getAttribute("item_key");
    const has_item = !!item_key;
    // Handle duplicate ID warning
    [ submit_el ].map(x => x.removeAttribute("id"))
    const action = has_item ? "Update" : "Create";
    const items = JSON.parse(
      this.parentNode.parentNode.host.getAttribute("items")
    );
    const item = has_item ? (
      index_list("item_key", items, { item_key })
    ) : {
      title: "",
      stop_key: "",
      pickup: this.now()
    }
    submit_el.setAttribute("value",action);
    title_el.setAttribute("value",item.title);
    pickup_el.setAttribute("value", item.pickup);
    pickup_el.setAttribute("min", this.now());
    sorted_stops.forEach(([stop_key, stop_name]) => {
      const option = document.createElement("option");
      option.value = stop_key;
      option.innerText = stop_name.split(" - ").pop();
      if (item.stop_key == stop_key) {
        option.setAttribute("selected", "selected");
      }
      stop_key_el.appendChild(option);
    });
    const form = this.shadowRoot.querySelector("form");
    const can_show_form = (
      !!this.getAttribute("session") &&
      this.hasAttribute("show_form")
    )
    if (can_show_form) {
      form.setAttribute("shown","");
    }
    const session = this.getAttribute("session");
    this.addEventListeners({
      form, session
    });
  }

  addEventListeners({ form, session }) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = new Map(
        new FormData(e.target)
      );
      const data = {
        title: inputs.get("title", ""),
        pickup: inputs.get("pickup", ""),
        stop_key: inputs.get("stop_key", "")
      }
      const item_key = this.getAttribute("item_key");
      const has_item = !!item_key;
      const result = await post_item(data, session);
      if (result.error) {
        console.log(result);
      }
      if (has_item) {
        this.sendCustomEvent("items/update", {
          item: { ...data, item_key }
        });
      }
      else {
        this.sendCustomEvent("items/create", {
          item: data
        });
      }
      return false;
    });
  }
}

export { ItemForm };
