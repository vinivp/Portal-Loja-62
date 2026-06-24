import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function hasRealValue(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (!normalized) return false;
  if (
    lower.includes("cole_sua") ||
    lower.includes("seu-projeto") ||
    /^"?0+"?$/.test(lower) ||
    lower.includes("000000000000")
  ) {
    return false;
  }
  return ![
    "cole_sua_api_key",
    "seu-projeto",
    "seu-projeto.firebaseapp.com",
    "seu-projeto.appspot.com",
    "000000000000",
    "1:000000000000:web:0000000000000000000000",
  ].includes(normalized);
}

export const isFirebaseConfigured = Boolean(
  hasRealValue(firebaseConfig.apiKey) &&
    hasRealValue(firebaseConfig.authDomain) &&
    hasRealValue(firebaseConfig.projectId) &&
    hasRealValue(firebaseConfig.storageBucket) &&
    hasRealValue(firebaseConfig.messagingSenderId) &&
    hasRealValue(firebaseConfig.appId),
);

export const isFirebaseAuthEnabled =
  isFirebaseConfigured && import.meta.env.VITE_FIREBASE_AUTH_ENABLED === "true";

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? initializeApp(firebaseConfig)
  : null;

export const firebaseDb: Firestore | null = firebaseApp
  ? getFirestore(firebaseApp)
  : null;

export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;

export function subscribePortalState<T>(
  onData: (data: T | null) => void,
  onError: (error: Error) => void,
): Unsubscribe | undefined {
  if (!firebaseDb) return undefined;
  return onSnapshot(
    doc(firebaseDb, "portal", "loja62"),
    (snapshot) => onData(snapshot.exists() ? (snapshot.data().state as T) : null),
    onError,
  );
}

export async function savePortalState<T>(state: T) {
  if (!firebaseDb) return;
  await setDoc(
    doc(firebaseDb, "portal", "loja62"),
    {
      state,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function savePortalStatePatch<T extends Record<string, unknown>>(
  state: Partial<T>,
) {
  if (!firebaseDb) return;
  await setDoc(
    doc(firebaseDb, "portal", "loja62"),
    {
      state,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function signInFirebaseUser(email: string, password: string) {
  if (!firebaseAuth) throw new Error("Firebase Auth não está configurado.");
  return signInWithEmailAndPassword(firebaseAuth, email, password);
}

export async function signOutFirebaseUser() {
  if (!firebaseAuth) return;
  await signOut(firebaseAuth);
}

export function subscribeFirebaseAuth(callback: (user: User | null) => void) {
  if (!firebaseAuth) return undefined;
  return onAuthStateChanged(firebaseAuth, callback);
}
