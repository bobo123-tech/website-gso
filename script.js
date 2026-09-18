/* ============ STATE MANAGEMENT ============ */
const PEOPLE_PER_WELL = 650;
const STORAGE_KEY = 'aquaHopeState';

const DEFAULT_PROJECTS = {
  Allgemein:  { goal: 8500, current: 0, label: 'Allgemeiner Wasserfonds' },
  Kenia:      { goal: 8500, current: 0, label: '🇰🇪 Kenia – Turkana-Region' },
  Äthiopien:  { goal: 9200, current: 0, label: '🇪🇹 Äthiopien – Oromia' },
  Malawi:     { goal: 7300, current: 0, label: '🇲🇼 Malawi – Lilongwe' },
  Tansania:   { goal: 8900, current: 0, label: '🇹🇿 Tansania – Dodoma' },
  Indien:     { goal: 6600, current: 0, label: '🇮🇳 Indien – Rajasthan' },
  Uganda:     { goal: 7800, current: 0, label: '🇺🇬 Uganda – Karamoja' },
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { /* fallthrough */ }
  }
  return {
    totalDonated: 0,
    projects: JSON.parse(JSON.stringify(DEFAULT_PROJECTS)),
    featuredProject: 'Kenia',
    feed: []
  };
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = loadState();

function computeWells() {
  let wells = 0;
  Object.values(state.projects).forEach(p => { wells += Math.floor(p.current / p.goal); });
  return wells;
}
function computeActiveCountries() {
  return Object.keys(state.projects).filter(k => k !== 'Allgemein' && state.projects[k].current > 0).length;
}
function computePeople() { return computeWells() * PEOPLE_PER_WELL; }

/* ============ NUMBER ANIMATION ============ */
function animateValue(el, to, suffix = '') {
  const from = parseInt(el.dataset.value || '0', 10);
  if (from === to) { el.textContent = to.toLocaleString('de-DE') + suffix; return; }
  const duration = 1100;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(from + (to - from) * eased);
    el.textContent = value.toLocaleString('de-DE') + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else { el.textContent = to.toLocaleString('de-DE') + suffix; el.dataset.value = to; }
  }
  requestAnimationFrame(step);
}

/* ============ RENDER EVERYTHING ============ */
const RING_CIRCUMFERENCE = 2 * Math.PI * 95;

function renderAll() {
  const wells = computeWells();
  const people = computePeople();
  const countries = computeActiveCountries();
  const donated = Math.round(state.totalDonated);

  // Hero mini stats + Stats section (all elements with .counter)
  document.querySelectorAll('.counter').forEach(el => {
    const key = el.dataset.key;
    let target = 0;
    if (key === 'wells') target = wells;
    else if (key === 'people') target = people;
    else if (key === 'countries') target = countries;
    else if (key === 'donated') target = donated;
    else {
      // hero mini stats (no data-key, order: wells, people, countries)
      const idx = [...el.parentElement.parentElement.children].indexOf(el.parentElement);
      target = idx === 0 ? wells : idx === 1 ? people : countries;
    }
    animateValue(el, target);
  });

  // Hero pill text
  const pill = document.getElementById('heroPill');
  if (people > 0) {
    pill.innerHTML = `<i class="fa-solid fa-heart"></i> Über ${people.toLocaleString('de-DE')} Menschen bereits geholfen`;
  } else {
    pill.innerHTML = `<i class="fa-solid fa-rocket"></i> Gerade gestartet – sei von Anfang an dabei`;
  }

  // Spendenuhr (featured project)
  const fp = state.projects[state.featuredProject];
  const remainder = fp.current % fp.goal;
  const percent = Math.round((remainder / fp.goal) * 100);
  const ring = document.getElementById('progressRing');
  ring.style.strokeDasharray = RING_CIRCUMFERENCE;
  ring.style.strokeDashoffset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;

  animateValue(document.getElementById('progressPercent'), percent, '%');
  const currentEl = document.getElementById('currentAmount');
  currentEl.dataset.value = currentEl.dataset.value || 0;
  animateValue(currentEl, remainder, ' €');
  const remainingEl = document.getElementById('remainingAmount');
  animateValue(remainingEl, fp.goal - remainder, ' €');
  document.getElementById('goalAmount').textContent = fp.goal.toLocaleString('de-DE') + ' €';
  document.getElementById('progressBarInner').style.width = percent + '%';

  // Project cards
  document.querySelectorAll('.project-card').forEach(card => {
    const key = card.dataset.project;
    const p = state.projects[key];
    if (!p) return;
    const rem = p.current % p.goal;
    const perc = Math.min(100, Math.round((rem / p.goal) * 100));
    card.querySelector('.mini-progress div').style.width = perc + '%';
    card.querySelector('.pc-percent').textContent = perc + '% finanziert';
  });

  // Live feed
  const feedList = document.getElementById('liveFeedList');
  feedList.innerHTML = '';
  if (state.feed.length === 0) {
    feedList.innerHTML = '<li class="empty-feed">Sei die/der Erste, die/der spendet! 💧</li>';
  } else {
    state.feed.slice(0, 6).forEach(entry => {
      const li = document.createElement('li');
      li.innerHTML = `<i class="fa-solid fa-heart" style="color:#FF8C42;margin-right:6px;"></i><strong>${entry.name}</strong> hat gerade <strong>${entry.amount} €</strong> für <strong>${entry.project}</strong> gespendet`;
      feedList.appendChild(li);
    });
  }
}

/* ============ DONATION SUBMIT ============ */
function addDonation(amount, projectKey, donorName) {
  // Spenden an den "Allgemeinen Wasserfonds" fließen automatisch
  // in das aktuell hervorgehobene Projekt (Spendenuhr oben) –
  // dorthin, wo das Geld gerade am dringendsten gebraucht wird.
  if (projectKey === 'Allgemein' || !state.projects[projectKey]) {
    projectKey = state.featuredProject;
  }

  const before = state.projects[projectKey];
  const beforeWellsForProject = Math.floor(before.current / before.goal);

  state.totalDonated += amount;
  state.projects[projectKey].current += amount;

  const afterWellsForProject = Math.floor(state.projects[projectKey].current / before.goal);
  const wellCompletedNow = afterWellsForProject > beforeWellsForProject;

  state.feed.unshift({
    name: donorName || 'Anonym',
    amount: amount,
    project: state.projects[projectKey].label,
    time: Date.now()
  });
  state.feed = state.feed.slice(0, 10);

  saveState();
  renderAll();

  return { wellCompletedNow, project: state.projects[projectKey] };
}

/* ============ PRELOADER / SCROLL / HEADER ============ */
window.addEventListener('load', () => {
  document.getElementById('preloader').classList.add('hide');
  renderAll();
});

window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
  document.getElementById('scrollProgress').style.width = scrolled + '%';
  document.getElementById('mainHeader').classList.toggle('scrolled', window.scrollY > 60);
  document.getElementById('backToTop').classList.toggle('show', window.scrollY > 500);
});

document.getElementById('backToTop').addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));

document.getElementById('burger').addEventListener('click', () => {
  const nav = document.getElementById('mainNav');
  const open = nav.style.display === 'flex';
  nav.style.display = open ? 'none' : 'flex';
  nav.style.cssText += 'position:fixed;top:74px;left:0;right:0;background:#fff;flex-direction:column;padding:22px;box-shadow:0 10px 30px rgba(0,0,0,.1);';
  nav.querySelectorAll('a').forEach(a=>a.style.color='#1e293b');
});

/* ============ REVEAL ON SCROLL ============ */
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => revealObserver.observe(el));

/* ============ CURSOR SPOTLIGHT (HERO) ============ */
const hero = document.getElementById('hero');
const spotlight = document.getElementById('heroSpotlight');
hero.addEventListener('mousemove', (e) => {
  const rect = hero.getBoundingClientRect();
  spotlight.style.left = (e.clientX - rect.left) + 'px';
  spotlight.style.top = (e.clientY - rect.top) + 'px';
});

/* ============ MAGNETIC BUTTONS ============ */
document.querySelectorAll('.magnetic').forEach(btn => {
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
  });
  btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate(0,0)'; });
});

/* ============ TILT EFFECT ============ */
document.querySelectorAll('.tilt').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(700px) rotateY(0) rotateX(0) scale(1)'; });
});

/* ============ PROJECT SLIDER ============ */
const slider = document.getElementById('projectSlider');
document.getElementById('projNext').addEventListener('click', () => slider.scrollBy({left:340,behavior:'smooth'}));
document.getElementById('projPrev').addEventListener('click', () => slider.scrollBy({left:-340,behavior:'smooth'}));

document.querySelectorAll('.choose-project').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const card = e.target.closest('.project-card');
    const project = card.getAttribute('data-project');
    document.getElementById('projectSelect').value = project;
    updateSummary();
    document.getElementById('spenden').scrollIntoView({behavior:'smooth'});
  });
});
document.getElementById('supportThisProject').addEventListener('click', () => {
  document.getElementById('projectSelect').value = state.featuredProject;
  updateSummary();
});

/* ============ DONATION FORM LOGIC ============ */
let selectedAmount = 25, selectedFreq = 'einmalig';

document.querySelectorAll('.amount-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedAmount = +btn.getAttribute('data-amount');
    document.getElementById('customAmount').value = '';
    updateSummary(); checkFormValidity();
  });
});
document.getElementById('customAmount').addEventListener('input', (e) => {
  if (e.target.value) {
    document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    selectedAmount = +e.target.value;
    updateSummary(); checkFormValidity();
  }
});

document.querySelectorAll('.freq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.freq-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedFreq = btn.getAttribute('data-freq');
    updateSummary();
  });
});

document.querySelectorAll('.payment-method').forEach(label => {
  label.addEventListener('click', () => {
    document.querySelectorAll('.payment-method').forEach(l => l.classList.remove('active'));
    label.classList.add('active');
    checkFormValidity();
  });
});

document.getElementById('projectSelect').addEventListener('change', updateSummary);

function updateSummary() {
  document.getElementById('summaryAmount').textContent = selectedAmount + ' €' + (selectedFreq==='monatlich' ? ' / Monat' : '');
  document.getElementById('summaryFreq').textContent = selectedFreq === 'monatlich' ? 'Monatlich' : 'Einmalig';
  document.getElementById('summaryProject').textContent = document.getElementById('projectSelect').selectedOptions[0].text;
}
updateSummary();

const privacyCheckbox = document.getElementById('privacyConsent');
const submitBtn = document.getElementById('donateSubmitBtn');
function checkFormValidity() { submitBtn.disabled = !(privacyCheckbox.checked && selectedAmount > 0); }
privacyCheckbox.addEventListener('change', checkFormValidity);
checkFormValidity();

document.getElementById('donationForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (submitBtn.disabled) return;

  const projectKey = document.getElementById('projectSelect').value;
  const firstName = document.getElementById('donorFirstname').value.trim();
  const lastInitial = document.getElementById('donorLastname').value.trim().charAt(0);
  const donorName = firstName ? `${firstName} ${lastInitial ? lastInitial + '.' : ''}`.trim() : 'Anonym';

  const result = addDonation(selectedAmount, projectKey, donorName);

  const projectLabel = document.getElementById('projectSelect').selectedOptions[0].text;
  document.getElementById('successText').textContent =
    `Deine ${selectedFreq === 'monatlich' ? 'monatliche' : 'einmalige'} Spende von ${selectedAmount} € für „${projectLabel}“ wurde erfasst.`;

  const impactBox = document.getElementById('impactBox');
  if (result.wellCompletedNow) {
    impactBox.innerHTML = `🎉 <strong>Fantastisch!</strong> Mit deiner Spende wurde ein kompletter Brunnen finanziert!`;
  } else {
    const rem = result.project.current % result.project.goal;
    const percent = Math.round((rem / result.project.goal) * 100);
    impactBox.innerHTML = `💧 Das Projekt „${result.project.label}“ ist jetzt zu <strong>${percent}%</strong> finanziert.`;
  }

  document.getElementById('successModal').classList.add('show');
  launchConfetti();

  e.target.reset();
  document.querySelectorAll('.amount-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.amount-btn[data-amount="25"]').classList.add('active');
  selectedAmount = 25;
  document.querySelectorAll('.freq-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.freq-btn[data-freq="einmalig"]').classList.add('active');
  selectedFreq = 'einmalig';
  updateSummary();
  checkFormValidity();
});
document.getElementById('closeSuccessModal').addEventListener('click', () => {
  document.getElementById('successModal').classList.remove('show');
});

/* ============ CONFETTI ============ */
function launchConfetti() {
  const target = document.getElementById('confettiTarget');
  const colors = ['#FF8C42','#00B4D8','#06D6A0','#0077B6','#E85D04'];
  for (let i=0;i<44;i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random()*100+'%';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.animationDelay = Math.random()*0.5+'s';
    target.appendChild(c);
    setTimeout(()=>c.remove(), 3000);
  }
}

/* ============ TESTIMONIAL SLIDER ============ */
const testiTrack = document.getElementById('testiTrack');
const testiCards = document.querySelectorAll('.testi-card');
const testiDotsWrap = document.getElementById('testiDots');
let testiIndex = 0;
testiCards.forEach((_, i) => {
  const dot = document.createElement('span');
  if (i===0) dot.classList.add('active');
  dot.addEventListener('click', () => goToTesti(i));
  testiDotsWrap.appendChild(dot);
});
function goToTesti(i) {
  testiIndex = i;
  testiTrack.style.transform = `translateX(-${i*100}%)`;
  document.querySelectorAll('.testi-dots span').forEach((d,idx)=>d.classList.toggle('active', idx===i));
}
setInterval(() => { testiIndex = (testiIndex+1) % testiCards.length; goToTesti(testiIndex); }, 5500);

/* ============ FAQ ============ */
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    document.querySelectorAll('.faq-item').forEach(i => { if(i!==item) i.classList.remove('open'); });
    item.classList.toggle('open');
  });
});

/* ============ NEWSLETTER (demo) ============ */
document.getElementById('newsletterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Danke für deine Anmeldung! Bitte bestätige die E-Mail in deinem Postfach (Double-Opt-In).');
  e.target.reset();
});

/* ============ COOKIE BANNER ============ */
const cookieBanner = document.getElementById('cookieBanner');
const cookieModal = document.getElementById('cookieModal');
if (!localStorage.getItem('cookieConsent')) setTimeout(()=>cookieBanner.classList.add('show'), 800);
document.getElementById('cookieAccept').addEventListener('click', () => {
  localStorage.setItem('cookieConsent', JSON.stringify({necessary:true,stats:true,marketing:true}));
  cookieBanner.classList.remove('show');
});
document.getElementById('cookieDecline').addEventListener('click', () => {
  localStorage.setItem('cookieConsent', JSON.stringify({necessary:true,stats:false,marketing:false}));
  cookieBanner.classList.remove('show');
});
document.getElementById('cookieSettings').addEventListener('click', () => cookieModal.classList.add('show'));
document.getElementById('reopenCookies').addEventListener('click', (e) => { e.preventDefault(); cookieModal.classList.add('show'); });
document.getElementById('closeCookieModal').addEventListener('click', () => cookieModal.classList.remove('show'));
document.getElementById('saveCookieModal').addEventListener('click', () => {
  localStorage.setItem('cookieConsent', JSON.stringify({
    necessary:true,
    stats:document.getElementById('cookieStats').checked,
    marketing:document.getElementById('cookieMarketing').checked
  }));
  cookieModal.classList.remove('show');
  cookieBanner.classList.remove('show');
});

/* ============ DEMO RESET (für Schulpräsentation) ============ */
document.getElementById('resetDemo').addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Alle Spenden-Demo-Daten wirklich zurücksetzen?')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
});