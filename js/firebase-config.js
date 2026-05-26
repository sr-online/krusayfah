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
