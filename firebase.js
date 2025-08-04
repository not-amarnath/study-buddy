// Hybrid Firebase setup - using both compat and modular SDK for better reliability
import firebase from "firebase/compat/app"
import "firebase/compat/auth"
import "firebase/compat/firestore"

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
    // Your original Firebase config
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
      // Check if Firebase is already initialized
      if (!firebase.apps.length) {
        // Initialize Firebase using compat SDK
        firebase.initializeApp(firebaseConfig)
      }

      this.auth = firebase.auth()
      this.auth.languageCode = "en"

      // Setup auth state listener
      this.setupAuthStateListener()

      console.log("Firebase initialized successfully with compat SDK")
    } catch (error) {
      console.error("Firebase initialization error:", error)
    }
  }

  setupAuthStateListener() {
    this.auth.onAuthStateChanged((user) => {
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
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password)

      // Update profile with name
      if (name && userCredential.user) {
        await userCredential.user.updateProfile({
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
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password)
      return userCredential.user
    } catch (error) {
      console.error("Sign in error:", error)
      throw this.handleAuthError(error)
    }
  }

  // Google Authentication
  async signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider()
      provider.addScope("profile")
      provider.addScope("email")

      const result = await this.auth.signInWithPopup(provider)
      const user = result.user

      console.log("Google sign-in successful:", user)
      return user
    } catch (error) {
      console.error("Google sign in error:", error)

      if (error.code === "auth/popup-closed-by-user") {
        throw new Error("Sign-in popup was closed. Please try again.")
      } else if (error.code === "auth/cancelled-popup-request") {
        throw new Error("Sign-in was cancelled. Please try again.")
      }

      throw this.handleAuthError(error)
    }
  }

  // Phone Authentication - Setup reCAPTCHA (based on your working code)
  setupRecaptcha() {
    try {
      // Clear existing verifier
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear()
        this.recaptchaVerifier = null
      }

      // Clear the container
      const container = document.getElementById("recaptcha-container")
      if (container) {
        container.innerHTML = ""
      }

      console.log("Setting up reCAPTCHA...")

      // Create new RecaptchaVerifier using compat SDK
      this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
        size: "invisible",
        callback: (response) => {
          console.log("reCAPTCHA solved successfully")
        },
        "expired-callback": () => {
          console.log("reCAPTCHA expired")
          if (window.showNotification) {
            window.showNotification("reCAPTCHA expired. Please try again.", "warning")
          }
        },
        "error-callback": (error) => {
          console.error("reCAPTCHA error:", error)
          if (window.showNotification) {
            window.showNotification("reCAPTCHA error. Please try again.", "error")
          }
        },
      })

      // Render the reCAPTCHA
      return this.recaptchaVerifier.render().then((widgetId) => {
        this.recaptchaWidgetId = widgetId
        console.log("reCAPTCHA rendered successfully with widget ID:", widgetId)
        return this.recaptchaVerifier
      })
    } catch (error) {
      console.error("reCAPTCHA setup error:", error)
      throw new Error("Failed to setup reCAPTCHA. Please refresh and try again.")
    }
  }

  // Format phone number
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, "")

    // If it doesn't start with +, add country code
    if (!cleaned.startsWith("+")) {
      // Default to US country code if no + is provided
      if (cleaned.length === 10) {
        cleaned = "+1" + cleaned
      } else {
        cleaned = "+" + cleaned
      }
    }

    console.log("Formatted phone number:", cleaned)
    return cleaned
  }

  // Send Phone OTP (based on your working phoneAuth function)
  async sendPhoneOTP(phoneNumber) {
    try {
      console.log("Starting phone OTP process...")

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber)

      if (formattedPhone.length < 10) {
        throw new Error("Please enter a valid phone number")
      }

      console.log("Sending OTP to:", formattedPhone)

      // Setup reCAPTCHA
      await this.setupRecaptcha()

      if (!this.recaptchaVerifier) {
        throw new Error("reCAPTCHA setup failed")
      }

      console.log("reCAPTCHA setup successful, sending SMS...")

      // Send SMS using compat SDK (similar to your working code)
      this.confirmationResult = await this.auth.signInWithPhoneNumber(formattedPhone, this.recaptchaVerifier)

      console.log("OTP Sent successfully")

      if (window.showNotification) {
        window.showNotification("OTP sent successfully! 📱", "success")
      }

      return true
    } catch (error) {
      console.error("Send OTP error:", error)

      // Clear reCAPTCHA on error
      if (this.recaptchaVerifier) {
        try {
          this.recaptchaVerifier.clear()
        } catch (e) {
          console.log("Error clearing reCAPTCHA:", e)
        }
        this.recaptchaVerifier = null
      }

      // Handle specific errors
      if (error.code === "auth/invalid-phone-number") {
        throw new Error("Invalid phone number format. Please include country code (e.g., +1234567890)")
      } else if (error.code === "auth/too-many-requests") {
        throw new Error("Too many requests. Please try again later.")
      }

      throw this.handleAuthError(error)
    }
  }

  // Verify Phone OTP (based on your working codeverify function)
  async verifyPhoneOTP(code) {
    try {
      if (!this.confirmationResult) {
        throw new Error("No OTP request found. Please request OTP first.")
      }

      if (!code || code.length !== 6) {
        throw new Error("Please enter a valid 6-digit verification code.")
      }

      console.log("Verifying OTP code...")

      // Confirm the SMS code (similar to your working code)
      const result = await this.confirmationResult.confirm(code)

      console.log("OTP Verified successfully")

      if (window.showNotification) {
        window.showNotification("Phone verified successfully! ✅", "success")
      }

      // Clear confirmation result
      this.confirmationResult = null

      return result.user
    } catch (error) {
      console.error("Verify OTP error:", error)

      if (error.code === "auth/invalid-verification-code") {
        console.log("OTP Not correct")
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
      console.log("Resending OTP...")

      // Clear previous confirmation result
      this.confirmationResult = null

      // Clear reCAPTCHA
      if (this.recaptchaVerifier) {
        try {
          this.recaptchaVerifier.clear()
        } catch (e) {
          console.log("Error clearing reCAPTCHA:", e)
        }
        this.recaptchaVerifier = null
      }

      // Wait a moment before resending
      await new Promise((resolve) => setTimeout(resolve, 2000))

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
        try {
          this.recaptchaVerifier.clear()
        } catch (e) {
          console.log("Error clearing reCAPTCHA:", e)
        }
        this.recaptchaVerifier = null
      }

      // Clear confirmation result
      this.confirmationResult = null

      await this.auth.signOut()

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
      "auth/unauthorized-domain": "This domain is not authorized. Please add it to Firebase Console.",
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
  // Wait for Firebase compat SDK to load
  if (typeof firebase !== "undefined") {
    window.firebaseAuth = new FirebaseAuth()
    console.log("Firebase Auth initialized successfully with compat SDK")
  } else {
    console.error("Firebase compat SDK not loaded")
  }
})

// Export for use in other modules
export default FirebaseAuth
