import StyleVariables from '@lib/variables.css' with { type: "css" };
import StylePageRoot from '@lib/page-root.css' with { type: "css" };
import { get_items, create_uuid } from '@lib/api.js';
import { index_list } from '@lib/utils.js';

class PageRoot extends HTMLElement {

  static eventHandlerKeys = [
    "meetings/fulfilled-click",
    "meetings/approved-click",
    "items/home-click",
    "items/list-click",
    "items/map-click",
    "items/edit-click",
    "items/meet-click",
    "users/signin-click",
    "users/signup-click",
    "items/reload",
    "items/create",
    "items/update",
    "stops/reload",
    "users/signin-submit",
    "users/signup-submit"
  ];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [
      StyleVariables, StylePageRoot
    ];
  }

  async connectedCallback() {
    const git_options = {
      branch: this.getAttribute("branch"),
      owner: this.getAttribute("owner"),
      repo: this.getAttribute("repo")
    }
    const items = await get_items(git_options);
    this.setAttribute("items", JSON.stringify(items));
    await this.render();
  }

  async render() {
    this.shadowRoot.innerHTML = "";
    const template = document.getElementById("page-root-view");
    const copy = template.content.cloneNode(true)
    const item_list_el = copy.querySelector(
      "item-list"
    );
    const item_map_el = copy.querySelector(
      "item-map"
    );
    item_list_el.setAttribute("items", this.getAttribute("items"));
    this.shadowRoot.appendChild(copy);
    this.updateToolbarOptions();
  }

  renderChildren(...child_selectors) {
    child_selectors.forEach(sel => {
      this.shadowRoot.querySelector(sel).render();
    })
  }

  updateToolbarOptions() {
    const item_list_el = this.shadowRoot.querySelector(
      "item-list"
    );
    const toolbar_row_el = this.shadowRoot.querySelector(
      "toolbar-row"
    );
    // Whether current selection can be cleared
    const can_home = (new Set([
      item_list_el.getAttribute("items"),
      this.getAttribute("items")
    ])).size > 1;
    // Whether user is logged in
    const logged_in = (
      this.getAttribute("session")
    )
    // Whether able to edit selection
    const can_edit = logged_in && (
      !!this.getAttribute("item_key")
    ) && (
      !this.hasAttribute("show_form")
    );
    // Whether able to meet
    const can_meet = logged_in && (
      !!this.getAttribute("item_key")
    ) && (
      !this.hasAttribute("show_meetings")
    );
    const options = [
      can_home ? "home" : null,
      can_edit ? "edit" : null,
      can_meet ? "meet" : null,
      logged_in ? null : "signin",
      logged_in ? null : "signup",
    ].filter(x => x).join(",");
    toolbar_row_el.setAttribute("options", options);
    this.renderChildren("toolbar-row");
  }

  toEventHandler(key) {
    const mode_list = [
      "form", "meetings", "signup", "signin"
    ];
    const mode_children = [
      "item-form", "meeting-list",
      "signup-form", "signin-form"
    ];
    const set_mode = (mode) => {
      mode_list.map(key => {
        if (this.hasAttribute(`show_${key}`)) {
          this.removeAttribute(`show_${key}`);
        }
        if (mode === key) {
          this.setAttribute(`show_${key}`, "");
        }
      });
      this.renderChildren(...mode_children);
    }
    const update_meeting_key = (detail, mode=null) => {
      this.setAttribute(
        "meeting_key", detail.meeting_key
      );
      set_mode(mode);
      this.updateToolbarOptions();
    }
    const update_item_key = (detail, mode=null) => {
      this.setAttribute(
        "item_key", detail.item_key
      );
      set_mode(mode);
      this.renderChildren("item-list");
      this.updateToolbarOptions();
    }
    const items_reload = async ({ detail }) => {
      const item_list_el = this.shadowRoot.querySelector(
        "item-list"
      );
      this.setAttribute(
        "items", JSON.stringify(detail.items)
      );
      item_list_el.setAttribute(
        "items", this.getAttribute("items")
      );
      update_item_key({ item_key: "" }, "form");
      this.renderChildren("item-map", "meeting-list");
    }
    const meetings_reload = async ({ detail }) => {
      const meeting_list_el = this.shadowRoot.querySelector(
        "meeting-list"
      );
      meeting_list_el.setAttribute(
        "meetings", JSON.stringify(detail.meetings)
      );
      update_meeting_key(detail, "meetings");
    }
    const home_click = async () => {
      const item_list_el = this.shadowRoot.querySelector(
        "item-list"
      );
      item_list_el.setAttribute(
        "items", this.getAttribute("items")
      );
      update_item_key({ item_key: "" }, "form");
      this.renderChildren("meeting-list");
    }
    if (key === "meetings/approved-click") {
      return async ({ detail }) => {
        const { meetings, meeting_key } = detail;
        const meeting = index_list(
          "meeting_key", meetings, detail
        )
        meeting.approved = true;
        await meetings_reload({
          detail: {
            meetings: meetings.map(
              (mtg) => (
                (
                  mtg.meeting_key == meeting.meeting_key
                ) ? (
                  meeting
                ) : (
                  mtg 
                )
              )
            )
          }
        })
      }
    }
    if (key === "meetings/fulfilled-click") {
      return async ({ detail }) => {
        const { meetings, meeting_key } = detail;
        const meeting = index_list(
          "meeting_key", meetings, detail
        )
        await meetings_reload({
          detail: {
            meetings: meetings.filter(
              (mtg) => (
                mtg.item_key != meeting.item_key
              )
            )
          }
        })
        await home_click();
      }
    }
    if (key === "items/home-click") {
      return home_click;
    }
    if (key === "items/list-click") {
      return async ({ detail }) => {
        update_item_key(detail, null)
      }
    }
    if (key === "items/map-click") {
      return async ({ detail }) => {
        const { items } = detail;
        const item_list_el = this.shadowRoot.querySelector(
          "item-list"
        );
        const old_str = item_list_el.getAttribute("items");
        const new_str = JSON.stringify(items)
        if (old_str == new_str) {
          return;
        }
        item_list_el.setAttribute("items", new_str);
        if (items.length) {
          update_item_key(items[0], null);
        }
      }
    }
    if (key === "items/edit-click") {
      return async ({ detail }) => {
        const item_list_el = this.shadowRoot.querySelector(
          "item-list"
        );
        const items = JSON.parse(this.getAttribute("items"));
        item_list_el.setAttribute(
          "items", JSON.stringify(items.filter(
            ({item_key}) => item_key == detail.item_key
          ))
        );
        update_item_key(detail, "form");
        this.renderChildren("meeting-list");
      }
    }
    if (key === "items/meet-click") {
      return async ({ detail }) => {
        const items = JSON.parse(this.getAttribute("items"));
        const item = index_list("item_key", items, detail);
        const stop_key = item.stop_key;
        const item_map_el = this.shadowRoot.querySelector(
          "item-map"
        );
        await item_map_el.panToStop(stop_key);
        const item_list_el = this.shadowRoot.querySelector(
          "item-list"
        );
        item_list_el.setAttribute(
          "items", JSON.stringify(items.filter(
            ({item_key}) => item_key == detail.item_key
          ))
        );
        update_item_key(detail, "meetings");
        this.renderChildren("meeting-list");
      }
    }
    if (key === "items/reload") {
      return items_reload;
    }
    if (key === "items/create") {
      return async ({ detail }) => {
        const items = JSON.parse(this.getAttribute("items"));
        const item = {
          ...detail.item, item_key: await create_uuid()
        }
        return await items_reload({
          detail: {
            items: [ ...items, item ]
          }
        })
      };
    }
    if (key === "items/update") {
      return async ({ detail }) => {
        const items = JSON.parse(this.getAttribute("items"));
        return await items_reload({
          detail: {
            items: items.map(
              (item) => (
                (item.item_key == detail.item.item_key) ? (
                   detail.item
                ) : (
                  item
                )
              )
            )
          }
        })
      };
    }
    if (key === "stops/reload") {
      return async ({ detail }) => {
        this.setAttribute(
          "stops", JSON.stringify(detail.stops)
        );
        this.renderChildren("item-list", "item-form");
      }
    }
    if (key === "users/signin-click") {
      return async () => {
        set_mode("signin");
        this.updateToolbarOptions();
      }
    }
    if (key === "users/signup-click") {
      return async () => {
        set_mode("signup");
        this.renderChildren("item-list", "item-form");
        this.updateToolbarOptions();
      }
    }
    if (key === "users/signin-submit") {
      return async ({ detail }) => {
        set_mode(null);
        this.setAttribute("session", detail.session);
        this.renderChildren("item-list");
        this.updateToolbarOptions();
      }
    }
    if (key === "users/signup-submit") {
      return async ({ detail }) => {
        set_mode(null);
        this.setAttribute("session", detail.session);
        this.renderChildren("item-list");
        this.updateToolbarOptions();
      }
    }
  }
}

export { PageRoot };
