// 첫 화면 동작: 들어오는 동작, 앱 홈 체험, 앱 화면 고르기, 문의 보내기.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 구역마다 제목 → 글 → 그림 순서로 나타난다.
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.setProperty('--d', `${i * 80}ms`);
      el.classList.add('in');
    });
    io.unobserve(e.target);
  }
}, { threshold: 0.12 });
document.querySelectorAll('main > section, footer').forEach((s) => io.observe(s));

// 앱 홈 체험. 실제 앱처럼 맨 위 카드는 아직 기록 안 한 첫 약이고, 기록은 다시 누르면 지워진다.
const doses = [
  { name: '비타민D', time: '08:00', sym: 'drop', state: 'taken' },
  { name: '오메가3', time: '08:00', sym: 'capsule', state: 'taken' },
  { name: '유산균', time: '13:00', sym: 'leaf', state: null },
  { name: '홍삼 스틱', time: '18:00', sym: 'stick', state: null },
  { name: '마그네슘', time: '21:00', sym: 'pill', state: null },
];
const card = document.querySelector('.card');
const rowsEl = document.getElementById('rows');
const duck = document.querySelector('.card-duck');
const move = document.getElementById('duckMove');
// 앱과 같은 '먹었어요' 직후 영상 8개 중 하나를 무작위로, 바로 전 영상은 빼고 고른다(docs/rules.md).
const moves = ['hand-kiss', 'step', 'dance', 'clap-turn', 'flap', 'clap-hop', 'walk', 'wave-jump'];
let lastMove = '';
const check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function record(i, state) {
  doses[i].state = state;
  if (state === 'taken' && !reduce) {
    const pick = moves.filter((m) => m !== lastMove);
    lastMove = pick[Math.floor(Math.random() * pick.length)];
    move.src = `img/${lastMove}.mp4`;
    duck.classList.add('playing');
    move.play().catch(() => duck.classList.remove('playing'));
  }
  render();
}
move.addEventListener('ended', () => duck.classList.remove('playing'));

function render() {
  const next = doses.findIndex((d) => !d.state);
  card.classList.toggle('done', next < 0);
  document.getElementById('cardLabel').hidden = next < 0;
  document.getElementById('cardTake').hidden = next < 0;
  document.getElementById('cardSkip').hidden = next < 0;
  document.getElementById('cardSym').hidden = next < 0;
  if (next < 0) {
    document.getElementById('cardName').textContent = '오늘 기록을 다 마쳤어요';
  } else {
    const d = doses[next];
    document.getElementById('cardLabel').textContent = `지금 챙길 약 · ${d.time}`;
    document.getElementById('cardName').textContent = d.name;
    document.getElementById('cardSym').src = `img/sym-${d.sym}.png`;
    card.dataset.i = next;
  }
  rowsEl.innerHTML = doses.map((d, i) => `
    <li class="${d.state ? '' : 'open'}">
      <span class="sym"><img src="img/sym-${d.sym}.png" alt="" width="32" height="32"></span>
      <span class="what"><b>${d.name}</b><span>${d.time}</span></span>
      <span class="act">${
        d.state === 'taken' ? `<button type="button" class="check" data-i="${i}" data-do="clear" aria-label="${d.name} 먹음 기록 지우기">${check}</button>`
        : d.state === 'skipped' ? `<button type="button" class="undo" data-i="${i}" data-do="clear" aria-label="${d.name} 건너뜀 기록 지우기">건너뜀</button>`
        : `<button type="button" class="pill taken" data-i="${i}" data-do="taken" aria-label="${d.name} 먹었어요">먹었어요</button>
           <button type="button" class="skip" data-i="${i}" data-do="skipped" aria-label="${d.name} 건너뛰기">건너뛰기</button>`
      }</span>
    </li>`).join('');
}
document.getElementById('cardTake').addEventListener('click', () => record(+card.dataset.i, 'taken'));
document.getElementById('cardSkip').addEventListener('click', () => record(+card.dataset.i, 'skipped'));
rowsEl.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-i]');
  if (b) record(+b.dataset.i, b.dataset.do === 'clear' ? null : b.dataset.do);
});
render();

// 앱 화면: 이름을 고르면 화면과 무대 색, 설명이 바뀐다.
const stage = document.getElementById('shotStage');
const shot = document.getElementById('shotImg');
const fact = document.getElementById('shotFact');
document.querySelectorAll('.name').forEach((b) => b.addEventListener('click', () => {
  if (b.getAttribute('aria-pressed') === 'true') return;
  document.querySelectorAll('.name').forEach((n) => n.setAttribute('aria-pressed', String(n === b)));
  stage.className = `shot-stage tone-${b.dataset.tone}`;
  fact.textContent = b.dataset.fact;
  shot.classList.add('swap');
  setTimeout(() => {
    shot.src = `img/${b.dataset.shot}.jpg`;
    shot.alt = `필덕 앱 ${b.textContent} 화면`;
    shot.classList.remove('swap');
  }, reduce ? 0 : 300);
}));

// 문의 보내기(Web3Forms). 스크립트가 없으면 폼이 그대로 Web3Forms로 전송된다.
const form = document.getElementById('contactForm');
const note = document.getElementById('formNote');
const fallback = '보내지 못했어요. 잠시 뒤 다시 보내 주시거나 support@minsunq.com으로 메일을 보내 주세요.';
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const send = form.querySelector('.send');
  const data = Object.fromEntries(new FormData(form));
  send.disabled = true;
  send.textContent = '보내는 중…';
  try {
    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    form.reset();
    note.className = 'note ok';
    note.textContent = '문의를 보냈어요. 적어 주신 이메일로 답장드릴게요.';
  } catch {
    note.className = 'note err';
    note.textContent = fallback;
  } finally {
    send.disabled = false;
    send.textContent = '문의 보내기';
  }
});
