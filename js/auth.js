/* ============================================================
   auth.js — Student Session & Auth Guard
   โรงเรียนสหราษฎร์รังสฤษดิ์ | ภาคเรียนที่ 1/2569
   ============================================================ */

const AUTH_KEY = 'srr_student_2569';

const _GRADE_INFO = {
  '1': { name: 'รู้เท่าทันสื่อ',      subjectId: 'media-m1',       page: 'subject-media.html',       color: '#7c3aed', dark: '#4c1d95', icon: 'fa-tv' },
  '2': { name: 'โปรแกรมเบื้องต้น 1',  subjectId: 'programming-m2', page: 'subject-programming.html', color: '#059669', dark: '#065f46', icon: 'fa-code' },
  '6': { name: 'วิทยาการคำนวณ 3',     subjectId: 'cs3-m6',         page: 'subject-cs3.html',         color: '#dc2626', dark: '#991b1b', icon: 'fa-microchip' }
};

/* ---------- Session ---------- */
function getCurrentStudent() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)); }
  catch { return null; }
}

function saveSession(id, studentData) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ id, ...studentData, loginAt: Date.now() }));
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'login.html';
}

function getSubjectInfo(grade) {
  return _GRADE_INFO[grade] || null;
}

/* ---------- Auth guard ---------- */
// Call in <head> of every protected page.
// allowedGrade: '1' | '2' | '6'  or  null = any grade OK
function requireAuth(allowedGrade) {
  const s = getCurrentStudent();
  if (!s) {
    window.location.replace('login.html');
    return null;
  }
  if (allowedGrade && s.grade !== allowedGrade) {
    document.addEventListener('DOMContentLoaded', function () { _showGradeMismatch(s); });
    return null;
  }
  document.addEventListener('DOMContentLoaded', function () { _injectStudentChip(s); });
  return s;
}

/* ---------- Grade mismatch overlay ---------- */
function _showGradeMismatch(student) {
  const info = _GRADE_INFO[student.grade];
  const overlay = document.createElement('div');
  overlay.id = 'gradeMismatchOverlay';
  overlay.innerHTML =
    '<div style="text-align:center;max-width:420px;padding:2rem">' +
      '<div style="font-size:3.5rem;margin-bottom:1rem">🚫</div>' +
      '<h2 style="color:#dc2626;font-size:1.4rem;margin:0 0 .5rem">ไม่มีสิทธิ์เข้าถึงเนื้อหานี้</h2>' +
      '<p style="color:#475569;margin:.4rem 0">สวัสดี <strong>' + student.name + '</strong></p>' +
      '<p style="color:#64748b;font-size:.9rem;margin:.4rem 0 1.5rem">' +
        'เนื้อหานี้ไม่ใช่วิชาของ <strong>' + student.class + '</strong><br>' +
        (info ? 'วิชาของคุณคือ <strong>' + info.name + '</strong>' : '') +
      '</p>' +
      (info
        ? '<a href="' + info.page + '" style="display:inline-block;background:' + info.color + ';color:#fff;' +
          'padding:.75rem 2rem;border-radius:10px;text-decoration:none;font-weight:700;margin-bottom:.75rem">' +
          '<i class="fas ' + info.icon + '"></i> ไปยังวิชาของฉัน</a><br>'
        : '') +
      '<a href="home.html" style="display:inline-block;color:#64748b;padding:.5rem 1rem;font-size:.9rem;text-decoration:none">' +
        '<i class="fas fa-house"></i> กลับหน้าหลักนักเรียน</a>' +
    '</div>';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: '#fff',
    zIndex: '9999', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: 'Sarabun, sans-serif'
  });
  document.body.appendChild(overlay);
}

/* ---------- Teacher Auth ---------- */
const TEACHER_PIN = 'ครู2569';   // ← เปลี่ยนรหัสครูได้ที่นี่
const TEACHER_KEY = 'srr_teacher_2569';

function isTeacherLoggedIn() {
  const t = sessionStorage.getItem(TEACHER_KEY);
  if (!t) return false;
  return (Date.now() - parseInt(t, 10)) < 8 * 60 * 60 * 1000; // 8 ชั่วโมง
}

function teacherLogin(pin) {
  if (pin === TEACHER_PIN) {
    sessionStorage.setItem(TEACHER_KEY, Date.now().toString());
    return true;
  }
  return false;
}

function teacherLogout() {
  sessionStorage.removeItem(TEACHER_KEY);
  window.location.href = 'index.html';
}

function requireTeacherAuth() {
  if (isTeacherLoggedIn()) return true;
  document.addEventListener('DOMContentLoaded', function () { _showTeacherPin(); });
  return false;
}

function _showTeacherPin() {
  const overlay = document.createElement('div');
  overlay.id = 'teacherPinOverlay';
  overlay.innerHTML =
    '<div style="text-align:center;max-width:360px;padding:2rem">' +
      '<div style="font-size:3rem;margin-bottom:1rem">🔐</div>' +
      '<h2 style="color:white;font-size:1.4rem;margin:0 0 .4rem">Dashboard ครู</h2>' +
      '<p style="color:rgba(255,255,255,.7);font-size:.9rem;margin:0 0 1.5rem">สำหรับครูผู้สอนเท่านั้น</p>' +
      '<input id="teacherPinInput" type="password" maxlength="20" placeholder="รหัสครู"' +
        ' style="width:100%;padding:.75rem;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);' +
        'color:white;border-radius:10px;font-family:inherit;font-size:1rem;text-align:center;box-sizing:border-box;' +
        'margin-bottom:.75rem;outline:none" ' +
        'onkeydown="if(event.key===\'Enter\')_doTeacherLogin()">' +
      '<button onclick="_doTeacherLogin()"' +
        ' style="width:100%;padding:.75rem;background:#1e40af;color:white;border:none;border-radius:10px;' +
        'font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;margin-bottom:.5rem">' +
        '<i class="fas fa-key"></i> เข้าสู่ระบบครู</button>' +
      '<p id="teacherPinErr" style="color:#f87171;font-size:.88rem;min-height:1.2rem;margin:.3rem 0 0"></p>' +
      '<div style="margin-top:1.5rem;display:flex;gap:1rem;justify-content:center">' +
        '<a href="index.html" style="color:rgba(255,255,255,.5);font-size:.85rem;text-decoration:none">← กลับหน้าหลัก</a>' +
        '<a href="login.html" style="color:rgba(255,255,255,.5);font-size:.85rem;text-decoration:none">เข้าสู่ระบบนักเรียน</a>' +
      '</div>' +
    '</div>';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'linear-gradient(135deg,#0f172a,#1e3a8a)',
    zIndex: '9999', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Sarabun, sans-serif'
  });
  document.body.appendChild(overlay);
  setTimeout(function() {
    var inp = document.getElementById('teacherPinInput');
    if (inp) inp.focus();
  }, 100);
}

function _doTeacherLogin() {
  var pin = (document.getElementById('teacherPinInput') || {}).value || '';
  var errEl = document.getElementById('teacherPinErr');
  if (teacherLogin(pin)) {
    var overlay = document.getElementById('teacherPinOverlay');
    if (overlay) overlay.style.display = 'none';
  } else {
    if (errEl) errEl.textContent = 'รหัสไม่ถูกต้อง กรุณาลองใหม่';
  }
}

/* ---------- Navbar student chip ---------- */
function _injectStudentChip(student) {
  const navbar = document.querySelector('.navbar-inner');
  if (!navbar) return;
  const shortName = student.name.replace(/^(นาย|นางสาว|นาง|เด็กชาย|เด็กหญิง)\s*/, '');
  const info = _GRADE_INFO[student.grade];
  const chip = document.createElement('div');
  chip.className = 'student-chip';
  chip.innerHTML =
    '<a href="home.html" class="chip-profile">' +
      '<div class="chip-avatar" style="background:' + (info ? info.color : '#64748b') + '">' +
        '<i class="fas fa-user-graduate"></i>' +
      '</div>' +
      '<div class="chip-info">' +
        '<span class="chip-name">' + shortName + '</span>' +
        '<span class="chip-class">' + student.class + '</span>' +
      '</div>' +
    '</a>' +
    '<button class="chip-logout" onclick="logout()" title="ออกจากระบบ">' +
      '<i class="fas fa-right-from-bracket"></i>' +
    '</button>';
  navbar.appendChild(chip);
}
