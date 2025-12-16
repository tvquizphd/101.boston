import StyleVariables from '@lib/variables.css' with { type: "css" };
import StyleMeetingList from '@lib/meeting-list.css' with { type: "css" };
import { get_meetings } from '@lib/api.js';

class MeetingList extends HTMLElement {

  static eventHandlerKeys = [ ];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [
      StyleVariables, StyleMeetingList
    ];
  }

  async connectedCallback() {
    await this.render();
  }

  async update_meetings() {
    const item_key = this.getAttribute("item_key");
    const has_item = !!item_key;
    if (has_item) {
      const meetings = await get_meetings(item_key)
      this.setAttribute("meetings", JSON.stringify(meetings));
    }
  }

  async render() {
    this.shadowRoot.innerHTML = "";
    // TODO
    if (!this.getAttribute("meetings")) {
      await this.update_meetings();
    }
    const meetings = JSON.parse(this.getAttribute("meetings") || "[]");
    const can_show_meetings = (
      !!this.getAttribute("session") &&
      this.hasAttribute("show_meetings")
    );
    meetings.forEach(mtg => {
      const el = document.createElement("div"); 
      const template = document.getElementById("meeting-list-item");
      el.appendChild(template.content.cloneNode(true));
      this.shadowRoot.appendChild(el);
      const giver_el = this.shadowRoot.getElementById("giver");
      const taker_el = this.shadowRoot.getElementById("taker");
      const date_el = this.shadowRoot.getElementById("pickup_date");
      const time_el = this.shadowRoot.getElementById("pickup_time");
      const approved_el = this.shadowRoot.getElementById("approved");
      const fulfilled_el = this.shadowRoot.getElementById("fulfilled");
      if (mtg.approved) {
        approved_el.setAttribute("approved", "");
        approved_el.innerText = "Approved";
      }
      date_el.innerText = (
        new Date(mtg.pickup).toLocaleDateString()
      );
      time_el.innerText = (
        new Date(mtg.pickup).toLocaleTimeString()
      );
      if (can_show_meetings) {
        el.setAttribute("shown","");
      }
      giver_el.innerText = mtg.giver;
      taker_el.innerText = mtg.taker;
      if (!mtg.approved) {
        approved_el.addEventListener("click", () => {
          this.sendCustomEvent("meetings/approved-click", {
            meeting_key: mtg.meeting_key,
            meetings: meetings
          })
        });
      }
      fulfilled_el.addEventListener("click", () => {
        this.sendCustomEvent("meetings/fulfilled-click", {
          meeting_key: mtg.meeting_key,
          meetings: meetings
        })
      });
    })
  }

}

export { MeetingList };
