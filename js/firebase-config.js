// ============================================================
//  Firebase Configuration
//  วางค่า config จาก Firebase Console ของคุณที่นี่
//  Project Settings > General > Your apps > Firebase SDK snippet
// ============================================================

const firebaseConfig = {
  apiKey:            "AIzaSyAPI1EgOBsSIFgcrbad1kCFZDsTdeyH0iQ",
  authDomain:        "student1-2569.firebaseapp.com",
  projectId:         "student1-2569",
  storageBucket:     "student1-2569.firebasestorage.app",
  messagingSenderId: "212262979659",
  appId:             "1:212262979659:web:0026cfa83e25ff61b525ce",
  measurementId:     "G-Y8GBC665BQ"
};

// Initialize Firebase
let db = null;
let firebaseReady = false;

function initFirebase() {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    firebaseReady = true;
    console.log("✅ Firebase initialized");
  } catch (e) {
    console.warn("⚠️ Firebase init failed:", e.message);
    firebaseReady = false;
  }
}

// Auto-initialize immediately when this script loads
// (Firebase SDK must be loaded before this file)
initFirebase();

// ============================================================
//  Database Structure (Firestore)
//
//  students/
//    {student_id}/       e.g. "15809"
//      studentId: string
//      no: number
//      name: string
//      class: string
//      grade: string
//
//  scores/
//    {subject_id}/       e.g. "media-m1", "programming-m2", "cs3-m6"
//      students/
//        {student_id}/
//          name: string
//          studentId: string
//          room: string
//          scores/
//            {assignment_id}/
//              title: string
//              score: number
//              maxScore: number
//              type: "exercise" | "quiz" | "exam"
//              submittedAt: timestamp
// ============================================================

const SUBJECTS = {
  "media-m1":       { name: "รู้เท่าทันสื่อ", grade: "ม.1", color: "#7c3aed" },
  "programming-m2": { name: "โปรแกรมเบื้องต้น 1", grade: "ม.2", color: "#059669" },
  "cs3-m6":         { name: "วิทยาการคำนวณ 3", grade: "ม.6", color: "#dc2626" }
};

// ============================================================
//  Score CRUD Functions
// ============================================================

async function saveScore(subjectId, studentData, scoreData) {
  if (!firebaseReady) return { ok: false, error: "Firebase ไม่พร้อมใช้งาน" };
  try {
    const ref = db
      .collection("scores")
      .doc(subjectId)
      .collection("students")
      .doc(studentData.studentId);

    await ref.set({
      name: studentData.name,
      studentId: studentData.studentId,
      room: studentData.room || "",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await ref.collection("scores").add({
      ...scoreData,
      submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function getStudentScores(subjectId, studentId) {
  if (!firebaseReady) return { ok: false, data: [], error: "Firebase ไม่พร้อมใช้งาน" };
  try {
    const snap = await db
      .collection("scores")
      .doc(subjectId)
      .collection("students")
      .doc(studentId)
      .collection("scores")
      .orderBy("submittedAt", "desc")
      .get();

    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { ok: true, data };
  } catch (e) {
    return { ok: false, data: [], error: e.message };
  }
}

async function getAllStudentsScores(subjectId) {
  if (!firebaseReady) return { ok: false, data: [], error: "Firebase ไม่พร้อมใช้งาน" };
  try {
    const studentsSnap = await db
      .collection("scores")
      .doc(subjectId)
      .collection("students")
      .get();

    const data = [];
    for (const studentDoc of studentsSnap.docs) {
      const student = studentDoc.data();
      const scoresSnap = await studentDoc.ref.collection("scores").get();
      const scores = scoresSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const totalScore = scores.reduce((s, x) => s + (x.score || 0), 0);
      const totalMax   = scores.reduce((s, x) => s + (x.maxScore || 0), 0);

      data.push({ ...student, scores, totalScore, totalMax });
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, data: [], error: e.message };
  }
}

// Update an existing score (e.g. after teacher grades a pending submission)
async function updateScore(subjectId, studentId, scoreId, newScore) {
  if (!firebaseReady) return { ok: false, error: "Firebase ไม่พร้อมใช้งาน" };
  try {
    await db
      .collection("scores").doc(subjectId)
      .collection("students").doc(studentId)
      .collection("scores").doc(scoreId)
      .update({
        score: newScore,
        status: 'graded',
        gradedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Get all pending submissions (status == 'pending') across all 3 subjects
async function getPendingSubmissions() {
  if (!firebaseReady) return { ok: false, data: [], error: "Firebase ไม่พร้อมใช้งาน" };
  const subjects = ['media-m1', 'programming-m2', 'cs3-m6'];
  const subjectNames = {
    'media-m1':       '📱 รู้เท่าทันสื่อ ม.1',
    'programming-m2': '💻 โปรแกรมเบื้องต้น ม.2',
    'cs3-m6':         '🖥️ วิทยาการคำนวณ 3 ม.6'
  };
  try {
    const results = [];
    for (const subj of subjects) {
      const stdSnap = await db.collection("scores").doc(subj).collection("students").get();
      for (const stdDoc of stdSnap.docs) {
        const student = stdDoc.data();
        const allSnap = await stdDoc.ref.collection("scores").get();
        // Include: new submissions (status:'pending') OR old submissions saved before
        // the status field was added (score==0, has a note, no status field).
        // The note check excludes auto-graded exercises that legitimately scored 0.
        allSnap.docs.forEach(d => {
          const data = d.data();
          const isPending = data.status === 'pending';
          const isLegacyUngraded = !data.status && data.score === 0 && data.maxScore > 0 && data.note;
          if (!isPending && !isLegacyUngraded) return;
          results.push({
            scoreId:     d.id,
            studentId:   stdDoc.id,
            studentName: student.name  || '',
            room:        student.room  || '',
            subjectId:   subj,
            subjectName: subjectNames[subj],
            ...data
          });
        });
      }
    }
    // Sort: newest first
    results.sort((a, b) => {
      const da = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(0);
      const db2 = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(0);
      return db2 - da;
    });
    return { ok: true, data: results };
  } catch (e) {
    return { ok: false, data: [], error: e.message };
  }
}

async function getSubmissionByTitle(subjectId, studentId, title) {
  if (!firebaseReady) return { ok: false, data: null, error: "Firebase ไม่พร้อมใช้งาน" };
  try {
    const snap = await db
      .collection("scores").doc(subjectId)
      .collection("students").doc(studentId)
      .collection("scores")
      .where("title", "==", title)
      .get();
    if (snap.empty) return { ok: true, data: null };
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => {
      const ta = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(0);
      const tb = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(0);
      return tb - ta;
    });
    return { ok: true, data: docs[0] };
  } catch (e) {
    return { ok: false, data: null, error: e.message };
  }
}

async function editPendingNote(subjectId, studentId, scoreId, newNote) {
  if (!firebaseReady) return { ok: false, error: "Firebase ไม่พร้อมใช้งาน" };
  try {
    await db
      .collection("scores").doc(subjectId)
      .collection("students").doc(studentId)
      .collection("scores").doc(scoreId)
      .update({ note: newNote, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function deleteScore(subjectId, studentId, scoreId) {
  if (!firebaseReady) return { ok: false, error: "Firebase ไม่พร้อมใช้งาน" };
  try {
    await db
      .collection("scores")
      .doc(subjectId)
      .collection("students")
      .doc(studentId)
      .collection("scores")
      .doc(scoreId)
      .delete();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ============================================================
//  Subject Settings (open/close exercises & tests per unit)
// ============================================================

async function getSubjectSettings(subjectId) {
  if (!firebaseReady) return {};
  try {
    const doc = await db.collection('settings').doc(subjectId).get();
    return doc.exists ? doc.data() : {};
  } catch (e) { return {}; }
}

async function saveSubjectSettings(subjectId, updates) {
  if (!firebaseReady) return { ok: false, error: 'Firebase ไม่พร้อมใช้งาน' };
  try {
    await db.collection('settings').doc(subjectId).set(updates, { merge: true });
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

// ============================================================
//  Student Functions
// ============================================================

async function getStudentById(studentId) {
  if (!firebaseReady) return { ok: false, error: "Firebase ไม่พร้อมใช้งาน" };
  try {
    const doc = await db.collection("students").doc(String(studentId)).get();
    if (!doc.exists) return { ok: false, error: "ไม่พบนักเรียน" };
    return { ok: true, data: { id: doc.id, ...doc.data() } };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Upload all students (batch write, max 500 per batch — 442 students fits in one)
async function uploadStudentsToFirestore(studentsData) {
  if (!firebaseReady) return { ok: false, error: "Firebase ไม่พร้อมใช้งาน" };
  try {
    const entries = Object.entries(studentsData);
    const BATCH_SIZE = 490;
    let count = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = entries.slice(i, i + BATCH_SIZE);
      for (const [id, student] of chunk) {
        const ref = db.collection("students").doc(String(id));
        batch.set(ref, { ...student, studentId: String(id) });
        count++;
      }
      await batch.commit();
    }
    return { ok: true, count };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
