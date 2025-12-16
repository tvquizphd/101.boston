import { measure_stops } from "@lib/utils.js";
import { get_map_fields, get_mbta_stops } from "@lib/api.js";

const to_map_config = async (options) => {
  const {
    bus_routes, stop_map, locate_stop
  } = options
  const measurements = measure_stops(locate_stop, stop_map);
  const { TOWN_ID, OWNER_TYPE } = await get_map_fields(
    'ma', "AGOL/OpenSpaceLevProt", 0, [
      "TOWN_ID", "OWNER_TYPE"
    ]
  );
  const water_names = [
    "Fresh Pond", "Charles River", "Little Fresh Pond",
    "Fellsmere Pond", "Middle Reservoir", 
    "South Reservoir", "Bellevue Pond", "Spot Pond",
    "Quarter Mile Pond", "Boojum Rock Pond", "Wrights Pond"
  ];
  const bridge_types = [
    'Highway-pedestrian', 'Pedestrian-bicycle'
  ];
  const owner_types = [
    "Federal", "State", "County", "Municipal",
    "Public Non-Profit", "State-State Dispute",
    "State-Non-Profit Dispute",
    "State-Municipal Dispute"
  ].map(name => OWNER_TYPE[name]);
  // https://www.mattlag.com/hslab/
  const towns = {
    CAMBRIDGE: {
      id: TOWN_ID["City of Cambridge"]
    },
    SOMERVILLE: {
      id: TOWN_ID["City of Somerville"]
    },
    MALDEN: {
      id: TOWN_ID["City of Malden"]
    },
    MEDFORD: {
      id: TOWN_ID["City of Medford"]
    }
  }
  const town_ids = Object.values(towns).map(({id}) => id);
  const bus_lines = bus_routes.map(n => `line-${n}`);
  return {
    towns, town_ids, measurements, water_names,
    bridge_types, owner_types, bus_lines
  }
}

const to_region_bounds = (wide) => {
  const nesw = (latitude,longitude) => ({
    north: latitude, east: longitude,
    south: latitude, west: longitude
  })
  const boston_common = nesw(42.33, NaN);
  const the_fells = nesw(42.43, NaN);
  const bunker_hill = nesw(NaN, -71.07);
  const alewife = nesw(NaN, -71.14);
  if (wide) {
    const miles = 3;
    const d_lon = miles/51;
    const d_lat = miles/69;
    return [
      [
        boston_common.south - d_lat,
        alewife.west - d_lon
      ],
      [
        the_fells.north + d_lat,
        bunker_hill.east + d_lon
      ]
    ]
  }
  return [
    [boston_common.south, alewife.west],
    [the_fells.north, bunker_hill.east]
  ];
}

export {
  to_map_config, to_region_bounds
}
