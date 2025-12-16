import SvgDataUri from "svg-data-uri";

const to_line_degrees = (angle, step, offset) => {
  const degrees = (
    degrees => degrees > 180 ? degrees - 180 : degrees
  )(
     (360 + offset + 180*angle/Math.PI)%360
  )
  return step*Math.floor(degrees/step);
}
const to_mean_angle = (angles) => {
  const [dy, dx] = angles.reduce(
    ([dy, dx], radians) => ([
      dy + Math.sin(radians), dx + Math.cos(radians)
    ]),
    [0, 0]
  )
  const n = angles.length;
  return Math.atan2(dy/n,dx/n);
}

const to_xy_angle = (stop0, stop1) => {
  const {x: x0, y: y0} = stop0;
  const {x: x1, y: y1} = stop1;
  const dx = x1-x0;
  const dy = y0-y1;
  if (dx === 0 && dy === 0) {
    return 0;
  }
  return Math.atan2(dy,dx);
}

const to_icon_line = (color, degrees, thickness, length, opacity) => {
  const style = [
    "fill:none",
    `stroke-width:${thickness}`,
    `stroke:#${color}`,
    `stroke-opacity:${opacity}`,
  ].join(";");

  const radians = (Math.PI * degrees) / 180;
  const halfLength = length / 2;
  const _x0 = Math.cos(radians - Math.PI) * halfLength;
  const _y0 = -Math.sin(radians - Math.PI) * halfLength;
  const _x1 = Math.cos(radians) * halfLength;
  const _y1 = -Math.sin(radians) * halfLength;

  const [x0, y0, x1, y1] = [_x0, _y0, _x1, _y1].map(v => {
    return v.toFixed(3);
  });

  return `<path d="M${x0} ${y0}L${x1} ${y1}" style="${style}"/>`;
}

const to_icon = (parts, len, wid) => {
  const gray = "558";
  const lines = parts.flatMap(([color, degrees]) => [
    to_icon_line(gray, degrees, wid+1, len+3, 1),
    to_icon_line(color, degrees, wid, len, 0.9),
  ]);

  const even_lines =  lines.filter((_,i) => i%2 == 0);
  const odd_lines =  lines.filter((_,i) => i%2 == 1);
  const core = even_lines.concat(odd_lines).map(
    (line) => `<g transform="translate(5 5)">${line}</g>`
  ).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg id="svg5" width="25" height="25" version="1.1" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
${core}
</svg>`
}

class Color {

  constructor(r,g,b,a=255) {
    this.rgba = [r,g,b,a];
    this.rgb = [r,g,b];
  }

  get hex() {
    const [r, g, b] = this.rgb
    const hex_int = (
      1 << 24 | r << 16 | g << 8 | b
    );
    return hex_int.toString(16).slice(1).toUpperCase();
  }
}

const to_icon_image = (parts, len=7, wid=5) => (
  "data:image/svg+xml;base64," + btoa(to_icon(parts, len, wid))
);

const measure_stops = (locate_stop, stop_map) => {
  return new Map(stop_map.entries().map(
    ([id, info]) => {
      const colors = info.colors.sort().slice(0,2);
      const line_map = new Map(colors.map((color) => {
        const sep = String.fromCharCode(31);
        const stops = Object.keys(info.routes).filter(
          key => info.routes[key].color === color
        ).map(key => (
          info.routes[key].link.join(sep)
        ));
        const links = [...new Set(stops)].map(stop => (
          stop.split(sep)
        ));
        const links_nodes = links.map(link => (
          link.map(
            node => locate_stop(stop_map.get(node))
          ).sort((a, b) => to_xy_angle(a, b) - to_xy_angle(b, a))
        ));
        const angles = links_nodes.map(link_nodes => {
          return to_xy_angle(...link_nodes)
        });
        const angle = to_mean_angle(angles);
        const degrees = to_line_degrees(
          angle, 20, 90
        );
        return [color, degrees];
      }));
      const measurements = line_map.entries().map(
        ([ color, degrees ]) => ({ color, degrees })
      )
      return [ id, [...measurements] ];
    })
  );
}

const filter_query = (key, items) => {
  const quote = items.some(isNaN);
  const find = joined => `${key} in (${joined})`;
  if (!quote) {
    return find(items.map(t=>`${t}`).join(','))
  }
  return find(items.map(t=>`'${t}'`).join(','))
}; 

const add_layer_to_map = (map) => (
  layer_map, layer
) => {
  const zIndex = layer.options.zIndex
  const pane = `pane-${zIndex}`;
  map.createPane(pane);
  if (layer === null) {
    return layer_map;
  }
  layer.addTo(map)
  layer.remove()
  layer.addTo(map)
  return new Map([
    ...layer_map.entries(),
    [zIndex, layer]
  ]);
}

const to_map_layer = (
  zIndex, server, endpoint, data=[0]
) => {
  const pane = `pane-${zIndex}`;
  const dynamic = data.some(isNaN);
  const root = `${server}/rest/services`
  const layer = L.esri.dynamicMapLayer({
    url: `${root}/${endpoint}/MapServer`,
    format: "png32", attribution: "",
    f: "image", pane, zIndex,
    ...{
      [ !dynamic ? 'layers' : 'dynamicLayers' ]: (
        !dynamic ? data : JSON.stringify(data)
      )
    },
  });
  return layer;
}

const to_feature_layer = (
  zIndex, server, endpoint, opts={}
) => {
  const pane = `pane-${zIndex}`;
  const {
    data, renderer, fields, where, style, pointToLayer
  } = opts;
  const root = `${server}/rest/services`
  const dynamic = data.some(isNaN);
  if (dynamic || data.length !== 1) {
    return null;
  }
  const layer = L.esri.featureLayer({
    url: `${root}/${endpoint}/FeatureServer/${data[0]}`,
    attribution: "", pane, zIndex, renderer,
    fields, where, style, pointToLayer
  });
  return layer;
}

const index_list = (key_name, list, detail) => {
  return new Map(
    list.map(x => [x[key_name], x])
  ).get( detail[key_name] );
}

export {
  Color, to_icon_image, measure_stops,
  to_mean_angle, to_xy_angle, to_line_degrees,
  add_layer_to_map, filter_query,
  to_feature_layer, to_map_layer,
  index_list
}

