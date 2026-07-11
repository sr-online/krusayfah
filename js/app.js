// ============================================================
//  app.js — Shared utilities for all pages
// ============================================================

/* ---------- Mobile menu toggle ---------- */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    hamburger.innerHTML = mobileMenu.classList.contains('open')
      ? '<i class="fas fa-times"></i>'
      : '<i class="fas fa-bars"></i>';
  });

  document.addEventListener('click', e => {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('open');
      hamburger.innerHTML = '<i class="fas fa-bars"></i>';
    }
  });
}

/* ---------- Tab switching ---------- */
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(target);
      if (pane) pane.classList.add('active');
    });
  });
}

/* ---------- Unit accordion ---------- */
function initAccordion() {
  document.querySelectorAll('.unit-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      const isOpen = header.classList.contains('open');

      header.classList.toggle('open', !isOpen);
      if (body) body.classList.toggle('open', !isOpen);
    });
  });
}

/* ---------- Toast notifications ---------- */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 280);
  }, 3000);
}

/* ---------- Score display helpers ---------- */
function getScoreBadgeClass(score, max) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 70) return 'high';
  if (pct >= 50) return 'mid';
  return 'low';
}

function formatDate(timestamp) {
  if (!timestamp) return '-';
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ---------- Score Page Logic ---------- */
function initScorePage(subjectId) {
  const form = document.getElementById('scoreForm');
  const tableBody = document.getElementById('scoreTableBody');
  const loadBtn = document.getElementById('loadScoresBtn');
  const allScoresBtn = document.getElementById('loadAllBtn');

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();

      const studentData = {
        studentId: form.studentId.value.trim(),
        name: form.studentName.value.trim(),
        room: form.room ? form.room.value.trim() : ''
      };

      const scoreData = {
        title: form.scoreTitle.value.trim(),
        score: parseFloat(form.score.value),
        maxScore: parseFloat(form.maxScore.value),
        type: form.scoreType.value,
        note: form.note ? form.note.value.trim() : ''
      };

      if (!studentData.studentId || !studentData.name || !scoreData.title) {
        showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
        return;
      }

      const submitBtn = form.querySelector('[type=submit]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'กำลังบันทึก...';

      const result = await saveScore(subjectId, studentData, scoreData);

      submitBtn.disabled = false;
      submitBtn.textContent = 'บันทึกคะแนน';

      if (result.ok) {
        showToast('บันทึกคะแนนสำเร็จ', 'success');
        form.reset();
      } else {
        showToast(`เกิดข้อผิดพลาด: ${result.error}`, 'error');
      }
    });
  }

  if (loadBtn) {
    loadBtn.addEventListener('click', async () => {
      const sid = document.getElementById('searchStudentId').value.trim();
      if (!sid) { showToast('กรุณาระบุรหัสนักเรียน', 'warning'); return; }

      loadBtn.disabled = true;
      loadBtn.textContent = 'กำลังโหลด...';

      const result = await getStudentScores(subjectId, sid);

      loadBtn.disabled = false;
      loadBtn.textContent = 'ค้นหา';

      if (!result.ok) {
        showToast(`เกิดข้อผิดพลาด: ${result.error}`, 'error');
        return;
      }

      renderScoreTable(result.data, tableBody);
    });
  }

  if (allScoresBtn) {
    allScoresBtn.addEventListener('click', async () => {
      allScoresBtn.disabled = true;
      allScoresBtn.textContent = 'กำลังโหลด...';

      const result = await getAllStudentsScores(subjectId);

      allScoresBtn.disabled = false;
      allScoresBtn.textContent = 'ดูคะแนนทั้งหมด';

      if (!result.ok) {
        showToast(`เกิดข้อผิดพลาด: ${result.error}`, 'error');
        return;
      }

      renderAllStudentsTable(result.data, tableBody);
    });
  }
}

function renderScoreTable(scores, container) {
  if (!container) return;
  if (!scores.length) {
    container.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#64748b"><i class="fas fa-clipboard-list" style="font-size:1.5rem;display:block;margin-bottom:.5rem;opacity:.4"></i>ยังไม่มีคะแนนในรายวิชานี้</td></tr>';
    return;
  }
  container.innerHTML = scores.map((s, i) => {
    const cls = getScoreBadgeClass(s.score, s.maxScore);
    return '<tr>' +
      '<td>' + (i + 1) + '</td>' +
      '<td>' + (s.title || '-') + '</td>' +
      '<td><span class="score-badge ' + cls + '">' + s.score + ' / ' + s.maxScore + '</span></td>' +
      '<td>' + typeLabel(s.type) + '</td>' +
      '<td style="color:#64748b;font-size:.83rem">' + renderNote(s.note) + '</td>' +
      '<td>' + formatDate(s.submittedAt) + '</td>' +
      '</tr>';
  }).join('');
}

/* ---------- Student Score Tab (auto-load from session) ---------- */
async function initStudentScoreTab(subjectId) {
  const headerEl  = document.getElementById('scoreStudentHeader');
  const bodyEl    = document.getElementById('scoreTableBody');
  const summaryEl = document.getElementById('scoreSummary');
  const s = typeof getCurrentStudent === 'function' ? getCurrentStudent() : null;

  if (!s) {
    if (bodyEl) bodyEl.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#dc2626"><i class="fas fa-lock"></i> กรุณา <a href="login.html">เข้าสู่ระบบ</a> ก่อน</td></tr>';
    return;
  }

  if (headerEl) {
    headerEl.innerHTML =
      '<i class="fas fa-user-graduate" style="color:#dc2626"></i> ' +
      '<strong>' + s.name + '</strong>&emsp;' +
      s.class + '&nbsp; เลขที่ ' + s.no + '&emsp;|&emsp; รหัส ' + s.id;
  }

  if (bodyEl) bodyEl.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#64748b"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดคะแนน...</td></tr>';

  if (!firebaseReady) {
    if (bodyEl) bodyEl.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#dc2626"><i class="fas fa-wifi-slash"></i> Firebase ไม่พร้อม</td></tr>';
    return;
  }

  const result = await getStudentScores(subjectId, s.id);
  if (!result.ok) {
    if (bodyEl) bodyEl.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#dc2626">เกิดข้อผิดพลาด: ' + result.error + '</td></tr>';
    return;
  }

  if (summaryEl && result.data.length > 0) {
    const exercises = result.data.filter(function(sc) { return sc.type === 'exercise' || sc.type === 'quiz' || sc.type === 'project'; });
    const tests     = result.data.filter(function(sc) { return sc.type === 'exam'; });
    const exScore   = exercises.reduce(function(a, x) { return a + (x.score || 0); }, 0);
    const exMax     = exercises.reduce(function(a, x) { return a + (x.maxScore || 0); }, 0);
    const tstScore  = tests.reduce(function(a, x) { return a + (x.score || 0); }, 0);
    const tstMax    = tests.reduce(function(a, x) { return a + (x.maxScore || 0); }, 0);
    const tot    = result.data.reduce(function(a, x) { return a + (x.score || 0); }, 0);
    const totMax = result.data.reduce(function(a, x) { return a + (x.maxScore || 0); }, 0);
    const pct = totMax > 0 ? Math.round(tot / totMax * 100) : 0;
    const cls = pct >= 70 ? 'high' : pct >= 50 ? 'mid' : 'low';
    summaryEl.innerHTML =
      (exMax > 0 ? '<span class="summary-chip"><i class="fas fa-pen-to-square"></i> แบบฝึกหัด <span class="score-badge ' + getScoreBadgeClass(exScore, exMax) + '">' + exScore + '/' + exMax + '</span></span>' : '') +
      (tstMax > 0 ? '<span class="summary-chip"><i class="fas fa-file-alt"></i> แบบทดสอบ <span class="score-badge ' + getScoreBadgeClass(tstScore, tstMax) + '">' + tstScore + '/' + tstMax + '</span></span>' : '') +
      '<span class="summary-chip"><i class="fas fa-trophy"></i> รวมทั้งหมด <span class="score-badge ' + cls + '">' + tot + '/' + totMax + ' (' + pct + '%)</span></span>';
    summaryEl.style.display = 'flex';
  }

  renderScoreTable(result.data, bodyEl);
}

function renderAllStudentsTable(students, container) {
  if (!container) return;
  if (!students.length) {
    container.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#64748b">ยังไม่มีข้อมูลนักเรียน</td></tr>`;
    return;
  }

  container.innerHTML = students.map((s, i) => {
    const exercises = (s.scores || []).filter(sc => sc.type === 'exercise' || sc.type === 'quiz' || sc.type === 'project');
    const tests     = (s.scores || []).filter(sc => sc.type === 'exam');
    const exScore   = exercises.reduce((a, b) => a + (b.score || 0), 0);
    const exMax     = exercises.reduce((a, b) => a + (b.maxScore || 0), 0);
    const tstScore  = tests.reduce((a, b) => a + (b.score || 0), 0);
    const tstMax    = tests.reduce((a, b) => a + (b.maxScore || 0), 0);
    const cls = getScoreBadgeClass(s.totalScore, s.totalMax);
    const pct = s.totalMax > 0 ? Math.round((s.totalScore / s.totalMax) * 100) : 0;
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${s.studentId || '-'}</td>
        <td>${s.name || '-'}</td>
        <td>${s.room || '-'}</td>
        <td>${exMax > 0 ? `<span class="score-badge ${getScoreBadgeClass(exScore, exMax)}">${exScore}/${exMax}</span>` : '<span style="color:#94a3b8">—</span>'}</td>
        <td>${tstMax > 0 ? `<span class="score-badge ${getScoreBadgeClass(tstScore, tstMax)}">${tstScore}/${tstMax}</span>` : '<span style="color:#94a3b8">—</span>'}</td>
        <td><span class="score-badge ${cls}">${s.totalScore}/${s.totalMax} (${pct}%)</span></td>
      </tr>`;
  }).join('');
}

function renderNote(note) {
  if (!note) return '-';
  if (note.startsWith('http')) {
    return '<a href="' + note + '" target="_blank" style="color:#2563eb;word-break:break-all">' +
           '<i class="fas fa-external-link-alt" style="font-size:.75rem;margin-right:.3rem"></i>' +
           note.replace(/^https?:\/\//, '') + '</a>';
  }
  return note;
}

function typeLabel(type) {
  const map = { exercise: 'แบบฝึกหัด', quiz: 'แบบทดสอบย่อย', exam: 'สอบ', project: 'โปรเจค' };
  return map[type] || type || '-';
}

/* ---------- HTML escaping (avoid stored XSS when rendering student-submitted code) ---------- */
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------- Code Playground (live HTML preview for practice) ---------- */
// Wires a <textarea id=editorId> to a sandboxed <iframe id=previewId> so students
// see their HTML render instantly. sandbox="allow-same-origin" only — no allow-scripts,
// since this course doesn't teach JS and we don't want submitted/practice code executing.
function initCodePlayground(editorId, previewId, starterCode) {
  const editor = document.getElementById(editorId);
  const preview = document.getElementById(previewId);
  if (!editor || !preview) return;
  preview.setAttribute('sandbox', 'allow-same-origin');
  if (starterCode && !editor.value) editor.value = starterCode;
  const render = () => { preview.srcdoc = editor.value; };
  editor.addEventListener('input', render);
  render();
}

function resetCodePlayground(editorId, previewId, starterCode) {
  const editor = document.getElementById(editorId);
  if (!editor) return;
  editor.value = starterCode || '';
  editor.dispatchEvent(new Event('input'));
}

/* ---------- Generic code-exercise submission (student writes HTML, teacher grades) ---------- */
// opts: { subjectId, title, maxScore, editorId, btnId, msgId, formEl, onDone }
async function submitCodeExercise(opts) {
  const s    = typeof getCurrentStudent === 'function' ? getCurrentStudent() : null;
  const code = document.getElementById(opts.editorId).value;
  const btn  = document.getElementById(opts.btnId);
  const msg  = document.getElementById(opts.msgId);

  msg.style.display = 'none';

  if (!s) {
    msg.style.color = '#dc2626';
    msg.textContent = 'กรุณาเข้าสู่ระบบก่อนส่งงาน';
    msg.style.display = 'block';
    return;
  }
  if (!code || code.trim().length < 15) {
    msg.style.color = '#dc2626';
    msg.textContent = 'กรุณาเขียนโค้ด HTML ก่อนส่งงาน';
    msg.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังส่ง...';

  const editId = opts.formEl.dataset.editScoreId;
  const result = editId
    ? await editPendingNote(opts.subjectId, s.id, editId, code)
    : await saveScore(opts.subjectId,
        { name: s.name, studentId: s.id, room: s.class },
        { title: opts.title, score: 0, maxScore: opts.maxScore, type: 'exercise', status: 'pending', note: code }
      );

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-paper-plane"></i> ส่งงาน';

  if (result.ok) {
    delete opts.formEl.dataset.editScoreId;
    if (opts.onDone) opts.onDone();
  } else {
    msg.style.color = '#dc2626';
    msg.textContent = '❌ เกิดข้อผิดพลาด: ' + result.error;
    msg.style.display = 'block';
  }
}

/* ---------- Work Card State Manager ---------- */
async function setupWorkCard({ subjectId, title, formEl, pendingBoxEl, gradedBoxEl, editBtnEl, noteInputEl, onPending, onGraded }) {
  const s = typeof getCurrentStudent === 'function' ? getCurrentStudent() : null;
  if (!s || !firebaseReady) return;

  const result = await getSubmissionByTitle(subjectId, s.id, title);

  formEl.style.display = '';
  if (pendingBoxEl) pendingBoxEl.style.display = 'none';
  if (gradedBoxEl)  gradedBoxEl.style.display  = 'none';
  delete formEl.dataset.editScoreId;

  if (!result.ok || !result.data) return;

  const sub = result.data;
  formEl.style.display = 'none';

  if (sub.status === 'pending') {
    if (pendingBoxEl) {
      pendingBoxEl.style.display = '';
      if (onPending) onPending(sub);
    }
    if (editBtnEl) {
      editBtnEl.onclick = () => {
        if (pendingBoxEl) pendingBoxEl.style.display = 'none';
        formEl.style.display = '';
        formEl.dataset.editScoreId = sub.id;
        if (noteInputEl) noteInputEl.value = sub.note || '';
      };
    }
  } else {
    if (gradedBoxEl) {
      gradedBoxEl.style.display = '';
      if (onGraded) onGraded(sub);
    }
  }
}

// After setupWorkCard wires an "edit" button to restore a previous submission's
// text into noteInputEl, this also re-renders the code playground preview so it
// reflects the restored code (setupWorkCard only sets .value, no input event).
function wireEditPreview(editBtnId, editorId) {
  const editBtn = document.getElementById(editBtnId);
  if (!editBtn) return;
  const prev = editBtn.onclick;
  editBtn.onclick = function (e) {
    if (prev) prev(e);
    const editor = document.getElementById(editorId);
    if (editor) editor.dispatchEvent(new Event('input'));
  };
}

/* ---------- Init on DOM ready ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initTabs();
  initAccordion();
  if (typeof initFirebase === 'function') initFirebase();
});
