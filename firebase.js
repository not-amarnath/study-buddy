// Modern Firebase v9+ modular SDK
import { initializeApp } from "firebase/app"
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth"

class FirebaseAuth {
  constructor() {
    this.app = null
    this.auth = null
    this.currentUser = null
    this.isInitialized = false
    this.initializationPromise = null

    // Start initialization immediately
    this.initializationPromise = this.initializeFirebase()
  }

  async initializeFirebase() {
    const firebaseConfig = {
      apiKey: "AIzaSyDzqoKK6ixo00Rrff937ODqbfiKvTYA1M0",
      authDomain: "studdy-buddy-cfe22.firebaseapp.com",
      projectId: "studdy-buddy-cfe22",
      storageBucket: "studdy-buddy-cfe22.firebasestorage.app",
      messagingSenderId: "530884800375",
      appId: "1:530884800375:web:6b6f0c77ba952b51c3fb72",
      measurementId: "G-64C6TKX49M",
    }

    try {
      console.log("Starting Firebase initialization...")

      // Initialize Firebase
      this.app = initializeApp(firebaseConfig)
      console.log("Firebase app initialized")

      // Initialize Firebase Authentication and get a reference to the service
      this.auth = getAuth(this.app)
      console.log("Firebase auth initialized")

      // Setup auth state listener
      this.setupAuthStateListener()

      // Handle redirect results (for Google sign-in)
      await this.handleRedirectResult()

      this.isInitialized = true
      console.log("Firebase initialized successfully with modular SDK")

      return true
    } catch (error) {
      console.error("Firebase initialization error:", error)
      this.isInitialized = false
      throw error
    }
  }

  // Add this new method to ensure Firebase is ready
  async ensureInitialized() {
    if (this.isInitialized) {
      return true
    }

    if (this.initializationPromise) {
      try {
        await this.initializationPromise
        return this.isInitialized
      } catch (error) {
        console.error("Firebase initialization failed:", error)
        throw new Error("Firebase failed to initialize. Please refresh the page and try again.")
      }
    }

    throw new Error("Firebase initialization was not started properly.")
  }

  setupAuthStateListener() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user
      if (user) {
        console.log("User signed in:", user.email)
        this.onAuthSuccess(user)
      } else {
        console.log("User signed out")
        this.onAuthSignOut()
      }
    })
  }

  onAuthSuccess(user) {
    // Update UI with user info
    const userName = user.displayName || user.email || "User"
    const userEmail = user.email || ""

    const userNameEl = document.getElementById("userName")
    const userEmailEl = document.getElementById("userEmail")

    if (userNameEl) userNameEl.textContent = userName
    if (userEmailEl) userEmailEl.textContent = userEmail

    // Show main app
    this.showScreen("mainScreen")

    // Show welcome notification
    if (window.showNotification) {
      window.showNotification(`Welcome back, ${userName}! 👋`, "success")
    }
  }

  onAuthSignOut() {
    // Show auth screen if not on intro
    const introScreen = document.getElementById("introScreen")
    if (introScreen && !introScreen.classList.contains("active")) {
      this.showScreen("authScreen")
    }
  }

  showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active")
    })

    // Show target screen
    const targetScreen = document.getElementById(screenId)
    if (targetScreen) {
      targetScreen.classList.add("active")
    }
  }

  // Email/Password Authentication
  async signUpWithEmail(email, password, name) {
    try {
      await this.ensureInitialized()

      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password)
      const user = userCredential.user

      // Update profile with name
      if (name && user) {
        await updateProfile(user, {
          displayName: name,
        })
      }

      if (window.showNotification) {
        window.showNotification("Account created successfully! 🎉", "success")
      }
      return user
    } catch (error) {
      console.error("Sign up error:", error)
      throw this.handleAuthError(error)
    }
  }

  async signInWithEmail(email, password) {
    try {
      await this.ensureInitialized()

      const userCredential = await signInWithEmailAndPassword(this.auth, email, password)
      return userCredential.user
    } catch (error) {
      console.error("Sign in error:", error)
      throw this.handleAuthError(error)
    }
  }

  // Google Authentication with enhanced debugging
  async signInWithGoogle() {
    try {
      console.log("Starting Google sign-in process...")
      await this.ensureInitialized()

      const provider = new GoogleAuthProvider()
      provider.addScope("profile")
      provider.addScope("email")

      // Add custom parameters for better UX
      provider.setCustomParameters({
        prompt: "select_account",
      })

      console.log("Provider configured, attempting popup...")
      const result = await signInWithPopup(this.auth, provider)
      const user = result.user

      console.log("Google sign-in successful:", user.email)

      if (window.showNotification) {
        window.showNotification(`Welcome ${user.displayName || user.email}! 🎉`, "success")
      }

      return user
    } catch (error) {
      console.error("Google sign in error details:", {
        code: error.code,
        message: error.message,
        customData: error.customData,
      })

      // Handle specific Google auth errors
      if (error.code === "auth/popup-closed-by-user") {
        throw new Error("Sign-in popup was closed. Please try again.")
      } else if (error.code === "auth/cancelled-popup-request") {
        throw new Error("Sign-in was cancelled. Please try again.")
      } else if (error.code === "auth/popup-blocked") {
        throw new Error("Popup was blocked by browser. Please allow popups and try again.")
      } else if (error.code === "auth/unauthorized-domain") {
        throw new Error("This domain is not authorized for Google sign-in. Please contact support.")
      } else if (error.code === "auth/operation-not-allowed") {
        throw new Error("Google sign-in is not enabled. Please contact support.")
      }

      throw this.handleAuthError(error)
    }
  }

  // Add this method after signInWithGoogle
  async signInWithGoogleRedirect() {
    try {
      const { signInWithRedirect, getRedirectResult } = await import("firebase/auth")

      const provider = new GoogleAuthProvider()
      provider.addScope("profile")
      provider.addScope("email")

      await signInWithRedirect(this.auth, provider)
    } catch (error) {
      console.error("Google redirect sign in error:", error)
      throw this.handleAuthError(error)
    }
  }

  // Add this method to handle redirect results
  async handleRedirectResult() {
    try {
      const { getRedirectResult } = await import("firebase/auth")
      const result = await getRedirectResult(this.auth)

      if (result) {
        const user = result.user
        console.log("Google redirect sign-in successful:", user.email)

        if (window.showNotification) {
          window.showNotification(`Welcome ${user.displayName || user.email}! 🎉`, "success")
        }
      }
    } catch (error) {
      console.error("Redirect result error:", error)
      if (window.showNotification) {
        window.showNotification("Google sign-in failed. Please try again.", "error")
      }
    }
  }

  // Sign Out
  async signOut() {
    try {
      await this.ensureInitialized()
      await signOut(this.auth)

      if (window.showNotification) {
        window.showNotification("Signed out successfully! 👋", "info")
      }
    } catch (error) {
      console.error("Sign out error:", error)
      throw this.handleAuthError(error)
    }
  }

  // Error Handling
  handleAuthError(error) {
    const errorMessages = {
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/weak-password": "Password should be at least 6 characters.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/too-many-requests": "Too many failed attempts. Please try again later.",
      "auth/network-request-failed": "Network error. Please check your connection.",
      "auth/popup-closed-by-user": "Sign-in popup was closed.",
      "auth/cancelled-popup-request": "Sign-in was cancelled.",
      "auth/unauthorized-domain": "This domain is not authorized. Please add it to Firebase Console.",
      "auth/invalid-credential": "Invalid credentials. Please check your email and password.",
    }

    const message = errorMessages[error.code] || error.message || "An error occurred during authentication."
    return new Error(message)
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser
  }
}

// Initialize Firebase Auth when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  try {
    window.firebaseAuth = new FirebaseAuth()

    // Wait for initialization to complete
    await window.firebaseAuth.ensureInitialized()

    console.log("Firebase Auth initialized and ready")

    // Dispatch a custom event to notify that Firebase is ready
    window.dispatchEvent(new CustomEvent("firebaseReady"))
  } catch (error) {
    console.error("Failed to initialize Firebase Auth:", error)

    if (window.showNotification) {
      window.showNotification("Failed to initialize authentication. Please refresh the page.", "error")
    }
  }
})

// Export for use in other modules
export default FirebaseAuth
