import { supabase } from './supabase-config.js';

const $ = (id) => document.getElementById(id);
const toggle = $('streakToggle');
const overlay = $('streakOverlay');
let userId = null;
let previousFocus = null;

function dayInPakistan(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
function moveDay(iso, offset) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function calculate(dates) {
  const unique = new Set(dates);
  const today = dayInPakistan();
  let current = 0;
  let cursor = unique.has(today) ? today : moveDay(today, -1);
  while (unique.has(cursor)) { current++; cursor = moveDay(cursor, -1); }
  const sorted = [...unique].sort();
  let best = 0, run = 0, last = null;
  for (const day of sorted) {
    run = last && moveDay(last, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    last = day;
  }
  return { current, best, unique, today };
}
function paint(dates) {
  const { current, best, unique, today } = calculate(dates);
  $('navStreakCount').textContent = current;
  $('streakCurrent').textContent = current;
  $('streakCurrentSmall').textContent = current;
  $('streakBest').textContent = best;
  $('streakMessage').textContent = unique.has(today) ? 'Today’s fire is secured. Come back tomorrow!' : 'Launch a game today to keep the fire alive!';
  const todayDate = new Date(`${today}T12:00:00Z`);
  const mondayOffset = (todayDate.getUTCDay() + 6) % 7;
  const monday = moveDay(today, -mondayOffset);
  const week = $('streakWeek'); week.replaceChildren();
  ['M','T','W','T','F','S','S'].forEach((label, index) => {
    const date = moveDay(monday, index);
    const div = document.createElement('div');
    div.className = 'nexus-streak-day' + (unique.has(date) ? ' active' : '') + (date === today ? ' today' : '');
    div.title = date;
    div.innerHTML = `<span>${label}</span><i class="fa-solid fa-fire"></i>`;
    week.append(div);
  });
  const milestones = $('streakMilestones'); milestones.replaceChildren();
  [3,7,15,30,100].forEach(days => {
    const div = document.createElement('div');
    div.className = 'nexus-streak-milestone' + (best >= days ? ' unlocked' : '');
    div.innerHTML = `<i class="fa-solid fa-medal"></i><span>${days} DAYS</span>`;
    milestones.append(div);
  });
}
async function refresh() {
  if (!userId) return;
  const { data, error } = await supabase.from('game_activities')
    .select('played_on').eq('user_id', userId)
    .order('played_on', { ascending: true }).limit(10000);
  if (error) { $('streakError').textContent = 'Unable to load streak: ' + error.message; return; }
  $('streakError').textContent = '';
  paint((data || []).map(row => row.played_on));
}
async function recordLaunch(title) {
  if (!userId) return;
  const { error } = await supabase.rpc('record_game_launch', { game_title: title.slice(0,100) });
  if (error) { console.error('Streak launch tracking:', error.message); $('streakError').textContent = error.message; return; }
  await refresh();
}
function trackExternalLinks() {
  // Tracks external game links from hero, carousel, featured cards, and modal.
  // The browser opens links normally; tracking happens in parallel.
  document.addEventListener('click', (event) => {
    if (!userId) return;
    const link = event.target.closest('a[href]');
    if (!link || !/^https?:/.test(link.href)) return;
    if (link.closest('footer')) return; // marketing links aren't gameplay
    const name = link.closest('.game-card')?.querySelector('h3')?.textContent?.trim()
      || link.closest('#portalsGrid')?.querySelector('h3')?.textContent?.trim()
      || (link.id === 'directLaunchBtn' ? document.getElementById('modalTitle')?.textContent : null)
      || link.textContent.trim() || 'Game portal';
    void recordLaunch(name);
  }, true);
  const openTab = $('modalExternalBtn');
  openTab?.addEventListener('click', () => {
    if (userId && typeof activePortal !== 'undefined' && activePortal) void recordLaunch(activePortal.name);
  });
}
function close() { overlay.hidden = true; document.body.style.overflow = ''; previousFocus?.focus(); }
toggle.addEventListener('click', () => { previousFocus = document.activeElement; overlay.hidden = false; document.body.style.overflow = 'hidden'; $('streakClose').focus(); void refresh(); });
$('streakClose').addEventListener('click', close);
overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !overlay.hidden) close(); });

async function init() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return;
  userId = user.id;
  toggle.hidden = false;
  paint([]);
  await refresh();
}
trackExternalLinks();
void init();
