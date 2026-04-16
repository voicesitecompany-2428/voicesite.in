import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBQi645FFH2jyUENVTB5nhQfzpfr3ojGpY',
  authDomain: 'voicesite-opt-authentication.firebaseapp.com',
  projectId: 'voicesite-opt-authentication',
  storageBucket: 'voicesite-opt-authentication.firebasestorage.app',
  messagingSenderId: '50797578291',
  appId: '1:50797578291:web:c48a78bc9a0242b825fb46',
  measurementId: 'G-3X884Z41XV',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firebaseAuth = getAuth(app);
