import admin from 'firebase-admin';
if(!admin.apps.length){const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;if(!raw)throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');admin.initializeApp({credential:admin.credential.cert(JSON.parse(raw))});}
export const adminDb=admin.firestore(); export const adminAuth=admin.auth();
export async function bearerUser(req){const h=req.headers.authorization||'';if(!h.startsWith('Bearer '))throw new Error('Authentication required.');return adminAuth.verifyIdToken(h.slice(7));}
