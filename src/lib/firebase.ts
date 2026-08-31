import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const env = import.meta.env

export const configurado = Boolean(
  env.VITE_FIREBASE_API_KEY &&
    env.VITE_FIREBASE_AUTH_DOMAIN &&
    env.VITE_FIREBASE_PROJECT_ID &&
    env.VITE_FIREBASE_APP_ID,
)

const app = initializeApp({
  apiKey: (env.VITE_FIREBASE_API_KEY as string) ?? 'nao-configurado',
  authDomain: (env.VITE_FIREBASE_AUTH_DOMAIN as string) ?? 'nao-configurado',
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string) ?? 'nao-configurado',
  appId: (env.VITE_FIREBASE_APP_ID as string) ?? 'nao-configurado',
})

export const auth = getAuth(app)

// Cache offline: na rua sem sinal, leitura continua funcionando
// (escrita ainda pede conexão — o app espera a confirmação do servidor).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
