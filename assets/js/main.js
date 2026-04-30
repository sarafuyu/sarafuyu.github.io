(() => {
  // --- Mobile nav toggle ---
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.dataset.open = String(open);
    };
    setOpen(false);
    toggle.addEventListener('click', () => {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
    const mq = window.matchMedia('(min-width: 721px)');
    const onChange = (e) => { if (e.matches) setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange);
  }

  // --- Live Stockholm time ---
  const clocks = document.querySelectorAll('[data-clock]');
  if (clocks.length) {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Stockholm',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const tzAbbr = () => {
      try {
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Stockholm',
          timeZoneName: 'short',
        }).formatToParts(new Date());
        const tz = parts.find((p) => p.type === 'timeZoneName');
        return tz ? tz.value : 'CET';
      } catch (_) { return 'CET'; }
    };
    const update = () => {
      const t = fmt.format(new Date());
      const z = tzAbbr();
      clocks.forEach((el) => { el.textContent = `${t} ${z}`; });
    };
    update();
    const tick = () => {
      update();
      const now = new Date();
      const ms = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
      setTimeout(tick, ms);
    };
    setTimeout(tick, (60 - new Date().getSeconds()) * 1000);
  }

  // --- Year + Roman month ---
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
  const monthEls = document.querySelectorAll('[data-month-roman]');
  if (monthEls.length) {
    const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
    const m = roman[new Date().getMonth()];
    monthEls.forEach((el) => { el.textContent = m; });
  }

  // --- Live Stockholm weather ---
  const weatherEls = document.querySelectorAll('[data-weather]');
  if (weatherEls.length && 'fetch' in window) {
    const stockholmWeatherUrl = 'https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/18.0686/lat/59.3293/data.json?timeseries=1&parameters=air_temperature,wind_speed,symbol_code';
    const weatherRefreshMs = 15 * 60 * 1000;
    const weatherFocusThrottleMs = 60 * 1000;
    let weatherRequestId = 0;
    let lastWeatherFetchAt = 0;
    const fetchJson = (url, refreshKey) => {
      const separator = url.includes('?') ? '&' : '?';
      return fetch(`${url}${separator}fresh=${refreshKey}`, { cache: 'no-store' })
        .then((r) => r.ok ? r.json() : Promise.reject(new Error('weather request failed')));
    };
    const symbolWeather = {
      1: { condition: 'Clear', icon: 'Clear' },
      2: { condition: 'Nearly clear', icon: 'Clear' },
      3: { condition: 'Variable clouds', icon: 'Cloud' },
      4: { condition: 'Half clear', icon: 'Cloud' },
      5: { condition: 'Cloudy', icon: 'Cloud' },
      6: { condition: 'Overcast', icon: 'Cloud' },
      7: { condition: 'Fog', icon: 'Fog' },
      8: { condition: 'Light showers', icon: 'Rain' },
      9: { condition: 'Showers', icon: 'Rain' },
      10: { condition: 'Heavy showers', icon: 'Rain' },
      11: { condition: 'Thunderstorm', icon: 'Thunderstorm' },
      12: { condition: 'Light sleet showers', icon: 'Sleet' },
      13: { condition: 'Sleet showers', icon: 'Sleet' },
      14: { condition: 'Heavy sleet showers', icon: 'Sleet' },
      15: { condition: 'Light snow showers', icon: 'Snow' },
      16: { condition: 'Snow showers', icon: 'Snow' },
      17: { condition: 'Heavy snow showers', icon: 'Snow' },
      18: { condition: 'Light rain', icon: 'Rain' },
      19: { condition: 'Rain', icon: 'Rain' },
      20: { condition: 'Heavy rain', icon: 'Rain' },
      21: { condition: 'Thunder', icon: 'Thunderstorm' },
      22: { condition: 'Light sleet', icon: 'Sleet' },
      23: { condition: 'Sleet', icon: 'Sleet' },
      24: { condition: 'Heavy sleet', icon: 'Sleet' },
      25: { condition: 'Light snow', icon: 'Snow' },
      26: { condition: 'Snow', icon: 'Snow' },
      27: { condition: 'Heavy snow', icon: 'Snow' },
    };
    const numberFromSmhi = (value) => {
      const number = Number(value);
      return Number.isFinite(number) && number !== 9999 ? number : NaN;
    };
    const latestStockholmWeather = (data) => {
      if (!data || !Array.isArray(data.timeSeries)) return null;
      for (const point of data.timeSeries) {
        const details = point && point.data;
        const temperature = details && numberFromSmhi(details.air_temperature);
        const windSpeed = details && numberFromSmhi(details.wind_speed);
        const symbolCode = details && numberFromSmhi(details.symbol_code);
        if (Number.isFinite(temperature) && Number.isFinite(symbolCode)) {
          return {
            temperature,
            windSpeed,
            weather: symbolWeather[symbolCode] || { condition: 'SMHI weather', icon: 'Cloud' },
          };
        }
      }
      return null;
    };
    const formatDegrees = (value) => {
      const rounded = Math.round(value);
      const sign = rounded > 0 ? '+' : '';
      return `${sign}${rounded}°`;
    };
    const feelsLike = (temperature, windSpeed) => {
      if (Number.isFinite(windSpeed) && temperature <= 10 && windSpeed > 1.34) {
        const windKmh = windSpeed * 3.6;
        return 13.12 + (0.6215 * temperature)
          - (11.37 * (windKmh ** 0.16))
          + (0.3965 * temperature * (windKmh ** 0.16));
      }
      return temperature;
    };
    const conditionIcons = {
      Clear: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
      'Clear-night':'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
      Cloud: '<path d="M17.5 19H8a6 6 0 1 1 5.7-7.88A4.5 4.5 0 1 1 17.5 19Z"/>',
      Rain: '<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/>',
      Sleet: '<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 19v2M16 19v2M12 17v4"/><path d="m10 14 4 4M14 14l-4 4"/>',
      Snow: '<line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 16-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',
      Fog: '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7M17 21H9"/>',
      Thunderstorm: '<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>',
    };
    const makeWeatherIcon = (icon) => {
      let key = icon;
      if (icon === 'Clear') {
        const hour = Number(new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/Stockholm',
          hour: 'numeric',
          hour12: false,
        }).format(new Date()));
        if (hour >= 21 || hour < 6) key = 'Clear-night';
      }
      const inner = conditionIcons[key];
      if (!inner) return '';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
    };
    const setWeatherFallback = () => {
      weatherEls.forEach((el) => {
        const tempEl = el.querySelector('.weather-temp');
        const iconEl = el.querySelector('.weather-icon');
        const condEl = el.querySelector('.weather-condition');
        const detailEl = el.querySelector('.weather-detail');
        if (tempEl) tempEl.textContent = '—';
        else el.textContent = '—';
        if (iconEl) iconEl.innerHTML = '';
        if (condEl) condEl.textContent = '';
        if (detailEl) detailEl.textContent = '';
        el.removeAttribute('aria-busy');
      });
    };
    const updateWeather = (force = false) => {
      const now = Date.now();
      if (!force && now - lastWeatherFetchAt < weatherFocusThrottleMs) return;
      lastWeatherFetchAt = now;

      const requestId = ++weatherRequestId;
      const refreshKey = `${now}-${requestId}`;

      weatherEls.forEach((el) => {
        el.setAttribute('aria-busy', 'true');
      });

      fetchJson(stockholmWeatherUrl, refreshKey)
        .then((data) => {
          if (requestId !== weatherRequestId) return;

          const latest = latestStockholmWeather(data);

          if (!latest) {
            throw new Error('weather response missing latest Stockholm data');
          }

          const tempText = formatDegrees(latest.temperature);
          const condition = latest.weather.condition;
          const apparent = feelsLike(latest.temperature, latest.windSpeed);
          const detailText = `feels like ${formatDegrees(apparent)}`;
          const iconHtml = makeWeatherIcon(latest.weather.icon);
          const tooltipText = 'SMHI Stockholm point forecast';

          weatherEls.forEach((el) => {
            const tempEl = el.querySelector('.weather-temp');
            const iconEl = el.querySelector('.weather-icon');
            const condEl = el.querySelector('.weather-condition');
            const detailEl = el.querySelector('.weather-detail');
            const row = el.closest('.article-meta__row');
            const tooltipEl = row ? row.querySelector('.weather-tooltip') : null;
            if (tempEl) tempEl.textContent = tempText;
            else el.textContent = `${tempText} · ${condition}`;
            if (iconEl) iconEl.innerHTML = iconHtml;
            if (condEl) condEl.textContent = condition;
            if (detailEl) detailEl.textContent = detailText;
            if (tooltipEl) tooltipEl.textContent = tooltipText;
            el.removeAttribute('aria-busy');
          });
        })
        .catch(() => {
          if (requestId === weatherRequestId) setWeatherFallback();
        });
    };

    updateWeather(true);
    setInterval(() => updateWeather(true), weatherRefreshMs);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') updateWeather(true);
    });
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) updateWeather(true);
    });
    window.addEventListener('focus', () => updateWeather());
  }

  // --- Live T-Centralen rail board ---
  const trainBoard = document.querySelector('[data-train-board]');
  const trainStatus = document.querySelector('[data-train-status]');
  const trainUpdated = document.querySelector('[data-train-updated]');
  if (trainBoard && trainStatus && 'fetch' in window) {
    const siteId = 9001;
    const railModes = new Set(['METRO', 'TRAM', 'TRAIN']);
    const modeLabels = {
      METRO: 'Metro',
      TRAM: 'Tram',
      TRAIN: 'Train',
    };
    const fmtClock = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Stockholm',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const fetchJson = (url) => fetch(url, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('train request failed')));
    const setStatus = (text, state = 'idle') => {
      trainStatus.textContent = text;
      trainStatus.dataset.state = state;
    };
    const setUpdated = () => {
      if (trainUpdated) trainUpdated.textContent = `${fmtClock.format(new Date())} Stockholm`;
    };
    const clearBoard = () => {
      while (trainBoard.firstChild) trainBoard.removeChild(trainBoard.firstChild);
    };
    const makeCell = (text, className) => {
      const cell = document.createElement('td');
      cell.textContent = text;
      if (className) cell.className = className;
      return cell;
    };
    const renderEmpty = (message) => {
      clearBoard();
      const row = document.createElement('tr');
      const cell = makeCell(message);
      cell.colSpan = 5;
      row.appendChild(cell);
      trainBoard.appendChild(row);
    };
    const minutesDelta = (expected, scheduled) => {
      const e = expected ? new Date(expected) : null;
      const s = scheduled ? new Date(scheduled) : null;
      if (!e || !s || Number.isNaN(e.getTime()) || Number.isNaN(s.getTime())) return 0;
      return Math.round((e.getTime() - s.getTime()) / 60000);
    };
    const statusFor = (departure) => {
      if (departure.state === 'CANCELLED') return 'Cancelled';
      const deviations = Array.isArray(departure.deviations) ? departure.deviations : [];
      const deviation = deviations.find((item) => item.consequence && item.consequence !== 'INFORMATION')
        || deviations.find((item) => Number(item.importance_level) >= 5);
      if (deviation && deviation.message) return deviation.message;
      const delta = minutesDelta(departure.expected, departure.scheduled);
      if (delta > 1) return `${delta} min late`;
      if (delta < -1) return `${Math.abs(delta)} min early`;
      if (departure.state === 'ATSTOP') return 'At stop';
      return 'On time';
    };
    const isAlert = (departure) => {
      if (departure.state === 'CANCELLED') return true;
      if (Math.abs(minutesDelta(departure.expected, departure.scheduled)) > 1) return true;
      const deviations = Array.isArray(departure.deviations) ? departure.deviations : [];
      return deviations.some((item) => item.consequence && item.consequence !== 'INFORMATION');
    };
    const renderDepartures = (departures) => {
      clearBoard();
      departures.forEach((departure) => {
        const mode = departure.line && departure.line.transport_mode;
        const row = document.createElement('tr');
        const timeCell = makeCell(
          departure.display || (departure.expected ? fmtClock.format(new Date(departure.expected)) : '-'),
          'train-table__time',
        );
        if (departure.expected || departure.scheduled) {
          const expected = departure.expected ? fmtClock.format(new Date(departure.expected)) : '-';
          const scheduled = departure.scheduled ? fmtClock.format(new Date(departure.scheduled)) : '-';
          timeCell.title = `Expected ${expected}; scheduled ${scheduled}`;
        }

        const lineCell = document.createElement('td');
        const line = document.createElement('span');
        line.className = `train-line train-line--${String(mode || 'rail').toLowerCase()}`;
        line.textContent = departure.line && departure.line.designation
          ? String(departure.line.designation)
          : (modeLabels[mode] || 'Rail');
        line.title = modeLabels[mode] || 'Rail';
        lineCell.appendChild(line);

        const destination = departure.destination || departure.direction || '-';
        const track = departure.stop_point && departure.stop_point.designation
          ? departure.stop_point.designation
          : '-';
        const status = statusFor(departure);
        const statusCell = makeCell(status, isAlert(departure)
          ? 'train-table__status train-table__status--alert'
          : 'train-table__status');

        row.append(
          timeCell,
          lineCell,
          makeCell(destination, 'train-table__destination'),
          makeCell(track, 'train-table__track'),
          statusCell,
        );
        trainBoard.appendChild(row);
      });
    };
    const updateTrainBoard = () => {
      const url = `https://transport.integration.sl.se/v1/sites/${siteId}/departures`;
      fetchJson(url)
        .then((data) => {
          const departures = Array.isArray(data.departures) ? data.departures : [];
          const railDepartures = departures
            .filter((departure) => departure.line && railModes.has(departure.line.transport_mode))
            .sort((a, b) => {
              const aTime = new Date(a.expected || a.scheduled || 0).getTime();
              const bTime = new Date(b.expected || b.scheduled || 0).getTime();
              return aTime - bTime;
            });

          if (!railDepartures.length) {
            renderEmpty('No rail departures returned right now.');
            setStatus('No rail departures returned in the current SL window.');
            setUpdated();
            return;
          }

          renderDepartures(railDepartures.slice(0, 8));
          setStatus(`${railDepartures.length} rail departures in the current SL window.`);
          setUpdated();
        })
        .catch(() => {
          renderEmpty('Live departures are temporarily unavailable.');
          setStatus('SL departures could not be loaded right now.', 'error');
        });
    };

    updateTrainBoard();
    setInterval(updateTrainBoard, 60 * 1000);
  } else if (trainStatus) {
    trainStatus.textContent = 'Live departures require browser fetch support.';
    trainStatus.dataset.state = 'error';
  }
})();
