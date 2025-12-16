import { ItemMap } from '@lib/item-map.js';
import { ItemForm } from '@lib/item-form.js';
import { SignupForm } from '@lib/signup-form.js';
import { SigninForm } from '@lib/signin-form.js';
import { ItemList } from '@lib/item-list.js';
import { MeetingList } from '@lib/meeting-list.js';
import { PageRoot } from '@lib/page-root.js';
import { ToolbarRow } from '@lib/toolbar-row.js';

const index = (user) => {
  // Page Root
  customElements.define(
    "page-root", eventReceiver(
      PageRoot, PageRoot.eventHandlerKeys
    )
  );
  // Toolbar
  customElements.define(
    "toolbar-row", eventSender(
      inherit(ToolbarRow, ["show_form", "session"])
    )
  );
  // Item Map
  customElements.define(
    "item-map", eventSender(
      inherit(ItemMap, ["item_key"])
    )
  );
  // Item Form
  customElements.define(
    "item-form", eventSender(
      inherit(ItemForm, ["show_form", "item_key", "stops", "session"])
    )
  );
  // Sign in Form
  customElements.define(
    "signin-form", eventSender(
      inherit(SigninForm, ["show_signin", "session"])
    )
  );
  // Sign up Form
  customElements.define(
    "signup-form", eventSender(
      inherit(SignupForm, ["show_signup", "session"])
    )
  );
  // List of Items
  customElements.define(
    "item-list", eventSender(
      inherit(ItemList, ["item_key", "stops"])
    )
  )
  // List of Meetings
  customElements.define(
    "meeting-list", eventSender(
      inherit(MeetingList, ["show_meetings", "item_key", "session"])
    )
  )

};


const eventSender = (element) => {
  return class extends element {
    sendCustomEvent(key, detail) {
      this.shadowRoot.dispatchEvent(
        new CustomEvent(
          key, {
            detail, bubbles: true, composed: true
          }
        )
      );
    }
  }
}

const eventReceiver = (element, keys=[]) => {
  return class extends element {
    async connectedCallback() {
      await super.connectedCallback();
      keys.forEach(
        key => this.addEventListener(
          key, this.toEventHandler(key)
        )
      )
    }
  }
}


const inherit = (element, attrs=["self"]) => {
  return class extends element {
    render() {
      const host = this.getRootNode().host;
      attrs.forEach(attr => {
        if (!host.hasAttribute(attr)) {
          return this.removeAttribute(attr);
        };
        this.setAttribute(attr, host.getAttribute(attr));
      });
      super.render();
    }
  }
}


export { index }
