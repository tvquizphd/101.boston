import { clientRegister } from "@lib/io.js";
//
// TODO
const create_uuid = async () => {
  return Math.random().toString(36).slice(2);
}

//TODO
const get_meetings = async (item_key) => {
  return [{
    pickup: to_date("2025-12-21", 0),
    giver: "TODO",
    taker: "TODO",
    approved: false,
    item_key: item_key,
    meeting_key: await create_uuid()
  }]
}

const to_date = (iso_date, hour, minute=0) => {
  const h = `${hour}`.padStart(2, '0');
  const m = `${minute}`.padStart(2, '0');
  return `${iso_date}T${h}:${m}`;
}

const load_db = async () => {
  const response = await fetch(
    "https://raw.githubusercontent.com/tvquizphd/101.boston/refs/heads/main/database.json"
  );

  if (!response.ok) {
    return []
  }

  const data = await response.json();
  return data.filter((obj) => {
    // probably fine
    try {
      return ("title" in obj) && ("stop_key" in obj);
    }
    catch (e) {
      return false;
    }
  });
}

const get_items = async () => {
  const from_github = await load_db();
  console.log(from_github);
  const constant_items = [
    {
        "title": "Gold bar",
        "stop_key": "2729",
        "pickup": to_date("2025-12-21", 0),
        "item_key": "demo-item"
    },{
        "title": "Silver bar",
        "stop_key": "place-knncl",
        "pickup": to_date("2026-02-17", 0),
        "item_key": "mit-thing-etc"
    },
    ...from_github
  ].sort(
    (a, b) => {
      const startdiff = new Date(a.pickup) - new Date(b.pickup)
      if (startdiff != 0) {
        return startdiff;
      }
      return ( a.duration - b.duration );
    }
  );
  return [
    ...constant_items
  ]
}

const get_map_fields = async (
  url_key, endpoint, layer_id, field_names=[]
) => {
  const server = get_server(url_key);
  const root = `${server}/rest/services`;
  try {
    const response = await fetch(
      `${root}/${endpoint}/MapServer/layers?f=json`
    );
    const { layers } = (await response.json())
    const { fields } = layers[layer_id];
    return field_names.reduce((out, name) => {
      const { domain } = fields.find(
        f => f.name === name
      )
      return {
        ...out, [name]: domain.codedValues.reduce(
          (out, {name, code}) => ({...out, [name]: code }), {}
        )
      }
    },{});
  }
  catch (e) {
    return [];
  }
}

const get_mbta_route_stops = async (key, routes) => {
  const stops_url_fn = (
    n => `https://api-v3.mbta.com/stops/?api_key=${key}&route=${n}`
  );
  try {
    const responses = await Promise.all(routes.map(
      ({ id }) => fetch(stops_url_fn(id))
    ));
    const results = (await Promise.all(responses.map(
      response => response.json()
    ))).map( ({ data }) => data);
    return new Map(
      routes.map(({id, attributes}, index) => {
        const { color } = attributes;
        const stops = results[index];
        return [id, { stops, color }];
      }) 
    )
  }
  catch (e) {
    return new Map();
  }
}

const get_mbta_stops = async (options) => {
  const {
    bus_routes, train_routes, filter_stop
  } = options;
  const key = (
    await (await fetch('/keys/mbta')).text()
  )
  const train_routes_url = (
    `https://api-v3.mbta.com/routes/?api_key=${key}&type=0,1`
  );
  const bus_route_url_fn = n => (
    `https://api-v3.mbta.com/routes/${n}?api_key=${key}`
  );
  const stop_map = await (async () => {
    try {
      const response = await fetch(train_routes_url);
      const train_results = (await response.json()).data;
      const bus_results = await Promise.all(bus_routes.map(
        async (n) => {
          const response = await fetch(bus_route_url_fn(n));
          return (await response.json()).data;
        }
      ));
      const stop_map = (await get_mbta_route_stops(
        key, train_results.filter(
          result => (
            train_routes.includes(result.id)
          )
        ).concat(bus_results)
      ))
      // Apply specific filter to all stops
      return new Map(stop_map.entries().map(
        ([key, value]) => {
          const stops = value.stops.filter(
            stop => filter_stop(stop.attributes)
          );
          return [key, {...value, stops}]
        }
      ));
    }
    catch (e) {
      return new Map();
    }
  })();
  // Find direct connections for each stop
  return stop_map.entries().reduce(
    (links, [route, { stops, color }]) => {
      return stops.reduce(
        (links, stop, i) => {
          const { id, attributes } = stop;
          const { latitude, longitude, name } = attributes;
          const info = (
            links.get(id) || {
              id, latitude, longitude, name,
              colors: [color], routes: {}
            }
          )
          return new Map([
            ...links,
            [
              id,
              {
                ...info,
                routes: {
                  ...info.routes,
                  [route]: {
                    color, link: [
                      stops[i-1]?.id, id, stops[i+1]?.id
                    ].filter(v => v).filter(
                      (_,i,{length}) => !(
                        length === 3 && i === 1
                      )
                    ).sort()
                  }
                },
                colors: [...new Set(
                  [...info.colors, color]
                )]
              }
            ]
          ]);
        },
        links
      ); 
    },
    new Map()
  )
}

const get_server = (url_key) => {
  return ({
    dot: (
      'https://gis.massdot.state.ma.us/arcgis'
    ),
    ma: (
      'https://arcgisserver.digital.mass.gov/arcgisserver'
    ),
    mystic: (
      'https://services9.arcgis.com/klRX9aqFZ8RuXLfs/ArcGIS/'
    ),
  })[url_key];
}

const signup = async (data) => {
  const { username, password } = data;
  const opts = {
    times: 1000,
    pass: password,
    user_id: username,
    delay: 1, output: {},
    ws_url: "wss://2136mdeg35.execute-api.us-east-2.amazonaws.com/TEST/"
  }
  return await clientRegister(opts)
}

export {
  get_items, get_mbta_stops,
  get_map_fields, get_server,
  create_uuid, get_meetings,
  signup
}
