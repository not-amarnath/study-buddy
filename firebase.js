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

// Add this helper function before the FirebaseAuth class
function getCurrentDomain() {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "localhost"
  }
  return window.location.hostname
}

// Firebase Configuration and Authentication
class FirebaseAuth {
  constructor() {
    this.app = null
    this.auth = null
    this.currentUser = null
    this.recaptchaVerifier = null
    this.confirmationResult = null
    this.recaptchaWidgetId = null

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

      // Set language code (optional)
      this.auth.languageCode = "en"
      // Or use device language: this.auth.useDeviceLanguage()

      // Log current domain for debugging
      console.log("Current domain:", getCurrentDomain())
      console.log("Auth domain:", firebaseConfig.authDomain)

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

  // Phone Authentication - Setup reCAPTCHA
  setupRecaptcha(containerId = "recaptcha-container", options = {}) {
    try {
      // Clear existing verifier
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear()
        this.recaptchaVerifier = null
      }

      // Default options
      const defaultOptions = {
        size: "invisible",
        callback: (response) => {
          console.log("reCAPTCHA solved, response:", response)
          // reCAPTCHA solved, allow signInWithPhoneNumber
        },
        "expired-callback": () => {
          console.log("reCAPTCHA expired")
          if (window.showNotification) {
            window.showNotification("reCAPTCHA expired. Please try again.", "warning")
          }
          // Reset the reCAPTCHA
          this.resetRecaptcha()
        },
      }

      // Merge options
      const recaptchaOptions = { ...defaultOptions, ...options }

      // Create new RecaptchaVerifier
      this.recaptchaVerifier = new RecaptchaVerifier(this.auth, containerId, recaptchaOptions)

      // Render the reCAPTCHA (for visible reCAPTCHA)
      if (recaptchaOptions.size === "normal") {
        this.recaptchaVerifier
          .render()
          .then((widgetId) => {
            this.recaptchaWidgetId = widgetId
            console.log("reCAPTCHA rendered with widget ID:", widgetId)
          })
          .catch((error) => {
            console.error("reCAPTCHA render error:", error)
          })
      }

      console.log("reCAPTCHA verifier setup complete")
      return this.recaptchaVerifier
    } catch (error) {
      console.error("reCAPTCHA setup error:", error)
      throw new Error("Failed to setup reCAPTCHA. Please refresh the page and try again.")
    }
  }

  // Reset reCAPTCHA
  resetRecaptcha() {
    try {
      if (this.recaptchaWidgetId && window.grecaptcha) {
        window.grecaptcha.reset(this.recaptchaWidgetId)
      } else if (this.recaptchaVerifier) {
        this.recaptchaVerifier.render().then((widgetId) => {
          if (window.grecaptcha) {
            window.grecaptcha.reset(widgetId)
          }
        })
      }
    } catch (error) {
      console.error("reCAPTCHA reset error:", error)
    }
  }

  // Send Phone OTP
  async sendPhoneOTP(phoneNumber) {
    try {
      // Validate phone number format
      if (!phoneNumber.startsWith("+")) {
        throw new Error("Phone number must include country code (e.g., +1234567890)")
      }

      // Setup reCAPTCHA if not already done
      if (!this.recaptchaVerifier) {
        this.setupRecaptcha("recaptcha-container", { size: "invisible" })
      }

      console.log("Sending OTP to:", phoneNumber)

      // Send SMS
      this.confirmationResult = await signInWithPhoneNumber(this.auth, phoneNumber, this.recaptchaVerifier)

      console.log("SMS sent successfully")

      if (window.showNotification) {
        window.showNotification("OTP sent successfully! 📱", "success")
      }

      return true
    } catch (error) {
      console.error("Send OTP error:", error)

      // Reset reCAPTCHA on error
      this.resetRecaptcha()

      // Clear the verifier to force recreation
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear()
        this.recaptchaVerifier = null
      }

      throw this.handleAuthError(error)
    }
  }

  // Verify Phone OTP
  async verifyPhoneOTP(code) {
    try {
      if (!this.confirmationResult) {
        throw new Error("No OTP request found. Please request OTP first.")
      }

      if (!code || code.length !== 6) {
        throw new Error("Please enter a valid 6-digit verification code.")
      }

      console.log("Verifying OTP code:", code)

      // Confirm the SMS code
      const result = await this.confirmationResult.confirm(code)

      console.log("Phone verification successful:", result.user)

      if (window.showNotification) {
        window.showNotification("Phone verified successfully! ✅", "success")
      }

      // Clear confirmation result
      this.confirmationResult = null

      return result.user
    } catch (error) {
      console.error("Verify OTP error:", error)

      // Handle specific verification errors
      if (error.code === "auth/invalid-verification-code") {
        throw new Error("Invalid verification code. Please check and try again.")
      } else if (error.code === "auth/code-expired") {
        throw new Error("Verification code has expired. Please request a new one.")
      }

      throw this.handleAuthError(error)
    }
  }

  // Resend OTP
  async resendPhoneOTP(phoneNumber) {
    try {
      // Clear previous confirmation result
      this.confirmationResult = null

      // Reset and clear reCAPTCHA
      this.resetRecaptcha()
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear()
        this.recaptchaVerifier = null
      }

      // Wait a moment before resending
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Send new OTP
      return await this.sendPhoneOTP(phoneNumber)
    } catch (error) {
      console.error("Resend OTP error:", error)
      throw this.handleAuthError(error)
    }
  }

  // Sign Out
  async signOut() {
    try {
      // Clear reCAPTCHA verifier
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear()
        this.recaptchaVerifier = null
      }

      // Clear confirmation result
      this.confirmationResult = null

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
      "auth/invalid-phone-number": "Please enter a valid phone number with country code (e.g., +1234567890).",
      "auth/invalid-verification-code": "Invalid verification code. Please check and try again.",
      "auth/code-expired": "Verification code has expired. Please request a new one.",
      "auth/quota-exceeded": "SMS quota exceeded. Please try again later.",
      "auth/captcha-check-failed": "reCAPTCHA verification failed. Please try again.",
      "auth/missing-phone-number": "Phone number is required.",
      "auth/missing-verification-code": "Verification code is required.",
      "auth/session-expired": "Session expired. Please try again.",
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

  // Get reCAPTCHA response (for debugging)
  getRecaptchaResponse() {
    if (this.recaptchaWidgetId && window.grecaptcha) {
      return window.grecaptcha.getResponse(this.recaptchaWidgetId)
    }
    return null
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
