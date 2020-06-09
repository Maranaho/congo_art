import firebase from 'firebase/app'
import 'firebase/database'

const FIREBASE_KEY = process.env.REACT_APP_API_KEY_FIREBASE
const config = {
  apiKey: FIREBASE_KEY,
  authDomain: "ukroadmap-7e13a.firebaseapp.com",
  databaseURL: "https://ukroadmap-7e13a.firebaseio.com",
  projectId: "ukroadmap-7e13a",
  storageBucket: "ukroadmap-7e13a.appspot.com",
  messagingSenderId: "71337069788"
}

firebase.initializeApp(config)
export default firebase
