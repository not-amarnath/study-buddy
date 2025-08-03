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

  // Phone Authentication - Setup reCAPTCHA with better error handling
  setupRecaptcha(containerId = "recaptcha-container", options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Clear existing verifier
        if (this.recaptchaVerifier) {
          try {
            this.recaptchaVerifier.clear()
          } catch (e) {
            console.log("Error clearing previous reCAPTCHA:", e)
          }
          this.recaptchaVerifier = null
        }

        // Check if container exists
        const container = document.getElementById(containerId)
        if (!container) {
          reject(new Error(`reCAPTCHA container '${containerId}' not found`))
          return
        }

        // Clear container
        container.innerHTML = ""

        // Default options
        const defaultOptions = {
          size: "invisible",
          callback: (response) => {
            console.log("reCAPTCHA solved successfully")
            resolve(response)
          },
          "expired-callback": () => {
            console.log("reCAPTCHA expired")
            if (window.showNotification) {
              window.showNotification("reCAPTCHA expired. Please try again.", "warning")
            }
            this.resetRecaptcha()
          },
          "error-callback": (error) => {
            console.error("reCAPTCHA error:", error)
            if (window.showNotification) {
              window.showNotification("reCAPTCHA error. Please refresh and try again.", "error")
            }
            reject(new Error("reCAPTCHA verification failed"))
          },
        }

        // Merge options
        const recaptchaOptions = { ...defaultOptions, ...options }

        console.log("Setting up reCAPTCHA with options:", recaptchaOptions)

        // Create new RecaptchaVerifier
        this.recaptchaVerifier = new RecaptchaVerifier(this.auth, containerId, recaptchaOptions)

        // For invisible reCAPTCHA, we don't need to render explicitly
        if (recaptchaOptions.size === "invisible") {
          console.log("Invisible reCAPTCHA setup complete")
          resolve(this.recaptchaVerifier)
        } else {
          // For visible reCAPTCHA, render it
          this.recaptchaVerifier
            .render()
            .then((widgetId) => {
              this.recaptchaWidgetId = widgetId
              console.log("Visible reCAPTCHA rendered with widget ID:", widgetId)
              resolve(this.recaptchaVerifier)
            })
            .catch((error) => {
              console.error("reCAPTCHA render error:", error)
              reject(error)
            })
        }
      } catch (error) {
        console.error("reCAPTCHA setup error:", error)
        reject(new Error("Failed to setup reCAPTCHA. Please refresh the page and try again."))
      }
    })
  }

  // Reset reCAPTCHA
  resetRecaptcha() {
    try {
      if (this.recaptchaWidgetId && window.grecaptcha) {
        window.grecaptcha.reset(this.recaptchaWidgetId)
        console.log("reCAPTCHA reset successfully")
      } else if (this.recaptchaVerifier) {
        this.recaptchaVerifier.render().then((widgetId) => {
          if (window.grecaptcha) {
            window.grecaptcha.reset(widgetId)
            console.log("reCAPTCHA reset after render")
          }
        })
      }
    } catch (error) {
      console.error("reCAPTCHA reset error:", error)
    }
  }

  // Format phone number
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "")

    // If it doesn't start with +, add country code
    if (!phoneNumber.startsWith("+")) {
      // Default to US country code if no + is provided
      if (cleaned.length === 10) {
        cleaned = "1" + cleaned // Add US country code
      }
      cleaned = "+" + cleaned
    } else {
      cleaned = phoneNumber
    }

    console.log("Formatted phone number:", cleaned)
    return cleaned
  }

  // Send Phone OTP with comprehensive error handling
  async sendPhoneOTP(phoneNumber) {
    try {
      console.log("Starting phone OTP process...")

      // Format and validate phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber)

      if (formattedPhone.length < 10) {
        throw new Error("Please enter a valid phone number")
      }

      console.log("Sending OTP to:", formattedPhone)

      // Setup reCAPTCHA
      console.log("Setting up reCAPTCHA...")
      await this.setupRecaptcha("recaptcha-container", { size: "invisible" })

      if (!this.recaptchaVerifier) {
        throw new Error("reCAPTCHA setup failed")
      }

      console.log("reCAPTCHA setup successful, sending SMS...")

      // Send SMS
      this.confirmationResult = await signInWithPhoneNumber(this.auth, formattedPhone, this.recaptchaVerifier)

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
      } else if (error.code === "auth/quota-exceeded") {
        throw new Error("SMS quota exceeded. Please try again later.")
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

      console.log("Verifying OTP code...")

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
      console.log("Resending OTP...")

      // Clear previous confirmation result
      this.confirmationResult = null

      // Reset and clear reCAPTCHA
      this.resetRecaptcha()
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

  // Test phone authentication setup
  async testPhoneAuthSetup() {
    try {
      console.log("Testing phone authentication setup...")

      // Check if reCAPTCHA container exists
      const container = document.getElementById("recaptcha-container")
      if (!container) {
        console.error("reCAPTCHA container not found")
        return false
      }

      // Try to setup reCAPTCHA
      await this.setupRecaptcha("recaptcha-container", { size: "invisible" })

      console.log("Phone authentication setup test passed")
      return true
    } catch (error) {
      console.error("Phone authentication setup test failed:", error)
      return false
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

  // Test phone auth setup after a short delay
  setTimeout(() => {
    if (window.firebaseAuth) {
      window.firebaseAuth.testPhoneAuthSetup()
    }
  }, 2000)
})

// Export for use in other modules
export default FirebaseAuth
