import * as L from "leaflet";
import {
  Color, to_icon_image,
  add_layer_to_map, filter_query,
  to_feature_layer, to_map_layer
} from "@lib/utils.js";
import { get_mbta_stops, get_server } from "@lib/api.js";
import { to_map_config, to_region_bounds } from "@lib/map-config.js";
import { ItemMapEvents } from "@lib/item-map-events.js";
import StyleLeaflet from "@lib/leaflet@1.9.4/leaflet.css" with { type: "css" };
import StyleVariables from '@lib/variables.css' with { type: "css" };
import StyleItemMap from "@lib/item-map.css" with { type: "css" };

const pointToStopIcon = (measurements, mbta_colors, len, wid) => {
  return ({ properties }, pos) => {
    const { stop_id: id } = properties;
    const mbta_icon = {
      iconSize: [25, 25], iconAnchor: [12.5, 12.5]
    };
    if (!measurements.has(id)) {
      return L.marker(pos, {
        icon: L.icon({
          ...mbta_icon, className: "hidden",
          iconUrl: to_icon_image([["CCCCCC",0]], len, wid)
        }),
        opacity: 0
      });
    }
    const line_parts = measurements.get(id).map(
      ({ color, degrees }) => {
        const new_color = mbta_colors[color].hex;
        return [new_color, degrees];
      }
    )
    return L.marker(pos, {
      icon: L.icon({
        ...mbta_icon, className: "",
        iconUrl: to_icon_image(line_parts, len, wid)
      }),
      opacity: 0.9
    });
  }
}

class ItemMap extends HTMLElement {

  constructor() {
    super();
    this.stop_map = new Map();
    this.options = {
      bus_routes: [101],
      train_routes: [
        "Red", "Orange", "Green-B", "Green-C", "Green-D", "Green-E"
      ],
      // Handle weird branch on 101 route
      // and cut all stops outside area 
      filter_stop: stop => ((
        stop.location_type != 0 || stop.longitude > -71.111
      ) && (
        stop.longitude < -71.07085
        && stop.latitude > 42.3623
      ))
    }
    this.circles = [];
    this.max_pane = "popupPane";
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [
      StyleVariables, StyleItemMap, StyleLeaflet
    ];
  }

  get items() {
    return JSON.parse(
      this.parentNode.host.getAttribute("items")
    );
  }

  async connectedCallback() {
    await this.reloadStops();
    await this.render();
  }

  addCircle(latitude, longitude, kind, options={}) {
    const fillColor = ({
      "items/modal": "#2A0033",
      "items/map-click": "#00004D"
    })[kind] || "#000000";
    const color = ({
      "items/modal": "#FFBD59",
      "items/map-click": "#B3EAF5"
    })[kind] || "#FFFFFF";
    const opacity = ({
      "items/map-click": 0.35
    })[kind] || .55;
    const point = new L.LatLng(latitude, longitude);
    const circle = L.circle(
      point, {
        weight: 5,
        radius: 500,
        color, fillColor,
        pane: this.max_pane,
        fillOpacity: opacity,
        ...options
      }
    )
    circle.addTo(this.map);
    this.circles.push({
      circle, kind
    });
    return { point, circle }
  }

  async panToStop(stop_key) {
    if (!this.map) {
      return;
    }
    const stop = this.stop_map.get(stop_key);
    const { latitude, longitude } = stop;
    const point = new L.LatLng(latitude, longitude);
    this.map.panTo(point);
    this.map.once('moveend', () => {
      this.map.setView(
        point, Math.min(
          this.map.getZoom()+2, 14
        )
      );
    });
  }

  removeCircleType(type) {
    this.circles = this.circles.filter(({ circle, kind }) => {
      if (kind == type) {
        circle.remove();
        return false;
      }
      return true;
    });
  }

  async reloadStops() {
    // https://api-v3.mbta.com/docs/swagger/
    this.stop_map = await get_mbta_stops(this.options);
    const stops = this.stop_map.entries().reduce(
      (stops, [key, value]) => {
        return {...stops, [key]: value.name} 
      },
      {}
    );
    this.sendCustomEvent("stops/reload", { stops });
  }

  async render() {
    this.shadowRoot.innerHTML = "";
    const template = document.getElementById("item-map-view");
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    // https://developers.arcgis.com/esri-leaflet/
    this.map = L.map(this.shadowRoot.getElementById("map"), {
      zoomControl: false, attributionControl: false
    });
    ;
    this.map.fitBounds(to_region_bounds(false));
    this.map.setMaxBounds(to_region_bounds(true));
    this.map.setMinZoom(12);
    this.map.setZoom(12);
    const {
      towns, town_ids, measurements, water_names,
      bridge_types, owner_types, bus_lines
    } = await to_map_config({
      ...this.options,
      stop_map: this.stop_map,
      locate_stop: stop => this.map.latLngToContainerPoint(
        [stop.latitude, stop.longitude]
      )
    });
    // green, red, and orange
    const mbta_colors = {
      "00843D": new Color(20, 220, 60),
      "DA291C": new Color(230, 80, 60),
      "ED8B00": new Color(230, 170, 30),
      "FFC72C": new Color(255, 199, 44)
    }
    // TODO: pull from variables.css
    const theme = {
      minimal: 1,
      thickness: 2.5,
      water: new Color(150,180,255),
      light: new Color(255,255,235),
      outdoors: new Color(60,150,60)
    }
    const layers = [
      // Region
      to_feature_layer(1, get_server("ma"), "AGOL/DEP_Regions", {
        data: [2],
        fields: ["OBJECTID", "REGION"],
        where: filter_query("REGION", ["NE"]),
        style: ({ properties }) => {
          return { 
            weight: 0,
            fillOpacity: 1,
            fillColor: "#"+theme.light.hex
          };
        }
      }),
      // Water
      to_feature_layer(2, get_server("ma"), "AGOL/Massachusetts_Water_Features", {
        data: [2],
        fields: ["OBJECTID", "NAME"],
        where: filter_query("NAME", water_names),
        style: ({ properties }) => {
          return { 
            weight: 0,
            fillOpacity: 1,
            fillColor: "#"+theme.water.hex
          };
        }
      }),
      // Paths
      to_map_layer(3, get_server("dot"), "Multimodal/PriorityTrailsNetwork", [{
        source: {
          typei: "mapLayer", mapLayerId: 0
        },
        definitionExpression: ([
        filter_query("Muni_ID", town_ids),
          "Fac_Type = 5"
        ].join(" AND ")),
        drawingInfo: {
          renderer: {
            type: "simple",
            symbol: {
              type: "esriSLS",
              style: "esriSLSSolid",
              color: theme.outdoors.rgba,
              width: theme.thickness*4
            }
          }
        }
      }]),
      // Nature
      to_map_layer(4, get_server("ma"), "AGOL/OpenSpaceLevProt", [{
        source: {
          typei: "mapLayer", mapLayerId: 0
        },
        definitionExpression: ([
          filter_query("TOWN_ID", town_ids),
          filter_query("PUB_ACCESS", ['Y']),
          filter_query("OWNER_TYPE", owner_types)
        ].join(" AND ")),
        drawingInfo: {
          renderer: {
            type: "simple",
            symbol: {
              type: "esriSFS",
              style: "esriSFSSolid",
              color: theme.outdoors.rgba,
              outline: {
                type: "esriSLS",
                style: "esriSLSSolid",
                color: theme.outdoors.rgba,
                width: theme.thickness*1.5
              }
            }
          }
        }
      }]),
      // Bridges
      to_map_layer(5, get_server("dot"), "Roads/BridgesArcs", [{
        source: {
          type: "mapLayer", mapLayerId: 0
        },
        definitionExpression: filter_query(
          "TypeOfService", bridge_types 
        ),
        drawingInfo: {
          renderer: {
            type: "simple",
            symbol: {
              type: "esriSLS",
              style: "esriSLSSolid",
              width: theme.thickness*3,
              color: theme.light.rgba,
            }
          }
        }
      }]),
      // MBTA train lines 
      to_map_layer(6, get_server("dot"), "Multimodal/GTFS_Systemwide", [{
        source: {
          type: "mapLayer", mapLayerId: 1
        },
        drawingInfo: {
          renderer: {
            type: "uniqueValue",
            field1: "route_color",
            uniqueValueInfos: (
              Object.entries(mbta_colors).map(
                ([value, color]) => ({
                  value, symbol: {
                    type: "esriSLS",
                    style: "esriSLSSolid",
                    width: theme.thickness*2,
                    color: color.rgba
                  }
                })
              )
            )
          }
        }
      }]),
      // MBTA train stops
      to_feature_layer(7, get_server("dot"), "Multimodal/GTFS_Systemwide", {
        data: [0],
        fields: ["OBJECTID", "stop_id"],
        where: filter_query(
          "municipality", Object.keys(towns)
        ),
        pointToLayer: pointToStopIcon(
          measurements, mbta_colors, 7, 3
        )
      }),
      // MBTA bus lines 
      to_feature_layer(8, get_server("dot"), "Multimodal/GTFS_Systemwide", {
        data: [5],
        fields: ["OBJECTID", "line_id"],
        where: filter_query(
          "line_id", bus_lines 
        ),
        style: ({ properties }) => {
          return { 
            weight: theme.thickness*2,
            color: "#"+mbta_colors["FFC72C"].hex
          };
        }
      }),
      // MBTA bus stops
      to_feature_layer(9, get_server("dot"), "Multimodal/GTFS_Systemwide", {
        data: [4],
        fields: ["OBJECTID", "stop_id"],
        where: filter_query(
          "municipality", Object.keys(towns)
        ),
        pointToLayer: pointToStopIcon(
          measurements, mbta_colors, 3, 2
        )
      })
    ].reduce(
      add_layer_to_map(this.map),
      new Map()
    );
    const changes = new ItemMapEvents();
    this.map.on('movestart', changes.reset);
    const stop_key = "stop_id";
    const redraw_stops = layer => () => {
      const stop_ids = ((stop_ids) => {
        layer.eachActiveFeature(({feature}) => (
          stop_ids.push(feature.properties[stop_key])
        ))
        return stop_ids
      })([]);
      this.sendCustomEvent("stops/redraw", { stop_ids });
    };
    layers.entries().forEach(([key, layer]) => {
      changes.add(key);
      const { fields } = layer.options;
      if (fields && fields.includes(stop_key)){
        changes.addRedrawLayer(
          layer, redraw_stops(layer)
        );
      }
      layer.on('load', changes.loaded(key));
    });
    this.drawFoundItems();
  }

  async drawFoundItems() {
    this.removeCircleType("items/map-click");
    this.items.forEach(({ stop_key }) => {
      const stop = this.stop_map.get(stop_key);
      if (stop) {
        const { latitude, longitude } = stop
        const { circle } = this.addCircle(
          stop.latitude, stop.longitude, "items/map-click",
          { stop_key }
        );
        circle.on("click", (e) => {
          this.matchItemsAtStop(e);
        });
      }
    });
  }

  matchItemsAtStop(e) {
    const { target } = e;
    const { options } = target;
    const { stop_key } = options;
    this.sendCustomEvent("items/map-click", { 
      items: this.items.filter(
        (ev) => ev.stop_key == stop_key 
      )
    });
  }
}

export { ItemMap };
