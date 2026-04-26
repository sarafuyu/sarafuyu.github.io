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

  // --- Live Stockholm weather (Open-Meteo, no API key) ---
  const weatherEls = document.querySelectorAll('[data-weather]');
  if (weatherEls.length && 'fetch' in window) {
    const codeMap = {
      0:  'Clear',
      1:  'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog',           48: 'Rime fog',
      51: 'Light drizzle', 53: 'Drizzle',     55: 'Drizzle',
      56: 'Freezing drizzle', 57: 'Freezing drizzle',
      61: 'Light rain',    63: 'Rain',        65: 'Heavy rain',
      66: 'Freezing rain', 67: 'Freezing rain',
      71: 'Light snow',    73: 'Snow',        75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Showers',       81: 'Showers',     82: 'Heavy showers',
      85: 'Snow showers',  86: 'Snow showers',
      95: 'Thunderstorm',  96: 'Thunderstorm', 99: 'Thunderstorm',
    };
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=59.3293&longitude=18.0686&current=temperature_2m,weather_code&timezone=Europe%2FStockholm';
    fetch(url, { cache: 'default' })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('weather request failed')))
      .then((data) => {
        const c = data && data.current;
        if (!c) return;
        const t = Math.round(c.temperature_2m);
        const sign = t > 0 ? '+' : '';
        const desc = codeMap[c.weather_code] || '—';
        const text = `${sign}${t}° · ${desc}`;
        weatherEls.forEach((el) => { el.textContent = text; });
      })
      .catch(() => {
        weatherEls.forEach((el) => { el.textContent = '—'; });
      });
  }
})();
