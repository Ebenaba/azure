// Kaduna State Neighborhood Zones
export const KADUNA_ZONES = [
  {
    id: 'ungwan_romi',
    name: 'Ungwan Romi',
    nameHa: 'Unguwan Romi',
    lat: 10.5272,
    lng: 7.4396,
    lga: 'Kaduna North',
    serviceable: true,
    surcharge: 0,
  },
  {
    id: 'barnawa',
    name: 'Barnawa',
    nameHa: 'Barnawa',
    lat: 10.4892,
    lng: 7.4281,
    lga: 'Kaduna South',
    serviceable: true,
    surcharge: 0,
  },
  {
    id: 'malali',
    name: 'Malali',
    nameHa: 'Malali',
    lat: 10.5481,
    lng: 7.4289,
    lga: 'Kaduna North',
    serviceable: true,
    surcharge: 0,
  },
  {
    id: 'tudun_wada',
    name: 'Tudun Wada',
    nameHa: "Tudun Wada",
    lat: 10.5198,
    lng: 7.4411,
    lga: 'Kaduna North',
    serviceable: true,
    surcharge: 0,
  },
  {
    id: 'ungwan_sarki',
    name: 'Ungwan Sarki',
    nameHa: 'Unguwan Sarki',
    lat: 10.5224,
    lng: 7.4502,
    lga: 'Kaduna North',
    serviceable: true,
    surcharge: 0,
  },
  {
    id: 'kabala_west',
    name: 'Kabala West',
    nameHa: 'Kabala Yamma',
    lat: 10.5331,
    lng: 7.4199,
    lga: 'Kaduna North',
    serviceable: true,
    surcharge: 0,
  },
  {
    id: 'kabala_costain',
    name: 'Kabala Costain',
    nameHa: 'Kabala Costain',
    lat: 10.5360,
    lng: 7.4320,
    lga: 'Kaduna North',
    serviceable: true,
    surcharge: 0,
  },
  {
    id: 'kawo',
    name: 'Kawo',
    nameHa: 'Kawo',
    lat: 10.5671,
    lng: 7.4405,
    lga: 'Kaduna North',
    serviceable: true,
    surcharge: 500,
  },
  {
    id: 'Television',
    name: 'Television',
    nameHa: 'Talabijin',
    lat: 10.5410,
    lng: 7.4050,
    lga: 'Kaduna North',
    serviceable: true,
    surcharge: 0,
  },
  {
    id: 'nassarawa',
    name: 'Nassarawa GRA',
    nameHa: 'Nassarawa GRA',
    lat: 10.5110,
    lng: 7.4638,
    lga: 'Kaduna South',
    serviceable: true,
    surcharge: 0,
  },
  {
    id: 'ungwan_dosa',
    name: 'Ungwan Dosa',
    nameHa: 'Unguwan Dosa',
    lat: 10.5033,
    lng: 7.4532,
    lga: 'Kaduna South',
    serviceable: true,
    surcharge: 0,
  },
  {
    id: 'gonin_gora',
    name: 'Gonin Gora',
    nameHa: 'Gonin Gora',
    lat: 10.4721,
    lng: 7.3981,
    lga: 'Chikun',
    serviceable: true,
    surcharge: 1000,
  },
  {
    id: 'rigachikun',
    name: 'Rigachikun',
    nameHa: 'Rigachikun',
    lat: 10.6001,
    lng: 7.3721,
    lga: 'Igabi',
    serviceable: false,
    surcharge: 0,
    comingSoon: true,
  },
  {
    id: 'zaria',
    name: 'Zaria',
    nameHa: 'Zazzau',
    lat: 11.0804,
    lng: 7.7196,
    lga: 'Zaria',
    serviceable: false,
    surcharge: 0,
    comingSoon: true,
  },
];

export const getZoneById = (id) => KADUNA_ZONES.find((z) => z.id === id);

export const getServiceableZones = () => KADUNA_ZONES.filter((z) => z.serviceable);

export const getZoneForCoords = (lat, lng) => {
  const THRESHOLD_KM = 3;
  let nearest = null;
  let minDist = Infinity;

  for (const zone of KADUNA_ZONES) {
    const dist = Math.sqrt(
      Math.pow((lat - zone.lat) * 110.574, 2) +
      Math.pow((lng - zone.lng) * 111.32 * Math.cos((lat * Math.PI) / 180), 2)
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = zone;
    }
  }

  return minDist <= THRESHOLD_KM ? nearest : null;
};

export default KADUNA_ZONES;
