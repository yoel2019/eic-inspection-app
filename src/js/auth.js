import { auth, googleProvider, db } from './firebase-config.js';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureUserInDb(result.user);
    return result.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
}

export async function signInWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserInDb(result.user);
    return result.user;
  } catch (error) {
    console.error('Email sign in error:', error);
    throw error;
  }
}

export async function createUserWithEmail(email, password, role = 'employee') {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await ensureUserInDb(result.user, role);
    return result.user;
  } catch (error) {
    console.error('User creation error:', error);
    throw error;
  }
}

export function signOutUser() {
  return signOut(auth);
}

async function ensureUserInDb(user, defaultRole = null) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Determine role: first user or specific email is admin, others are employees
      let role = defaultRole;
      if (!role) {
        role = (user.email === "yoellaya@gmail.com" || user.email === "admin@eic.com") ? "admin" : "employee";
      }

      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        role: role,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    } else {
      // Update last login
      await setDoc(userRef, {
        lastLogin: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error ensuring user in database:', error);
  }
}