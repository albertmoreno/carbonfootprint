# icmab-travel-co2

Mini webapp SPA per estimar emissions de CO2e de viatges entre dos punts.

## Requisits
- Node.js 18+

## Executar en local
```bash
npm i
npm run dev
```

## Build producció
```bash
npm run build
npm run preview
```

## Notes
- Geocoding amb Nominatim (OpenStreetMap).
- Routing amb OSRM per carretera.
- Càlcul de vol amb great-circle + uplift configurable.
- Factors i supòsits editables des del modal de metodologia.
