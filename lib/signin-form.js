import StyleVariables from '@lib/variables.css' with { type: "css" };
import StyleSigninForm from "@lib/signin-form.css" with { type: "css" };
import { index_list } from '@lib/utils.js';
//import { signin } from "api";

const signin = () => {
  return {} // TODO
}

class SigninForm extends HTMLElement {

  static eventHandlerKeys = [ ];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [
      StyleVariables, StyleSigninForm
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
    const template = document.getElementById("user-form-view");
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    const username_el = this.shadowRoot.getElementById("username");
    const password_el = this.shadowRoot.getElementById("password");
    const submit_el = this.shadowRoot.getElementById("submit");
    // Handle duplicate ID warning
    [
      username_el, password_el, submit_el
    ].map(x => x.removeAttribute("id"))
    const action = "Sign in";
    submit_el.setAttribute("value",action);
    const form = this.shadowRoot.querySelector("form");
    const can_show_signin_form = (
      this.hasAttribute("show_signin")
    )
    if (can_show_signin_form) {
      form.setAttribute("shown","");
    }
    this.addEventListeners({
      form 
    });
  }

  addEventListeners({ form }) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = new Map(
        new FormData(e.target)
      );
      const data = {
        username: inputs.get("username", ""),
        password: inputs.get("password", ""),
      }
      const result = await signin(data);
      if (result.error) {
        console.log(result);
      }
      this.sendCustomEvent("users/signin-submit", {
        session: result.session || "TODO"
      });
      return false;
    });
  }
}

export { SigninForm };
