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

## Factors d'emissió i supòsits

El fitxer `src/data/factors.js` defineix els valors per defecte utilitzats al càlcul:

- **`emissionsGPerPkm`**: grams de CO₂e per passatger-km.
  - **`car.petrol` / `car.diesel` / `car.hybrid` / `car.ev`**: intensitat d'emissions per quilòmetre de vehicle segons el tipus de combustible o tren de potència.
  - **`bus`**: grams CO₂e per passatger-km en autobús o coach.
  - **`rail`**: grams CO₂e per passatger-km en tren.
  - **`flight`**: grams CO₂e per passatger-km en fase de creuer (sense uplift ni LTO).
  - **`bike` / `walk`**: establerts a 0 gCO₂e/pkm (no es modelitzen emissions indirectes).

- **`assumptions`**: paràmetres de metodologia.
  - **`railDistanceMultiplier`**: factor per aproximar la distància real de rail a partir de la distància per carretera (p. ex. 0.95 implica que el trajecte en tren es considera un 5 % més curt).
  - **`flightUplift`**: percentatge addicional sobre la distància en línia recta (great-circle) per reflectir desviacions de ruta i ascens/descens (0.09 = +9 % de distància).
  - **`flightLtoKgPerPassenger`**: kgCO₂e per passatger associats a les fases de taxi, enlairament i aterratge (LTO) per cada vol.
  - **`radiativeForcingMultiplier`**: factor multiplicador aplicat a les emissions del vol per representar l'efecte radiatiu addicional de les emissions a gran altitud.
