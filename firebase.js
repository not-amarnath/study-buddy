// Import Firebase modules (v9+ modular SDK)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js"
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  RecaptchaVerifier,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"

// Firebase Configuration and Authentication
class FirebaseAuth {
  constructor() {
    this.app = null
    this.auth = null
    this.currentUser = null
    this.recaptchaVerifier = null
    this.confirmationResult = null

    this.initializeFirebase()
  }

  initializeFirebase() {
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
      // Initialize Firebase
      this.app = initializeApp(firebaseConfig)
      this.auth = getAuth(this.app)

      // Setup auth state listener
      this.setupAuthStateListener()

      console.log("Firebase initialized successfully")
    } catch (error) {
      console.error("Firebase initialization error:", error)
    }
  }

  setupAuthStateListener() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user
      if (user) {
        console.log("User signed in:", user.email || user.phoneNumber)
        this.onAuthSuccess(user)
      } else {
        console.log("User signed out")
        this.onAuthSignOut()
      }
    })
  }

  onAuthSuccess(user) {
    // Update UI with user info
    const userName = user.displayName || user.email || user.phoneNumber || "User"
    const userEmail = user.email || user.phoneNumber || ""

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
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password)

      // Update profile with name
      if (name && userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name,
        })
      }

      if (window.showNotification) {
        window.showNotification("Account created successfully! 🎉", "success")
      }
      return userCredential.user
    } catch (error) {
      console.error("Sign up error:", error)
      throw this.handleAuthError(error)
    }
  }

  async signInWithEmail(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password)
      return userCredential.user
    } catch (error) {
      console.error("Sign in error:", error)
      throw this.handleAuthError(error)
    }
  }

  // Google Authentication
  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider()

      // Add scopes for additional permissions (optional)
      provider.addScope("profile")
      provider.addScope("email")

      const result = await signInWithPopup(this.auth, provider)

      // This gives you a Google Access Token. You can use it to access the Google API.
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const token = credential?.accessToken

      // The signed-in user info
      const user = result.user

      console.log("Google sign-in successful:", user)
      console.log("Access token:", token)

      return user
    } catch (error) {
      console.error("Google sign in error:", error)

      // Handle specific Google Auth errors
      if (error.code === "auth/popup-closed-by-user") {
        throw new Error("Sign-in popup was closed. Please try again.")
      } else if (error.code === "auth/cancelled-popup-request") {
        throw new Error("Sign-in was cancelled. Please try again.")
      }

      throw this.handleAuthError(error)
    }
  }

  // Phone Authentication
  setupRecaptcha() {
    if (!this.recaptchaVerifier) {
      this.recaptchaVerifier = new RecaptchaVerifier(this.auth, "recaptcha-container", {
        size: "invisible",
        callback: (response) => {
          console.log("reCAPTCHA solved")
        },
        "expired-callback": () => {
          console.log("reCAPTCHA expired")
          this.recaptchaVerifier = null
        },
      })
    }
  }

  async sendPhoneOTP(phoneNumber) {
    try {
      this.setupRecaptcha()
      this.confirmationResult = await signInWithPhoneNumber(this.auth, phoneNumber, this.recaptchaVerifier)

      if (window.showNotification) {
        window.showNotification("OTP sent successfully! 📱", "success")
      }
      return true
    } catch (error) {
      console.error("Send OTP error:", error)
      this.recaptchaVerifier = null
      throw this.handleAuthError(error)
    }
  }

  async verifyPhoneOTP(otp) {
    try {
      if (!this.confirmationResult) {
        throw new Error("No OTP request found. Please request OTP first.")
      }

      const result = await this.confirmationResult.confirm(otp)

      if (window.showNotification) {
        window.showNotification("Phone verified successfully! ✅", "success")
      }
      return result.user
    } catch (error) {
      console.error("Verify OTP error:", error)
      throw this.handleAuthError(error)
    }
  }

  // Sign Out
  async signOut() {
    try {
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
      "auth/invalid-phone-number": "Please enter a valid phone number.",
      "auth/invalid-verification-code": "Invalid verification code.",
      "auth/code-expired": "Verification code has expired.",
      "auth/quota-exceeded": "SMS quota exceeded. Please try again later.",
      "auth/captcha-check-failed": "reCAPTCHA verification failed. Please try again.",
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
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Firebase Auth
  window.firebaseAuth = new FirebaseAuth()
  console.log("Firebase Auth initialized successfully")
})

// Export for use in other modules
export default FirebaseAuth
