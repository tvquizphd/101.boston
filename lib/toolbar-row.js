import StyleVariables from '@lib/variables.css' with { type: "css" };
import StyleToolbarRow from '@lib/toolbar-row.css' with { type: "css" };

class ToolbarRow extends HTMLElement {

  static eventHandlerKeys = [ ];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [
      StyleVariables, StyleToolbarRow
    ];
  }

  async connectedCallback() {
    await this.render();
  }

  async render() {
    this.shadowRoot.innerHTML = "";
    const template = document.getElementById("toolbar-row-view");
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    const options = this.getAttribute("options").split(",");
    [
      "home", "edit", "meet", "signin", "signup"
    ].map(key => {
      if (!options.includes(key)) {
        return;
      }
      const el = this.shadowRoot.getElementById(key);
      el.setAttribute("shown", "");
      if (key == "home") {
        el.addEventListener("click", () => {
          this.sendCustomEvent("items/home-click", { })
        });
      }
      if (key == "edit") {
        el.addEventListener("click", () => {
          const item_key = this.getRootNode().host.getAttribute("item_key");
          this.sendCustomEvent("items/edit-click", { 
            item_key
          })
        });
      }
      if (key == "meet") {
        el.addEventListener("click", () => {
          const item_key = this.getRootNode().host.getAttribute("item_key");
          this.sendCustomEvent("items/meet-click", { 
            item_key
          })
        });
      }
      if (key == "signin") {
        el.addEventListener("click", () => {
          this.sendCustomEvent("users/signin-click", { })
        });
      }
      if (key == "signup") {
        el.addEventListener("click", () => {
          this.sendCustomEvent("users/signup-click", { })
        });
      }
    });
  }

}

export { ToolbarRow };
