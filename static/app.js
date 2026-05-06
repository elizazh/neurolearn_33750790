/* NeuroLearn – app.js */
/* Handles: consent banner, theme application, TTS + line highlighting, focus timer, task management */

// ── Theme / Preferences ──────────────────────────────────────────────────────

function applyPrefs(prefs) {
  document.documentElement.setAttribute('data-theme', prefs.theme_mode || 'default');
  document.documentElement.style.setProperty('--font-size', (prefs.font_size || 16) + 'px');
  document.documentElement.style.setProperty('--line-spacing', prefs.line_spacing || 1.5);
  if (prefs.reduced_motion) {
    document.documentElement.classList.add('reduced-motion');
  } else {
    document.documentElement.classList.remove('reduced-motion');
  }
  try {
    localStorage.setItem('nl_prefs', JSON.stringify(prefs));
  } catch (e) {}
}

// Fetch latest prefs from server and apply (also updates localStorage)
function syncPrefs() {
  fetch('/api/preferences')
    .then(function (r) { return r.json(); })
    .then(function (prefs) { applyPrefs(prefs); })
    .catch(function () {});
}

// ── Consent Banner ───────────────────────────────────────────────────────────

function initConsentBanner() {
  // Only show if localStorage doesn't record prior consent
  var consentGiven = localStorage.getItem('nl_consent') === '1';
  if (consentGiven) return;

  var banner = document.getElementById('consent-banner');
  if (!banner) return;
  banner.style.display = 'block';

  var btnYes = document.getElementById('btn-consent-yes');
  var btnNo  = document.getElementById('btn-consent-no');

  if (btnYes) {
    btnYes.addEventListener('click', function () {
      fetch('/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'consent_given=1'
      })
        .then(function () {
          localStorage.setItem('nl_consent', '1');
          banner.style.display = 'none';
        })
        .catch(function () { banner.style.display = 'none'; });
    });
  }

  if (btnNo) {
    btnNo.addEventListener('click', function () {
      fetch('/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'consent_given=0'
      });
      banner.style.display = 'none';
    });
  }
}

// ── Home – Summarise Form ────────────────────────────────────────────────────

function initSummariseForm() {
  var form = document.getElementById('summarise-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = document.getElementById('notes-input').value.trim();
    if (!text) return;

    var btn = document.getElementById('summarise-btn');
    var status = document.getElementById('summarise-status');
    btn.disabled = true;
    status.textContent = 'Summarising...';

    var body = new URLSearchParams();
    body.append('text', text);

    fetch('/summarise', { method: 'POST', body: body })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error === 'consent_required') {
          status.textContent = 'Please give consent first (see banner above).';
          btn.disabled = false;
          return;
        }
        if (data.error) {
          status.textContent = 'Error: ' + data.error;
          btn.disabled = false;
          return;
        }
        window.location.href = '/reader/' + data.summary_id;
      })
      .catch(function () {
        status.textContent = 'Something went wrong. Please try again.';
        btn.disabled = false;
      });
  });
}

// ── Language detection (Unicode script ranges, no external calls) ─────────────

var SCRIPT_LANGS = [
  { base: 'bn', bcp47: 'bn-BD', re: /[ঀ-৿]/ },  // Bengali
  { base: 'ar', bcp47: 'ar-SA', re: /[؀-ۿ]/ },  // Arabic
  { base: 'hi', bcp47: 'hi-IN', re: /[ऀ-ॿ]/ },  // Hindi / Devanagari
  { base: 'zh', bcp47: 'zh-CN', re: /[一-鿿]/ },  // Chinese
  { base: 'ja', bcp47: 'ja-JP', re: /[぀-ヿ一-鿿]/ }, // Japanese
  { base: 'ko', bcp47: 'ko-KR', re: /[가-퟿]/ },  // Korean
  { base: 'ru', bcp47: 'ru-RU', re: /[Ѐ-ӿ]/ },  // Cyrillic
  { base: 'th', bcp47: 'th-TH', re: /[฀-๿]/ },  // Thai
  { base: 'el', bcp47: 'el-GR', re: /[Ͱ-Ͽ]/ },  // Greek
  { base: 'he', bcp47: 'he-IL', re: /[֐-׿]/ },  // Hebrew
];

function detectLang(text) {
  var counts = {};
  var sample = text.slice(0, 500); // check first 500 chars — fast enough
  for (var i = 0; i < sample.length; i++) {
    var ch = sample[i];
    for (var j = 0; j < SCRIPT_LANGS.length; j++) {
      if (SCRIPT_LANGS[j].re.test(ch)) {
        var b = SCRIPT_LANGS[j].base;
        counts[b] = (counts[b] || 0) + 1;
        break;
      }
    }
  }
  // Must be at least 10% non-Latin to override English default
  var threshold = sample.length * 0.1;
  var best = 'en';
  var bestCount = threshold;
  for (var lang in counts) {
    if (counts[lang] > bestCount) { bestCount = counts[lang]; best = lang; }
  }
  return best;
}

// ── Reader – TTS + Line Highlighting ─────────────────────────────────────────

function initTTS() {
  var linesContainer = document.getElementById('tts-lines');
  if (!linesContainer || typeof SUMMARY_TEXT === 'undefined') return;

  // Parse summary text into displayable lines
  var rawLines = SUMMARY_TEXT.split('\n');
  var displayLines = [];

  rawLines.forEach(function (line) {
    var trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('##')) {
      var heading = document.createElement('div');
      heading.className = 'summary-heading';
      heading.textContent = trimmed.replace(/^#+\s*/, '');
      linesContainer.appendChild(heading);
    } else {
      displayLines.push(trimmed);
      var span = document.createElement('span');
      span.className = 'tts-line';
      span.setAttribute('data-index', displayLines.length - 1);
      span.textContent = trimmed;
      linesContainer.appendChild(span);
    }
  });

  var ttsLines = linesContainer.querySelectorAll('.tts-line');

  // Detect language from the summary text
  var detectedLang = detectLang(SUMMARY_TEXT);
  var detectedBcp47 = 'en-US';
  SCRIPT_LANGS.forEach(function (s) { if (s.base === detectedLang) detectedBcp47 = s.bcp47; });

  // Show detected language to the user
  var langIndicator = document.getElementById('tts-lang-detected');
  if (langIndicator) {
    var langLabel = detectedLang;
    try { langLabel = new Intl.DisplayNames([detectedLang], { type: 'language' }).of(detectedLang); } catch (e) {}
    langIndicator.textContent = 'Detected language: ' + langLabel.charAt(0).toUpperCase() + langLabel.slice(1);
  }

  // Populate voice list once voices load
  var voiceSelect = document.getElementById('tts-voice');
  var voices = [];

  function loadVoices() {
    voices = window.speechSynthesis.getVoices();
    if (!voiceSelect) return;
    voiceSelect.innerHTML = '';

    // One voice per language: keep the first voice seen for each lang code
    var seenLangs = {};
    voices.forEach(function (v, i) {
      var lang = v.lang.split('-')[0];
      if (seenLangs[lang] === undefined) {
        seenLangs[lang] = i;
        var opt = document.createElement('option');
        opt.value = i;
        var label = lang;
        try { label = new Intl.DisplayNames([lang], { type: 'language' }).of(lang); } catch (e) {}
        opt.textContent = label.charAt(0).toUpperCase() + label.slice(1);
        voiceSelect.appendChild(opt);
      }
    });

    // Auto-select voice matching the detected language; fall back to English
    var matchIdx = voices.findIndex(function (v) { return v.lang.startsWith(detectedLang); });
    if (matchIdx >= 0) {
      voiceSelect.value = matchIdx;
    } else {
      // Detected language has no installed voice — add it as a selectable option
      // using only a lang hint so the browser attempts it anyway
      if (detectedLang !== 'en') {
        var detectedLabel = detectedLang;
        try { detectedLabel = new Intl.DisplayNames([detectedLang], { type: 'language' }).of(detectedLang); } catch (e) {}
        detectedLabel = detectedLabel.charAt(0).toUpperCase() + detectedLabel.slice(1);
        var opt = document.createElement('option');
        opt.value = detectedBcp47;   // sentinel: BCP-47 string, not a voice index
        opt.textContent = detectedLabel + ' (no installed voice)';
        voiceSelect.insertBefore(opt, voiceSelect.firstChild);
        voiceSelect.value = detectedBcp47;
      } else {
        var englishIdx = voices.findIndex(function (v) { return v.lang.startsWith('en'); });
        if (englishIdx >= 0) voiceSelect.value = englishIdx;
      }
    }
  }

  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  var currentLineIdx = 0;
  var isPlaying = false;
  var isPaused = false;

  var speedSlider = document.getElementById('tts-speed');
  var speedDisplay = document.getElementById('tts-speed-display');
  if (speedSlider) {
    speedSlider.addEventListener('input', function () {
      speedDisplay.textContent = parseFloat(speedSlider.value).toFixed(1) + 'x';
    });
  }

  function clearHighlights() {
    ttsLines.forEach(function (el) { el.classList.remove('tts-active'); });
  }

  function speakFrom(index) {
    if (index >= displayLines.length) {
      // Finished all lines
      isPlaying = false;
      isPaused = false;
      clearHighlights();
      document.getElementById('tts-play').disabled = false;
      document.getElementById('tts-pause').disabled = true;
      return;
    }

    clearHighlights();
    if (ttsLines[index]) ttsLines[index].classList.add('tts-active');

    var utter = new SpeechSynthesisUtterance(displayLines[index]);
    utter.rate = speedSlider ? parseFloat(speedSlider.value) : 1;
    utter.lang = detectedBcp47; // always hint the language for correct pronunciation

    if (voiceSelect) {
      var val = voiceSelect.value;
      var vIdx = parseInt(val, 10);
      if (!isNaN(vIdx) && voices[vIdx]) {
        utter.voice = voices[vIdx];  // installed voice selected
      }
      // else: val is a BCP-47 sentinel — utter.lang already set above, browser does its best
    }

    utter.onend = function () {
      if (isPlaying && !isPaused) {
        currentLineIdx++;
        speakFrom(currentLineIdx);
      }
    };

    utter.onerror = function () {
      if (isPlaying) {
        currentLineIdx++;
        speakFrom(currentLineIdx);
      }
    };

    window.speechSynthesis.speak(utter);
  }

  var btnPlay  = document.getElementById('tts-play');
  var btnPause = document.getElementById('tts-pause');
  var btnStop  = document.getElementById('tts-stop');

  if (btnPlay) {
    btnPlay.addEventListener('click', function () {
      if (!isPlaying && !isPaused) {
        // Fresh start
        currentLineIdx = 0;
        isPlaying = true;
        isPaused = false;
        window.speechSynthesis.cancel();
        speakFrom(currentLineIdx);
        btnPlay.disabled = true;
        btnPause.disabled = false;
      } else if (isPaused) {
        // Resume
        isPaused = false;
        isPlaying = true;
        window.speechSynthesis.resume();
        btnPlay.disabled = true;
        btnPause.disabled = false;
      }
    });
  }

  if (btnPause) {
    btnPause.addEventListener('click', function () {
      if (isPlaying && !isPaused) {
        isPaused = true;
        isPlaying = false;
        window.speechSynthesis.pause();
        btnPlay.disabled = false;
        btnPause.disabled = true;
      }
    });
  }

  if (btnStop) {
    btnStop.addEventListener('click', function () {
      isPlaying = false;
      isPaused = false;
      currentLineIdx = 0;
      window.speechSynthesis.cancel();
      clearHighlights();
      if (btnPlay) btnPlay.disabled = false;
      if (btnPause) btnPause.disabled = true;
    });
  }
}

// ── Settings page ────────────────────────────────────────────────────────────

function initSettings() {
  var form = document.getElementById('prefs-form');
  if (!form) return;

  var fontSlider    = document.getElementById('font-size-slider');
  var fontVal       = document.getElementById('font-size-val');
  var spacingSlider = document.getElementById('line-spacing-slider');
  var spacingVal    = document.getElementById('line-spacing-val');

  if (fontSlider) {
    fontSlider.addEventListener('input', function () {
      fontVal.textContent = fontSlider.value + 'px';
      document.documentElement.style.setProperty('--font-size', fontSlider.value + 'px');
    });
  }

  if (spacingSlider) {
    spacingSlider.addEventListener('input', function () {
      spacingVal.textContent = parseFloat(spacingSlider.value).toFixed(1);
      document.documentElement.style.setProperty('--line-spacing', spacingSlider.value);
    });
  }

  // Live theme preview on radio change
  form.querySelectorAll('input[name="theme_mode"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      document.documentElement.setAttribute('data-theme', radio.value);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = new FormData(form);
    // Checkbox unchecked is not sent by FormData — handle manually
    if (!form.querySelector('#reduced-motion-check').checked) {
      data.set('reduced_motion', '0');
    }

    var body = new URLSearchParams(data);

    fetch('/settings/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: body
    })
      .then(function (r) { return r.json(); })
      .then(function () {
        var prefs = {
          theme_mode: data.get('theme_mode'),
          font_size: parseInt(data.get('font_size'), 10),
          line_spacing: parseFloat(data.get('line_spacing')),
          reduced_motion: data.get('reduced_motion') === '1'
        };
        applyPrefs(prefs);
        var msg = document.getElementById('prefs-saved-msg');
        if (msg) { msg.style.display = 'inline'; setTimeout(function () { msg.style.display = 'none'; }, 2500); }
      });
  });

  // Delete data button
  var btnDelete = document.getElementById('btn-delete-data');
  if (btnDelete) {
    btnDelete.addEventListener('click', function () {
      if (!confirm('This will permanently delete all your notes, summaries, and focus sessions. Are you sure?')) return;
      fetch('/delete-my-data', { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.ok) {
            localStorage.removeItem('nl_consent');
            var msg = document.getElementById('delete-msg');
            if (msg) msg.style.display = 'block';
            btnDelete.disabled = true;
          }
        });
    });
  }
}

// ── Focus Timer ──────────────────────────────────────────────────────────────

function initFocusTimer() {
  var timerDisplay = document.getElementById('timer-display');
  if (!timerDisplay) return;

  var sessionId = typeof ACTIVE_SESSION_ID !== 'undefined' ? ACTIVE_SESSION_ID : null;
  var durationMinutes = 25;
  var secondsLeft = durationMinutes * 60;
  var timerInterval = null;
  var running = false;

  var btnStart   = document.getElementById('btn-start');
  var btnPause   = document.getElementById('btn-pause');
  var btnReset   = document.getElementById('btn-reset');
  var btnMinus5  = document.getElementById('btn-minus5');
  var btnPlus5   = document.getElementById('btn-plus5');
  var durationLbl = document.getElementById('timer-duration-label');
  var statusEl   = document.getElementById('timer-status');
  var timerSetup = document.getElementById('timer-setup');

  function formatTime(secs) {
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateDisplay() {
    timerDisplay.textContent = formatTime(secondsLeft);
  }

  function setDuration(mins) {
    durationMinutes = Math.max(5, Math.min(120, mins));
    secondsLeft = durationMinutes * 60;
    if (durationLbl) durationLbl.textContent = durationMinutes + ' min';
    updateDisplay();
  }

  if (btnMinus5) btnMinus5.addEventListener('click', function () { if (!running) setDuration(durationMinutes - 5); });
  if (btnPlus5)  btnPlus5.addEventListener('click',  function () { if (!running) setDuration(durationMinutes + 5); });

  if (btnStart) {
    btnStart.addEventListener('click', function () {
      if (running) return;

      // Start a backend session
      var body = new URLSearchParams();
      body.append('duration', durationMinutes);
      fetch('/focus/start', { method: 'POST', body: body })
        .then(function (r) { return r.json(); })
        .then(function (d) { sessionId = d.session_id; });

      running = true;
      btnStart.disabled = true;
      btnPause.disabled = false;
      if (timerSetup) timerSetup.style.display = 'none';
      if (statusEl) statusEl.textContent = 'Focusing...';

      timerInterval = setInterval(function () {
        secondsLeft--;
        updateDisplay();
        if (secondsLeft <= 0) {
          clearInterval(timerInterval);
          running = false;
          timerDisplay.textContent = '00:00';
          if (statusEl) statusEl.textContent = 'Session complete! Take a break.';
          if (btnPause) btnPause.disabled = true;
          if (btnStart) btnStart.disabled = false;
          alert('Timer finished! Well done. Take a break.');
          if (sessionId) {
            var b = new URLSearchParams();
            b.append('session_id', sessionId);
            fetch('/focus/end', { method: 'POST', body: b });
          }
        }
      }, 1000);
    });
  }

  if (btnPause) {
    btnPause.addEventListener('click', function () {
      if (!running) return;
      running = false;
      clearInterval(timerInterval);
      btnPause.disabled = true;
      btnStart.disabled = false;
      if (statusEl) statusEl.textContent = 'Paused.';
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', function () {
      running = false;
      clearInterval(timerInterval);
      setDuration(durationMinutes);
      if (btnStart) btnStart.disabled = false;
      if (btnPause) btnPause.disabled = true;
      if (timerSetup) timerSetup.style.display = 'flex';
      if (statusEl) statusEl.textContent = '';
    });
  }

  // ── Micro-task list ──
  var taskInput  = document.getElementById('task-input');
  var btnAddTask = document.getElementById('btn-add-task');
  var taskList   = document.getElementById('task-list');

  function ensureSession(callback) {
    if (sessionId) { callback(); return; }
    // Auto-create a session if none exists yet
    var body = new URLSearchParams();
    body.append('duration', durationMinutes);
    fetch('/focus/start', { method: 'POST', body: body })
      .then(function (r) { return r.json(); })
      .then(function (d) { sessionId = d.session_id; callback(); });
  }

  function addTaskToDOM(task) {
    var li = document.createElement('li');
    li.className = 'task-item' + (task.is_done ? ' task-done' : '');
    li.setAttribute('data-task-id', task.task_id || task.id);

    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'task-checkbox';
    cb.checked = !!task.is_done;

    var span = document.createElement('span');
    span.className = 'task-title';
    span.textContent = task.title;

    cb.addEventListener('change', function () {
      var body = new URLSearchParams();
      body.append('task_id', li.getAttribute('data-task-id'));
      fetch('/tasks/toggle', { method: 'POST', body: body })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.is_done) {
            li.classList.add('task-done');
          } else {
            li.classList.remove('task-done');
          }
          cb.checked = d.is_done;
        });
    });

    li.appendChild(cb);
    li.appendChild(span);
    if (taskList) taskList.appendChild(li);
  }

  // Wire existing task checkboxes (rendered server-side)
  if (taskList) {
    taskList.querySelectorAll('.task-item').forEach(function (li) {
      var cb = li.querySelector('.task-checkbox');
      if (!cb) return;
      cb.addEventListener('change', function () {
        var body = new URLSearchParams();
        body.append('task_id', li.getAttribute('data-task-id'));
        fetch('/tasks/toggle', { method: 'POST', body: body })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.is_done) { li.classList.add('task-done'); } else { li.classList.remove('task-done'); }
            cb.checked = d.is_done;
          });
      });
    });
  }

  if (btnAddTask) {
    btnAddTask.addEventListener('click', function () {
      var title = taskInput ? taskInput.value.trim() : '';
      if (!title) return;

      ensureSession(function () {
        var body = new URLSearchParams();
        body.append('session_id', sessionId);
        body.append('title', title);
        fetch('/tasks/add', { method: 'POST', body: body })
          .then(function (r) { return r.json(); })
          .then(function (task) {
            if (task.error) return;
            addTaskToDOM(task);
            if (taskInput) taskInput.value = '';
          });
      });
    });

    // Allow pressing Enter in task input
    if (taskInput) {
      taskInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); btnAddTask.click(); }
      });
    }
  }
}

// ── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  syncPrefs();
  initConsentBanner();
  initSummariseForm();
  initTTS();
  initSettings();
  initFocusTimer();
});
