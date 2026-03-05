import React, { useMemo, useRef, useState } from 'react';
import { calcEmissions, haversineKm } from './lib/calc';
import { DEFAULT_FACTORS, MODE_LABELS } from './data/factors';

const MODES = ['car', 'bus', 'rail', 'flight', 'bike', 'walk'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function App() {
  const [origin, setOrigin] = useState('Barcelona, Spain');
  const [destination, setDestination] = useState('Madrid, Spain');
  const [passengers, setPassengers] = useState(1);
  const [activeModes, setActiveModes] = useState({
    car: true,
    bus: true,
    rail: true,
    flight: true,
    bike: false,
    walk: false
  });
  const [carFuel, setCarFuel] = useState('petrol');
  const [flightRf, setFlightRf] = useState(true);
  const [includeLto, setIncludeLto] = useState(true);
  const [factors, setFactors] = useState(DEFAULT_FACTORS);
  const [factorDraft, setFactorDraft] = useState(JSON.stringify(DEFAULT_FACTORS, null, 2));
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);

  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);

  const geocodeCache = useRef(new Map());
  const routeCache = useRef(new Map());
  const lastNominatimTs = useRef(0);

  const selectedModes = useMemo(
    () => MODES.filter((mode) => activeModes[mode]),
    [activeModes]
  );

  const searchPlaces = async (query) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) return [];

    const elapsed = Date.now() - lastNominatimTs.current;
    if (elapsed < 350) await sleep(350 - elapsed);

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
      trimmed
    )}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    });

    lastNominatimTs.current = Date.now();

    if (!response.ok) return [];

    const data = await response.json();
    return data.map((item) => item.display_name);
  };

  const geocode = async (query) => {
    const key = query.trim().toLowerCase();
    if (!key) throw new Error('Please provide both origin and destination.');
    if (geocodeCache.current.has(key)) return geocodeCache.current.get(key);

    const elapsed = Date.now() - lastNominatimTs.current;
    if (elapsed < 350) await sleep(350 - elapsed);

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json'
      }
    });

    lastNominatimTs.current = Date.now();

    if (!response.ok) {
      throw new Error('Geocoding service unavailable.');
    }

    const data = await response.json();
    if (!data.length) {
      throw new Error(`Place not found: ${query}`);
    }

    const point = {
      lat: Number(data[0].lat),
      lon: Number(data[0].lon),
      label: data[0].display_name
    };

    geocodeCache.current.set(key, point);
    return point;
  };

  const drivingRoute = async (from, to) => {
    const key = `${from.lon},${from.lat}_${to.lon},${to.lat}`;
    if (routeCache.current.has(key)) return routeCache.current.get(key);

    const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Routing service unavailable.');

    const data = await response.json();
    if (!data.routes?.length) throw new Error('No route found between points.');

    const route = {
      km: data.routes[0].distance / 1000,
      durationMin: data.routes[0].duration / 60
    };

    routeCache.current.set(key, route);
    return route;
  };

  const toggleMode = (mode) => {
    setActiveModes((prev) => ({ ...prev, [mode]: !prev[mode] }));
  };

  const handleOriginChange = (value) => {
    setOrigin(value);
    searchPlaces(value)
      .then((list) => setOriginSuggestions(list))
      .catch(() => setOriginSuggestions([]));
  };

  const handleDestinationChange = (value) => {
    setDestination(value);
    searchPlaces(value)
      .then((list) => setDestinationSuggestions(list))
      .catch(() => setDestinationSuggestions([]));
  };

  const handleFactorsSave = () => {
    try {
      const parsed = JSON.parse(factorDraft);
      setFactors(parsed);
      setShowModal(false);
    } catch {
      setError('Invalid factors JSON. Please review methodology values.');
    }
  };

  const calculate = async () => {
    setLoading(true);
    setError('');
    setResults([]);

    try {
      const [from, to] = await Promise.all([geocode(origin), geocode(destination)]);
      const road = await drivingRoute(from, to);
      const directFlightKm = haversineKm(from, to) * (1 + factors.assumptions.flightUplift);

      const computed = selectedModes.map((mode) => {
        let km = road.km;
        let durationMin = road.durationMin;
        let estimated = false;

        if (mode === 'flight') {
          km = directFlightKm;
          durationMin = null;
        }

        if (mode === 'rail') {
          km = road.km * factors.assumptions.railDistanceMultiplier;
          durationMin = null;
          estimated = true;
        }

        if (mode === 'bike' || mode === 'walk') {
          estimated = true;
        }

        const emissions = calcEmissions({
          mode,
          km,
          passengers,
          factors,
          carFuel,
          flightRf,
          includeLto
        });

        return {
          mode,
          ...emissions,
          durationMin,
          estimated
        };
      });

      setResults(computed.sort((a, b) => a.totalKg - b.totalKg));
    } catch (err) {
      setError(err.message || 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  const maxKg = Math.max(...results.map((r) => r.totalKg), 0);

  return (
    <div className="app-shell">
      <header className="header card">
        <div className="logo">
          <img src="icmab_so_blanco.png" alt="ICMAB" />
        </div>
        <div>
          <h1>ICMAB Sustainability Commission</h1>
          <p>Travel CO₂ estimator for better mobility decisions.</p>
        </div>
      </header>

      <section className="card controls">
        <h2>Trip setup</h2>
        <div className="grid">
          <label>
            Origin
            <div className="autocomplete">
              <input
                value={origin}
                onChange={(e) => handleOriginChange(e.target.value)}
                placeholder="City or address"
                autoComplete="off"
              />
              {originSuggestions.length > 0 && (
                <ul className="autocomplete-list">
                  {originSuggestions.map((suggestion) => (
                    <li
                      key={suggestion}
                      className="autocomplete-item"
                      onClick={() => {
                        setOrigin(suggestion);
                        setOriginSuggestions([]);
                      }}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </label>
          <label>
            Destination
            <div className="autocomplete">
              <input
                value={destination}
                onChange={(e) => handleDestinationChange(e.target.value)}
                placeholder="City or address"
                autoComplete="off"
              />
              {destinationSuggestions.length > 0 && (
                <ul className="autocomplete-list">
                  {destinationSuggestions.map((suggestion) => (
                    <li
                      key={suggestion}
                      className="autocomplete-item"
                      onClick={() => {
                        setDestination(suggestion);
                        setDestinationSuggestions([]);
                      }}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </label>
          <label>
            Passengers
            <input
              type="number"
              min="1"
              value={passengers}
              onChange={(e) => setPassengers(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
        </div>

        <div className="mode-grid">
          {MODES.map((mode) => (
            <button
              key={mode}
              className={`toggle ${activeModes[mode] ? 'active' : ''}`}
              onClick={() => toggleMode(mode)}
              type="button"
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        <div className="options-row">
          <label>
            Car fuel
            <select value={carFuel} onChange={(e) => setCarFuel(e.target.value)}>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="ev">EV</option>
            </select>
          </label>

          <label className="inline">
            <input type="checkbox" checked={flightRf} onChange={(e) => setFlightRf(e.target.checked)} />
            Radiative forcing (RF)
          </label>

          <label className="inline">
            <input type="checkbox" checked={includeLto} onChange={(e) => setIncludeLto(e.target.checked)} />
            Include LTO (landing & take-off)
          </label>

          <button type="button" className="secondary" onClick={() => setShowModal(true)}>
            Methodology
          </button>
        </div>

        <p className="options-help">
            <ul>
          <li>Radiative forcing (RF) adds the extra climate impact of aircraft emissions at high altitude.</li>
          <li>LTO (landing &amp; take-off) includes emissions during taxiing, take-off and landing around airports.</li>
          <li>Distances are based on OSRM (Open Source Routing Machine) routes using OpenStreetMap data.</li>
          <li>For car trips with more than 5 people, you should consider multiple vehicles (calculate per vehicle and then
          multiply).</li>
          </ul>
        </p>

        <button type="button" onClick={calculate} disabled={loading || selectedModes.length === 0}>
          {loading ? 'Calculating…' : 'Calculate'}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </section>

      {!!results.length && (
        <section className="results">
          <h2>Results</h2>
          <div className="result-grid">
            {results.map((result) => (
              <article className="card result-card" key={result.mode}>
                <div className="title-row">
                  <h3>{MODE_LABELS[result.mode]}</h3>
                  {result.estimated ? <span className="badge">Estimated</span> : null}
                </div>
                <p>Distance: {result.distanceKm.toFixed(1)} km</p>
                <p>
                  Duration:{' '}
                  {typeof result.durationMin === 'number' ? `${Math.round(result.durationMin)} min` : 'n/a'}
                </p>
                <p className="big">{result.totalKg.toFixed(2)} kgCO₂e <span className="muted">(total trip)</span></p>
                <p>{result.gPerPkm.toFixed(0)} gCO₂e/pkm</p>
              </article>
            ))}
          </div>

          <div className="card chart">
            <h3>Mode comparison (total kgCO₂e per trip)</h3>
            {results.map((result) => (
              <div key={result.mode} className="bar-row">
                <span>{MODE_LABELS[result.mode]}</span>
                <div className="bar-track">
                  <div
                    className="bar"
                    style={{ width: `${maxKg ? (result.totalKg / maxKg) * 100 : 0}%` }}
                    aria-label={`${MODE_LABELS[result.mode]} ${result.totalKg.toFixed(2)} kgCO2e`}
                  />
                </div>
                <strong>{result.totalKg.toFixed(2)}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {showModal ? (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h3>Methodology</h3>
            <p>
              Distances are computed with OSRM (Open Source Routing Machine) driving routes based on
              OpenStreetMap data. Rail uses a configurable multiplier over driving distance, and flights use
              great-circle distance plus uplift. Radiative forcing (RF) represents additional warming from
              emissions at cruise altitude, and LTO covers landing and take-off phases around airports. You
              can edit all emission factors below.
            </p>
            <textarea value={factorDraft} onChange={(e) => setFactorDraft(e.target.value)} rows={16} />
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowModal(false)} type="button">
                Close
              </button>
              <button onClick={handleFactorsSave} type="button">
                Save factors
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
