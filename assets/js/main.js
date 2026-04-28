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
    const temperatureStation = {
      id: '98230',
      name: 'Stockholm-Observatoriekullen A',
    };
    const weatherStation = {
      id: '97200',
      name: 'Stockholm-Bromma Flygplats',
    };
    const conditionFromSmhiCode = (code, precipitation) => {
      if (precipitation > 0 && code === 100) return 'Rain';
      if ([10, 11, 12, 28, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 120, 130, 131, 132, 133, 134, 135].includes(code)) return 'Fog';
      if ([17, 29, 91, 92, 93, 94, 95, 96, 97, 98, 99, 126, 190, 191, 192, 193, 194, 195, 196].includes(code)) return 'Thunderstorm';
      if ([50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 122, 150, 151, 152, 153, 154, 155, 156, 157, 158, 250, 251, 252, 253, 254, 255, 256, 257].includes(code)) return 'Drizzle';
      if ([20, 21, 23, 24, 25, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 80, 81, 82, 83, 84, 121, 123, 140, 141, 142, 143, 144, 160, 161, 162, 163, 164, 165, 166, 167, 168, 180, 181, 182, 183, 184, 260, 261, 262, 263, 264, 265, 266, 267, 280, 281, 282, 289, 290].includes(code)) return 'Rain';
      if ([22, 26, 36, 37, 38, 39, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 85, 86, 87, 88, 89, 90, 124, 127, 128, 129, 145, 146, 170, 171, 172, 173, 174, 175, 176, 177, 178, 185, 186, 187, 189, 210, 211, 239, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 283, 284, 285, 286, 287, 288, 291].includes(code)) return 'Snow';
      if ([4, 5, 6, 7, 8, 9, 104, 105, 110, 204, 206, 208, 209].includes(code)) return 'Haze';
      return 'Clear';
    };
    const fmtObservedAt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Stockholm',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const fetchJson = (url) => fetch(url, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('weather request failed')));
    const setWeatherFallback = () => {
      weatherEls.forEach((el) => {
        el.textContent = '—';
        el.removeAttribute('title');
      });
    };
    const updateWeather = () => {
      const cacheKey = Math.floor(Date.now() / (10 * 60 * 1000));
      const temperatureUrl = `https://opendata-download-metobs.smhi.se/api/version/latest/parameter/1/station/${temperatureStation.id}/period/latest-hour/data.json?cache=${cacheKey}`;
      const weatherUrl = `https://opendata-download-metobs.smhi.se/api/version/latest/parameter/13/station/${weatherStation.id}/period/latest-hour/data.json?cache=${cacheKey}`;
      const precipitationUrl = `https://opendata-download-metobs.smhi.se/api/version/latest/parameter/7/station/${temperatureStation.id}/period/latest-hour/data.json?cache=${cacheKey}`;

      Promise.all([fetchJson(temperatureUrl), fetchJson(weatherUrl), fetchJson(precipitationUrl)])
        .then(([temperatureData, weatherData, precipitationData]) => {
          const latest = temperatureData
            && Array.isArray(temperatureData.value)
            && temperatureData.value[temperatureData.value.length - 1];
          const latestWeather = weatherData
            && Array.isArray(weatherData.value)
            && weatherData.value[weatherData.value.length - 1];
          const latestPrecipitation = precipitationData
            && Array.isArray(precipitationData.value)
            && precipitationData.value[precipitationData.value.length - 1];
          const temp = latest && Number(latest.value);
          const code = latestWeather && Number(latestWeather.value);
          const precipitation = latestPrecipitation ? Number(latestPrecipitation.value) : 0;
          if (!Number.isFinite(temp)) {
            throw new Error('temperature response missing latest Stockholm observation');
          }
          if (!Number.isFinite(code)) {
            throw new Error('weather response missing latest Stockholm condition');
          }

          const sign = temp > 0 ? '+' : '';
          const condition = conditionFromSmhiCode(code, precipitation);
          const text = `${sign}${temp.toFixed(1)}° · ${condition}`;
          const observedAt = latest.date ? fmtObservedAt.format(new Date(latest.date)) : null;
          const title = observedAt
            ? `${temperatureStation.name}, observed ${observedAt}; weather from ${weatherStation.name}`
            : temperatureStation.name;

          weatherEls.forEach((el) => {
            el.textContent = text;
            el.title = title;
          });
        })
        .catch(setWeatherFallback);
    };

    updateWeather();
    setInterval(updateWeather, 10 * 60 * 1000);
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
