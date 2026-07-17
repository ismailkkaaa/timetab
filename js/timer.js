/* ============================================================
   timer.js — Live Countdown + Current/Next Period Detection
   ============================================================ */

import Timetable from './timetable.js';
import Notification from './notification.js';

const Timer = (() => {
  let _schedule    = [];    // Today's periods
  let _interval    = null;  // setInterval handle
  let _lastPeriodId = null; // Track period changes for notifications

  // DOM references (set by init)
  let elCurrentSubject, elCurrentTeacher, elCurrentRoom,
      elCountdown, elCurrentStatus, elCurrentCard,
      elNextSubject, elNextTime, elNextCard,
      elTodayList, elDateStr;

  /** Pad a number to 2 digits */
  const pad = n => String(n).padStart(2, '0');

  /** Format seconds as MM:SS */
  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${pad(m)}:${pad(s)}`;
  }

  /** Get current time as minutes since midnight */
  function nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  /** Get current seconds past midnight */
  function nowSeconds() {
    const d = new Date();
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  }

  /** Convert "HH:MM" to seconds since midnight */
  function timeToSeconds(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 3600 + m * 60;
  }

  /** Find the current and next active periods */
  function findPeriods(nowSec) {
    let current = null;
    let next    = null;

    for (let i = 0; i < _schedule.length; i++) {
      const p = _schedule[i];
      const start = timeToSeconds(p.start);
      const end   = timeToSeconds(p.end);

      if (nowSec >= start && nowSec < end) {
        current = p;
        // Look for next non-break period
        for (let j = i + 1; j < _schedule.length; j++) {
          if (!_schedule[j].type || _schedule[j].type === '') {
            next = _schedule[j];
            break;
          } else {
            next = _schedule[j]; // Include breaks as next
            break;
          }
        }
        break;
      }

      // Before first period
      if (nowSec < timeToSeconds(p.start)) {
        if (next === null) next = p;
        break;
      }
    }

    return { current, next };
  }

  /** Render the current period card */
  function renderCurrent(period, remainingSec) {
    if (!period) {
      elCurrentCard.setAttribute('data-state', 'free');
      elCurrentSubject.textContent = 'No Class';
      elCurrentTeacher.textContent = '—';
      elCurrentRoom.textContent    = '—';
      elCurrentStatus.textContent  = '';
      elCountdown.textContent      = '--:--';
      elCountdown.className        = 'home-countdown home-countdown--idle';
      return;
    }

    const isBreak = period.type === 'break';
    const isLunch = period.type === 'lunch';
    const state   = isBreak ? 'break' : isLunch ? 'lunch' : 'active';

    elCurrentCard.setAttribute('data-state', state);
    elCurrentCard.style.setProperty('--period-color', period.color);
    elCurrentSubject.textContent = period.subject;
    elCurrentTeacher.textContent = period.teacher || '—';
    elCurrentRoom.textContent    = period.room    || '—';
    elCurrentStatus.textContent  = isBreak ? '☕ Break' : isLunch ? '🍽 Lunch' : '📚 In Progress';
    elCountdown.textContent      = formatTime(remainingSec);

    const cls = isBreak || isLunch ? 'home-countdown--break' : 'home-countdown--active';
    elCountdown.className        = `home-countdown ${cls}`;
  }

  /** Render the next period card */
  function renderNext(period) {
    if (!period) {
      elNextCard.classList.add('hidden');
      return;
    }
    elNextCard.classList.remove('hidden');
    elNextCard.style.setProperty('--period-color', period.color);
    elNextSubject.textContent = period.subject;
    elNextTime.textContent    = `${period.start} – ${period.end}`;
  }

  /** Render the today's mini schedule list */
  function renderTodayList() {
    if (!elTodayList) return;
    elTodayList.innerHTML = '';

    // Update period count label
    const countLabel = document.getElementById('period-count-label');
    if (countLabel) {
      const classPeriods = _schedule.filter(p => !p.type).length;
      countLabel.textContent = classPeriods > 0 ? `${classPeriods} periods` : 'Free day';
    }
    const nowSec = nowSeconds();

    _schedule.forEach(p => {
      const start  = timeToSeconds(p.start);
      const end    = timeToSeconds(p.end);
      const isPast = nowSec >= end;
      const isCurr = nowSec >= start && nowSec < end;

      const item = document.createElement('div');
      item.className = 'schedule-item' +
        (isPast ? ' schedule-item--past' : '') +
        (isCurr ? ' schedule-item--current' : '');
      item.style.setProperty('--period-color', p.color);

      item.innerHTML = `
        <div class="schedule-item__time">
          <span class="b-label">${p.start}</span>
          <span class="b-label">${p.end}</span>
        </div>
        <div class="schedule-item__color-dot"></div>
        <div class="schedule-item__info">
          <div class="schedule-item__subject">${p.subject}</div>
          ${p.teacher ? `<div class="schedule-item__teacher">${p.teacher}</div>` : ''}
        </div>
        ${isCurr ? '<div class="schedule-item__live"><span class="live-dot"></span>LIVE</div>' : ''}
        ${isPast ? '<div class="schedule-item__done">✓</div>' : ''}
      `;
      elTodayList.appendChild(item);
    });

    if (_schedule.length === 0) {
      elTodayList.innerHTML = `<div class="empty-state" style="padding: 2rem"><div class="empty-state__icon">🎉</div><div class="empty-state__title">Free Day!</div><div class="empty-state__body">No classes scheduled today.</div></div>`;
    }
  }

  /** Main tick — called every second */
  function tick() {
    const nowSec = nowSeconds();
    const { current, next } = findPeriods(nowSec);

    // Calculate remaining seconds in current period
    let remainingSec = 0;
    if (current) {
      remainingSec = timeToSeconds(current.end) - nowSec;
      if (remainingSec < 0) remainingSec = 0;
    }

    renderCurrent(current, remainingSec);
    renderNext(next);

    // Notify on period change
    if (current && current.id !== _lastPeriodId) {
      _lastPeriodId = current.id;
      Notification.onPeriodStart(current);
    }

    // Check 5-min warning for next period
    if (next) {
      const nextStart = timeToSeconds(next.start);
      const diff = nextStart - nowSec;
      if (diff === 300) { // exactly 5 minutes
        Notification.onFiveMinWarning(next);
      }
    }

    // Update schedule list every 30 seconds for timely period transitions
    if (nowSec % 30 === 0) {
      renderTodayList();
    }
  }

  /** Update the date display */
  function renderDate() {
    if (!elDateStr) return;
    const d = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elDateStr.textContent = d.toLocaleDateString('en-IN', options);
  }

  /** Initialise — load schedule + start interval */
  async function init() {
    // Bind DOM elements
    elCurrentSubject = document.getElementById('current-subject');
    elCurrentTeacher = document.getElementById('current-teacher');
    elCurrentRoom    = document.getElementById('current-room');
    elCountdown      = document.getElementById('countdown');
    elCurrentStatus  = document.getElementById('current-status');
    elCurrentCard    = document.getElementById('current-card');
    elNextSubject    = document.getElementById('next-subject');
    elNextTime       = document.getElementById('next-time');
    elNextCard       = document.getElementById('next-card');
    elTodayList      = document.getElementById('today-list');
    elDateStr        = document.getElementById('date-str');

    const data = await Timetable.load();
    _schedule = Timetable.getTodaySchedule(data);

    renderDate();
    renderTodayList();
    tick(); // immediate first render

    // Update every second
    _interval = setInterval(tick, 1000);
  }

  /** Stop the timer (cleanup) */
  function destroy() {
    if (_interval) {
      clearInterval(_interval);
      _interval = null;
    }
  }

  return { init, destroy };
})();

export default Timer;
