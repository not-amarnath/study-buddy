// Import Firebase auth for type checking (optional)
// import FirebaseAuth from './firebase.js'

class AIStudyBuddy {
  constructor() {
    this.geminiApiKey = "AIzaSyB-X2xaSqorpLpJpTcXSRbH05JiSvDfpFs"
    this.history = JSON.parse(localStorage.getItem("study_history") || "[]")
    this.currentTheme = localStorage.getItem("theme") || "light"

    this.init()
  }

  init() {
    this.setupTheme()
    this.bindEvents()
    this.setupPasswordToggles()
    this.setupOTPInputs()
    this.loadHistory()

    // Show intro screen initially
    this.showScreen("introScreen")
  }

  setupTheme() {
    document.body.classList.toggle("dark-theme", this.currentTheme === "dark")
    this.updateThemeIcon()
  }

  bindEvents() {
    // Intro screen
    document.getElementById("getStartedBtn").addEventListener("click", () => {
      this.showScreen("authScreen")
    })

    // Auth tabs
    document.querySelectorAll(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this.switchAuthTab(e.target.dataset.tab)
      })
    })

    // Auth forms
    document.getElementById("loginForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleLogin()
    })

    document.getElementById('signupForm').addEventListener('submit', function(e) {
      const btn = this.querySelector('button[type="submit"]');
      btn.classList.add('loading');
      // Optionally, remove loading after async signup completes:
      // setTimeout(() => btn.classList.remove('loading'), 2000);
    });

    // Social auth
    document.getElementById("googleSignInBtn").addEventListener("click", () => {
      this.handleGoogleSignIn()
    })

    document.getElementById("phoneAuthBtn").addEventListener("click", () => {
      this.showPhoneModal()
    })

    // Phone auth modal
    document.getElementById("closePhoneModal").addEventListener("click", () => {
      this.hidePhoneModal()
    })

    document.getElementById("sendOtpBtn").addEventListener("click", () => {
      this.handleSendOTP()
    })

    document.getElementById("verifyOtpBtn").addEventListener("click", () => {
      this.handleVerifyOTP()
    })

    document.getElementById("resendOtpBtn").addEventListener("click", () => {
      this.handleResendOTP()
    })

    // Main app
    document.getElementById("askButton").addEventListener("click", () => {
      this.askQuestion()
    })

    document.getElementById("questionInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        this.askQuestion()
      }
    })

    document.getElementById("clearBtn").addEventListener("click", () => {
      this.clearResponse()
    })

    document.getElementById("clearHistoryBtn").addEventListener("click", () => {
      this.clearHistory()
    })

    // Example questions
    document.querySelectorAll(".example-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const question = e.currentTarget.dataset.question
        document.getElementById("questionInput").value = question
        this.askQuestion()
      })
    })

    // Theme toggle
    document.getElementById("themeToggle").addEventListener("click", () => {
      this.toggleTheme()
    })

    // User menu
    document.getElementById("userMenuBtn").addEventListener("click", () => {
      this.toggleUserMenu()
    })

    document.getElementById("logoutBtn").addEventListener("click", () => {
      this.handleLogout()
    })

    // Close user menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".user-menu")) {
        document.getElementById("userDropdown").classList.remove("active")
      }
    })

    // Close phone modal when clicking outside
    document.getElementById("phoneModal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        this.hidePhoneModal()
      }
    })
  }

  showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active")
    })
    document.getElementById(screenId).classList.add("active")
  }

  // Auth Tab Switching
  switchAuthTab(tab) {
    // Update tab buttons
    document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"))
    document.querySelector(`[data-tab="${tab}"]`).classList.add("active")

    // Update forms
    document.querySelectorAll(".auth-form").forEach((form) => form.classList.remove("active"))
    document.getElementById(`${tab}Form`).classList.add("active")
  }

  // Password Toggle
  setupPasswordToggles() {
    document.querySelectorAll(".password-toggle").forEach((toggle) => {
      toggle.addEventListener("click", (e) => {
        const targetId = e.currentTarget.dataset.target
        const input = document.getElementById(targetId)
        const icon = e.currentTarget.querySelector("i")

        if (input.type === "password") {
          input.type = "text"
          icon.classList.replace("fa-eye", "fa-eye-slash")
        } else {
          input.type = "password"
          icon.classList.replace("fa-eye-slash", "fa-eye")
        }
      })
    })
  }

  // OTP Inputs
  setupOTPInputs() {
    const otpInputs = document.querySelectorAll(".otp-input")
    otpInputs.forEach((input, index) => {
      input.addEventListener("input", (e) => {
        if (e.target.value.length === 1 && index < otpInputs.length - 1) {
          otpInputs[index + 1].focus()
        }
      })

      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && e.target.value === "" && index > 0) {
          otpInputs[index - 1].focus()
        }
      })
    })
  }

  // Authentication Handlers
  async handleLogin() {
    const email = document.getElementById("loginEmail").value.trim()
    const password = document.getElementById("loginPassword").value

    if (!email || !password) {
      showNotification("Please fill in all fields", "error")
      return
    }

    this.setButtonLoading("loginForm", true)

    try {
      // Wait for Firebase to be ready
      await this.waitForFirebase()
      await window.firebaseAuth.signInWithEmail(email, password)
    } catch (error) {
      showNotification(error.message, "error")
    } finally {
      this.setButtonLoading("loginForm", false)
    }
  }

  async handleSignup() {
    const name = document.getElementById("signupName").value.trim()
    const email = document.getElementById("signupEmail").value.trim()
    const password = document.getElementById("signupPassword").value
    const confirmPassword = document.getElementById("confirmPassword").value

    if (!name || !email || !password || !confirmPassword) {
      showNotification("Please fill in all fields", "error")
      return
    }

    if (password !== confirmPassword) {
      showNotification("Passwords do not match", "error")
      return
    }

    if (password.length < 6) {
      showNotification("Password must be at least 6 characters", "error")
      return
    }

    this.setButtonLoading("signupForm", true)

    try {
      // Wait for Firebase to be ready
      await this.waitForFirebase()
      await window.firebaseAuth.signUpWithEmail(email, password, name)
    } catch (error) {
      showNotification(error.message, "error")
    } finally {
      this.setButtonLoading("signupForm", false)
    }
  }

  async handleGoogleSignIn() {
    try {
      // Wait for Firebase to be ready
      await this.waitForFirebase()
      await window.firebaseAuth.signInWithGoogle()
    } catch (error) {
      showNotification(error.message, "error")
    }
  }

  showPhoneModal() {
    document.getElementById("phoneModal").classList.add("active")
    document.getElementById("phoneStep").style.display = "block"
    document.getElementById("otpStep").style.display = "none"
  }

  hidePhoneModal() {
    document.getElementById("phoneModal").classList.remove("active")
  }

  async handleSendOTP() {
    const phoneNumber = document.getElementById("phoneNumber").value.trim()

    if (!phoneNumber) {
      showNotification("Please enter a phone number", "error")
      return
    }

    try {
      // Wait for Firebase to be ready
      await this.waitForFirebase()
      await window.firebaseAuth.sendPhoneOTP(phoneNumber)
      document.getElementById("phoneStep").style.display = "none"
      document.getElementById("otpStep").style.display = "block"
    } catch (error) {
      showNotification(error.message, "error")
    }
  }

  async handleVerifyOTP() {
    const otpInputs = document.querySelectorAll(".otp-input")
    const otp = Array.from(otpInputs)
      .map((input) => input.value)
      .join("")

    if (otp.length !== 6) {
      showNotification("Please enter the complete verification code", "error")
      return
    }

    try {
      // Wait for Firebase to be ready
      await this.waitForFirebase()
      await window.firebaseAuth.verifyPhoneOTP(otp)
      this.hidePhoneModal()
    } catch (error) {
      showNotification(error.message, "error")
    }
  }

  async handleResendOTP() {
    const phoneNumber = document.getElementById("phoneNumber").value.trim()

    try {
      // Wait for Firebase to be ready
      await this.waitForFirebase()
      await window.firebaseAuth.sendPhoneOTP(phoneNumber)
      showNotification("OTP resent successfully!", "success")
    } catch (error) {
      showNotification(error.message, "error")
    }
  }

  async handleLogout() {
    try {
      await window.firebaseAuth.signOut()
      this.showScreen("authScreen")
    } catch (error) {
      showNotification(error.message, "error")
    }
  }

  // Helper function to wait for Firebase to be ready
  async waitForFirebase() {
    let attempts = 0
    const maxAttempts = 50 // 5 seconds max wait

    while (!window.firebaseAuth && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }

    if (!window.firebaseAuth) {
      throw new Error("Firebase authentication is not ready. Please refresh the page.")
    }
  }

  // UI Helpers
  setButtonLoading(formId, isLoading) {
    const form = document.getElementById(formId)
    const button = form.querySelector('button[type="submit"]')
    const btnText = button.querySelector(".btn-text")
    const btnLoading = button.querySelector(".btn-loading")

    if (isLoading) {
      btnText.style.display = "none"
      btnLoading.style.display = "flex"
      button.disabled = true
    } else {
      btnText.style.display = "flex"
      btnLoading.style.display = "none"
      button.disabled = false
    }
  }

  toggleUserMenu() {
    document.getElementById("userDropdown").classList.toggle("active")
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === "light" ? "dark" : "light"
    document.body.classList.toggle("dark-theme", this.currentTheme === "dark")
    localStorage.setItem("theme", this.currentTheme)
    this.updateThemeIcon()
  }

  updateThemeIcon() {
    const icon = document.querySelector("#themeToggle i")
    if (this.currentTheme === "dark") {
      icon.classList.replace("fa-sun", "fa-moon")
    } else {
      icon.classList.replace("fa-moon", "fa-sun")
    }
  }

  // AI Functionality
  async askQuestion() {
    const questionInput = document.getElementById("questionInput")
    const question = questionInput.value.trim()

    if (!question) {
      showNotification("Please enter a question", "error")
      questionInput.focus()
      return
    }

    this.setAskButtonLoading(true)

    try {
      const answer = await this.getGeminiAnswer(question)
      this.displayResponse(question, answer)
      this.saveToHistory(question, answer)
      questionInput.value = ""
      showNotification("Answer received! 🎉", "success")
    } catch (error) {
      console.error("Error:", error)
      showNotification(error.message, "error")
    } finally {
      this.setAskButtonLoading(false)
    }
  }

  async getGeminiAnswer(question) {
    const subject = document.getElementById("subject").value

    const subjectPrompts = {
      math: "You are a mathematics tutor. Explain step-by-step with clear examples and show your work.",
      science: "You are a science teacher. Use simple analogies and real-world examples to explain concepts clearly.",
      programming:
        "You are a coding instructor. Provide clear code examples and explain programming concepts for beginners.",
      history:
        "You are a history teacher. Provide context and explain historical events in an engaging, chronological way.",
      english:
        "You are an English teacher. Help with grammar, writing, and literature analysis with clear explanations.",
      physics: "You are a physics tutor. Use analogies and visual descriptions to explain complex physics concepts.",
      chemistry:
        "You are a chemistry teacher. Explain chemical processes and reactions in clear, understandable terms.",
      general: "You are a helpful tutor. Answer questions clearly and educationally across all subjects.",
    }

    const systemPrompt = subjectPrompts[subject] || subjectPrompts.general
    const fullPrompt = `${systemPrompt}\n\nStudent's Question: ${question}\n\nPlease provide a clear, educational answer that:\n1. Explains the concept in simple, easy-to-understand terms\n2. Uses examples or analogies when helpful\n3. Breaks down complex ideas into smaller, manageable parts\n4. Encourages further learning and curiosity\n\nAnswer:`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!result) {
      throw new Error("No response generated from AI")
    }

    return result
  }

  displayResponse(question, answer) {
    const responseCard = document.getElementById("responseCard")
    const responseContent = document.getElementById("responseContent")

    responseContent.textContent = answer
    responseCard.style.display = "block"

    setTimeout(() => {
      responseCard.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  clearResponse() {
    document.getElementById("responseCard").style.display = "none"
  }

  saveToHistory(question, answer) {
    const historyItem = {
      id: Date.now(),
      question,
      answer,
      subject: document.getElementById("subject").value,
      timestamp: new Date().toISOString(),
    }

    this.history.unshift(historyItem)
    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20)
    }

    localStorage.setItem("study_history", JSON.stringify(this.history))
    this.loadHistory()
  }

  loadHistory() {
    const historyCard = document.getElementById("historyCard")
    const historyList = document.getElementById("historyList")

    if (this.history.length === 0) {
      historyCard.style.display = "none"
      return
    }

    historyCard.style.display = "block"
    historyList.innerHTML = ""

    this.history.slice(0, 10).forEach((item) => {
      const historyItem = document.createElement("div")
      historyItem.className = "history-item"
      historyItem.innerHTML = `
                <div class="history-question">${this.escapeHtml(item.question)}</div>
                <div class="history-meta">
                    <span class="history-subject">${this.capitalizeFirst(item.subject)}</span>
                    <span class="history-time">${this.formatDate(item.timestamp)}</span>
                </div>
            `

      historyItem.addEventListener("click", () => {
        document.getElementById("questionInput").value = item.question
        document.getElementById("subject").value = item.subject
        this.displayResponse(item.question, item.answer)
      })

      historyList.appendChild(historyItem)
    })
  }

  clearHistory() {
    this.history = []
    localStorage.removeItem("study_history")
    this.loadHistory()
    showNotification("History cleared", "info")
  }

  setAskButtonLoading(isLoading) {
    const button = document.getElementById("askButton")
    const btnText = button.querySelector(".btn-text")
    const btnLoading = button.querySelector(".btn-loading")

    if (isLoading) {
      btnText.style.display = "none"
      btnLoading.style.display = "flex"
      button.disabled = true
    } else {
      btnText.style.display = "flex"
      btnLoading.style.display = "none"
      button.disabled = false
    }
  }

  // Utility functions
  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  formatDate(isoString) {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }
}

// Notification System
function showNotification(message, type = "info") {
  const container = document.getElementById("notificationContainer")
  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`

  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    info: "fa-info-circle",
    warning: "fa-exclamation-triangle",
  }

  notification.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `

  notification.querySelector(".notification-close").addEventListener("click", () => {
    notification.remove()
  })

  container.appendChild(notification)

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove()
    }
  }, 5000)
}

// Make showNotification globally available
window.showNotification = showNotification

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  new AIStudyBuddy()
})
