// ===== PRELOADER =====
window.addEventListener('load', () => {
  document.getElementById('preloader').classList.add('hide');
});

// ===== SCROLL PROGRESS BAR + HEADER =====
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
  document.getElementById('scrollProgress').style.width = scrolled + '%';
  document.getElementById('mainHeader').classList.toggle('scrolled', window.scrollY > 60);
  document.getElementById('backToTop').classList.toggle('show', window.scrollY > 500);
});

// ===== BACK TO TOP =====
document.getElementById('backToTop').addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));

// ===== BURGER MENU (simple toggle for mobile) =====
document.getElementById('burger').addEventListener('click', () => {
  const nav = document.getElementById('mainNav');
  nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
  nav.style.cssText += 'position:fixed;top:70px;left:0;right:0;background:#fff;flex-direction:column;padding:20px;box-shadow:0 10px 20px rgba(0,0,0,.1);';
  nav.querySelectorAll('a').forEach(a=>a.style.color='#1e293b');
});

// ===== REVEAL ON SCROLL =====
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .counter');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      if (entry.target.classList.contains('counter')) animateCounter(entry.target);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });
revealEls.forEach(el => revealObserver.observe(el));

// ===== COUNTER ANIMATION =====
function animateCounter(el) {
  const target = +el.getAttribute('data-target');
  let current = 0;
  const duration = 2000;
  const stepTime = 16;
  const steps = duration / stepTime;
  const increment = target / steps;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current).toLocaleString('de-DE');
  }, stepTime);
}
// Hero mini stats counters
document.querySelectorAll('.hero-mini-stats strong[data-count]').forEach(el => {
  el.setAttribute('data-target', el.getAttribute('data-count'));
  el.classList.add('counter');
});

// ===== SPENDENUHR (PROGRESS RING) =====
const goal = 8500, current = 6175;
const percent = Math.round((current / goal) * 100);
const circumference = 2 * Math.PI * 95; // r=95

function animateRing() {
  const ring = document.getElementById('progressRing');
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = circumference - (percent / 100) * circumference;
}
document.getElementById('progressPercent').textContent = '0%';

const ringObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateRing();
      let p = 0;
      const pInterval = setInterval(() => {
        p++;
        document.getElementById('progressPercent').textContent = p + '%';
        if (p >= percent) clearInterval(pInterval);
      }, 15);
      let amt = 0;
      const amtInterval = setInterval(() => {
        amt += Math.ceil(current/60);
        if (amt >= current) amt = current;
        document.getElementById('currentAmount').textContent = amt.toLocaleString('de-DE') + ' €';
        document.getElementById('remainingAmount').textContent = (goal-amt).toLocaleString('de-DE') + ' €';
        document.getElementById('progressBarInner').style.width = (amt/goal*100) + '%';
        if (amt >= current) clearInterval(amtInterval);
      }, 25);
      ringObserver.unobserve(entry.target);
    }
  });
}, {threshold:0.3});
ringObserver.observe(document.getElementById('spendenuhr'));
document.getElementById('goalAmount').textContent = goal.toLocaleString('de-DE') + ' €';

// ===== LIVE SPENDEN FEED (Simulation) =====
const names = ['Anna S.','Max M.','Lea K.','Tom B.','Sofia R.','Paul W.','Nina H.','Leon F.','Julia P.','David S.'];
const amounts = [10,15,20,25,30,50,75,100];
const feedList = document.getElementById('liveFeedList');
function addFeedItem() {
  const name = names[Math.floor(Math.random()*names.length)];
  const amount = amounts[Math.floor(Math.random()*amounts.length)];
  const li = document.createElement('li');
  li.innerHTML = `<i class="fa-solid fa-heart" style="color:#FF8C42;margin-right:6px;"></i><strong>${name}</strong> hat gerade <strong>${amount} €</strong> gespendet`;
  feedList.prepend(li);
  if (feedList.children.length > 4) feedList.removeChild(feedList.lastChild);
}
addFeedItem();
setInterval(addFeedItem, 6000);

// ===== PROJECT SLIDER =====
const slider = document.getElementById('projectSlider');
document.getElementById('projNext').addEventListener('click', () => slider.scrollBy({left:340,behavior:'smooth'}));
document.getElementById('projPrev').addEventListener('click', () => slider.scrollBy({left:-340,behavior:'smooth'}));

// Choose project -> jump to donation form
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
  document.getElementById('projectSelect').value = 'Kenia';
  updateSummary();
});

// ===== DONATION FORM LOGIC =====
let selectedAmount = 25, selectedFreq = 'einmalig';

document.querySelectorAll('.amount-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedAmount = +btn.getAttribute('data-amount');
    document.getElementById('customAmount').value = '';
    updateSummary();
    checkFormValidity();
  });
});
document.getElementById('customAmount').addEventListener('input', (e) => {
  if (e.target.value) {
    document.querySelectorAll('.amount-btn').forEach(b => b.classList.remove('active'));
    selectedAmount = +e.target.value;
    updateSummary();
    checkFormValidity();
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

// ===== PRIVACY CHECKBOX -> ENABLE SUBMIT =====
const privacyCheckbox = document.getElementById('privacyConsent');
const submitBtn = document.getElementById('donateSubmitBtn');
function checkFormValidity() {
  submitBtn.disabled = !(privacyCheckbox.checked && selectedAmount > 0);
}
privacyCheckbox.addEventListener('change', checkFormValidity);
checkFormValidity();

// ===== FORM SUBMIT =====
document.getElementById('donationForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (submitBtn.disabled) return;

  // Hinweis: In einer echten Anwendung würde hier die Weiterleitung
  // zum jeweiligen Zahlungsanbieter (PayPal SDK / Stripe / etc.)
  // über ein sicheres Backend erfolgen.

  document.getElementById('successText').textContent =
    `Deine ${selectedFreq === 'monatlich' ? 'monatliche' : 'einmalige'} Spende von ${selectedAmount} € für „${document.getElementById('projectSelect').selectedOptions[0].text}“ wurde erfasst.`;
  document.getElementById('successModal').classList.add('show');
  launchConfetti();
});
document.getElementById('closeSuccessModal').addEventListener('click', () => {
  document.getElementById('successModal').classList.remove('show');
});

// ===== CONFETTI EFFECT =====
function launchConfetti() {
  const target = document.getElementById('confettiTarget');
  const colors = ['#FF8C42','#00B4D8','#06D6A0','#0077B6','#E85D04'];
  for (let i=0;i<40;i++){
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random()*100+'%';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.animationDelay = Math.random()*0.5+'s';
    target.appendChild(c);
    setTimeout(()=>c.remove(), 3000);
  }
}

// ===== TESTIMONIAL SLIDER =====
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
setInterval(() => { testiIndex = (testiIndex+1) % testiCards.length; goToTesti(testiIndex); }, 5000);

// ===== FAQ ACCORDION =====
document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    document.querySelectorAll('.faq-item').forEach(i => { if(i!==item) i.classList.remove('open'); });
    item.classList.toggle('open');
  });
});

// ===== NEWSLETTER (demo) =====
document.getElementById('newsletterForm').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Danke für deine Anmeldung! Bitte bestätige die E-Mail in deinem Postfach (Double-Opt-In).');
  e.target.reset();
});

// ===== COOKIE BANNER LOGIC =====
const cookieBanner = document.getElementById('cookieBanner');
const cookieModal = document.getElementById('cookieModal');

if (!localStorage.getItem('cookieConsent')) {
  setTimeout(()=>cookieBanner.classList.add('show'), 800);
}
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