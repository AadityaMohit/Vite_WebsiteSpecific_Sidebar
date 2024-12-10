import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAK3UIwUUwLLCGswz9lO90ICDviXmkOD2I",
    authDomain: "testextension-1e32b.firebaseapp.com",
    projectId: "testextension-1e32b",
    storageBucket: "testextension-1e32b.appspot.com",
    messagingSenderId: "736473904434",
    appId: "1:736473904434:web:77259b6327747127b9d32b",
    measurementId: "G-ZY1EZREYB3"
};

 const app = initializeApp(firebaseConfig);
 
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED  
    })
});

export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
