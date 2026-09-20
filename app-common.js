/* ---------------- Firebase init ---------------- */
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// lets bills opened before load a cached copy instantly on flaky connections
try { db.enablePersistence({ synchronizeTabs: true }); } catch (e) { /* multiple tabs open, or unsupported browser — safe to ignore */ }

const BILLS_COLLECTION = "bills";

/* ---------------- shared bill store (used by dashboard + both editors) ---------------- */
const BillStore = {
  /**
   * Save (create or update) a bill.
   * Pass billData.id to update an existing bill; omit it to create a new one.
   * On success, billData.id is set/updated in place and also returned.
   */
  async save(billData) {
    const payload = { ...billData };
    delete payload.id;
    payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

    if (billData.id) {
      await db.collection(BILLS_COLLECTION).doc(billData.id).set(payload, { merge: false });
      return billData.id;
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection(BILLS_COLLECTION).add(payload);
      billData.id = ref.id;
      return ref.id;
    }
  },

  /** Load one bill by id. Returns the bill object (with .id set) or null if not found. */
  async load(id) {
    const snap = await db.collection(BILLS_COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  },

  /** Permanently delete a bill. */
  async delete(id) {
    await db.collection(BILLS_COLLECTION).doc(id).delete();
  },

  /**
   * Live list of every bill, newest-edited first.
   * `cb` is called immediately with the current list, and again automatically
   * whenever a bill is added/edited/deleted — including from another device.
   * Returns an unsubscribe function.
   */
  listenAll(cb, onError) {
    return db.collection(BILLS_COLLECTION)
      .orderBy("updatedAt", "desc")
      .onSnapshot(
        snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => { console.error(err); if (onError) onError(err); }
      );
  }
};
