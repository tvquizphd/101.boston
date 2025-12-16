import StyleVariables from '@lib/variables.css' with { type: "css" };
import StyleSignupForm from "@lib/signup-form.css" with { type: "css" };
import { index_list } from '@lib/utils.js';
//import { signup } from "api";

const signup = () => {
  return {} // TODO
}

class SignupForm extends HTMLElement {

  static eventHandlerKeys = [ ];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [
      StyleVariables, StyleSignupForm
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
    const action = "Sign up";
    submit_el.setAttribute("value",action);
    const form = this.shadowRoot.querySelector("form");
    const can_show_signup_form = (
      this.hasAttribute("show_signup")
    )
    if (can_show_signup_form) {
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
      const result = await signup(data);
      if (result.error) {
        console.log(result);
      }
      this.sendCustomEvent("users/signup-submit", {
        session: result.session || "TODO"
      });
      return false;
    });
  }
}

export { SignupForm };
