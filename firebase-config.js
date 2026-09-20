/* =========================================================================
   FIREBASE SETUP — do this once, it takes about 3 minutes.

   1) Go to https://console.firebase.google.com  ->  "Add project"  ->
      give it any name  ->  you can turn OFF Google Analytics  ->  Create.

   2) On the project's home screen, click the  </>  (web) icon to
      "Add an app"  ->  give it a nickname  ->  Register app.
      Firebase will show you a `firebaseConfig = { ... }` object.
      Copy those values into the object below (replace the placeholders).

   3) In the left sidebar click "Build" -> "Firestore Database" ->
      "Create database" -> choose a location close to you -> start in
      **test mode** for now (README.md explains how to lock it down later).

   4) Save this file and reload the site. The dashboard should start
      working and any bill you save will now be visible from any device.
   ========================================================================= */

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};
