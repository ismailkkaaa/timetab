/* ============================================================
   timetable.js — Load & Render Timetable from timetable.json
   ============================================================ */

import Storage from './storage.js';
import Icons from './icons.js';

const Timetable = (() => {
  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const DAY_LABELS = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
  };

  let _data = null;

  /** Fetch and parse timetable.json — cached after first load */
  async function load() {
    if (_data) return _data;
    try {
      const res = await fetch('./timetable.json');
      if (!res.ok) throw new Error('Failed to fetch timetable.json');
      _data = await res.json();
      return _data;
    } catch (e) {
      console.error('[Timetable] Load error:', e);
      return null;
    }
  }

  /** Return today's schedule array (or empty array if weekend/no data) */
  function getTodaySchedule(data) {
    const dayIndex = new Date().getDay(); // 0=Sun, 1=Mon…6=Sat
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayIndex];
    return data?.schedule?.[dayName] ?? [];
  }

  /** Convert "HH:MM" string to minutes since midnight */
  function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  /** Render the full weekly timetable view into #timetable-view */
  function render(data, container) {
    if (!data) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">${Icons.svg('calendar', 40, 1.75)}</div><div class="empty-state__title">No timetable found</div><div class="empty-state__body">Check that timetable.json is present.</div></div>`;
      return;
    }

    const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];

    container.innerHTML = '';
    DAYS.forEach(day => {
      const periods = data.schedule[day] ?? [];
      const isToday = day === today;

      const section = document.createElement('div');
      section.className = 'tt-day' + (isToday ? ' tt-day--today' : '');

      // Day header
      const header = document.createElement('div');
      header.className = 'tt-day__header';
      header.innerHTML = `
        <span class="tt-day__name">${DAY_LABELS[day]}</span>
        ${isToday ? '<span class="b-badge b-badge--primary">TODAY</span>' : ''}
      `;
      section.appendChild(header);

      // Period cards
      const grid = document.createElement('div');
      grid.className = 'tt-period-grid';

      periods.forEach(period => {
        const isBreak = period.type === 'break' || period.type === 'lunch';
        const card = document.createElement('div');
        card.className = 'tt-period-card' + (isBreak ? ' tt-period-card--break' : '');
        card.style.setProperty('--period-color', period.color);

        card.innerHTML = `
          <div class="tt-period-card__color-bar"></div>
          <div class="tt-period-card__content">
            <div class="tt-period-card__time">
              <span class="b-label">${period.start} – ${period.end}</span>
              ${period.room ? `<span class="b-tag" style="color:${period.color}; border-color:${period.color}">${period.room}</span>` : ''}
            </div>
            <div class="tt-period-card__subject">${period.subject}</div>
            ${period.teacher ? `<div class="tt-period-card__teacher">${period.teacher}</div>` : ''}
          </div>
        `;
        grid.appendChild(card);
      });

      if (periods.length === 0) {
        grid.innerHTML = `<div class="tt-free-day">${Icons.svg('star', 14, 2.25)} No classes — free day!</div>`;
      }

      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  return { load, getTodaySchedule, timeToMinutes, render };
})();

export default Timetable;
