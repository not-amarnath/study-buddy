class AIStudyBuddy {
  constructor() {
    console.log(" AI Study Buddy starting...")
    this.apiKey = "AIzaSyB-X2xaSqorpLpJpTcXSRbH05JiSvDfpFs"
    this.history = JSON.parse(localStorage.getItem("study_history") || "[]")
    this.init()
  }

  init() {
    console.log("AI Study Buddy starting...")
    this.bindEvents()
    this.loadHistory()
    this.showWelcomeMessage()
  }

  showWelcomeMessage() {
    this.showNotification("AI Study Buddy is ready! Ask me anything! 🤖", "success")
  }

  bindEvents() {
    document.getElementById("askButton").addEventListener("click", () => this.askQuestion())
    document.getElementById("questionInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        this.askQuestion()
      }
    })

    // Clear response
    document.getElementById("clearBtn").addEventListener("click", () => this.clearResponse())

    // Example questions
    document.querySelectorAll(".example-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const question = e.target.getAttribute("data-question")
        document.getElementById("questionInput").value = question
        this.askQuestion()
      })
    })
  }

  async askQuestion() {
    const questionInput = document.getElementById("questionInput")
    const question = questionInput.value.trim()

    if (!question) {
      this.showNotification("Please enter a question first! 📝", "error")
      questionInput.focus()
      return
    }

    console.log("📝 Question:", question)

    // Show loading state
    this.setLoadingState(true)

    try {
      const answer = await this.getGeminiAnswer(question)
      console.log("✅ Got answer successfully!")
      this.displayResponse(question, answer)
      this.saveToHistory(question, answer)
      questionInput.value = ""
      this.showNotification("Answer received! 🎉", "success")
    } catch (error) {
      console.error("❌ Error details:", error)
      this.handleError(error)
    } finally {
      this.setLoadingState(false)
    }
  }

  async getGeminiAnswer(question) {
    const subject = document.getElementById("subject").value

    // Create subject-specific prompts
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

    const fullPrompt = `${systemPrompt}

Student's Question: ${question}

Please provide a clear, educational answer that:
1. Explains the concept in simple, easy-to-understand terms
2. Uses examples or analogies when helpful
3. Breaks down complex ideas into smaller, manageable parts
4. Encourages further learning and curiosity

Answer:`

    console.log("🌐 Making API request to Gemini...")

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: fullPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        stopSequences: [],
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    }

    console.log("📤 Request body:", JSON.stringify(requestBody, null, 2))

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + this.apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    )

    console.log("📥 Response status:", response.status)
    console.log("📥 Response headers:", Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ API Error Response:", errorText)

      let errorMessage = "API request failed"
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error?.message || errorMessage
      } catch (e) {
        errorMessage = errorText || errorMessage
      }

      throw new Error(`API Error (${response.status}): ${errorMessage}`)
    }

    const data = await response.json()
    console.log("📥 Full API Response:", JSON.stringify(data, null, 2))

    // Extract the response text
    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!result) {
      console.error("❌ No text in response:", data)
      throw new Error("No response text generated. The AI might have been blocked by safety filters.")
    }

    console.log("✅ Extracted result:", result.substring(0, 100) + "...")
    return result
  }

  handleError(error) {
    console.error("🚨 Handling error:", error)

    let userMessage = "Sorry, there was an error getting your answer."

    if (error.message.includes("API Error")) {
      if (error.message.includes("403")) {
        userMessage = "API key issue. Please check your Gemini API key permissions."
      } else if (error.message.includes("429")) {
        userMessage = "Too many requests. Please wait a moment and try again."
      } else if (error.message.includes("400")) {
        userMessage = "Invalid request. Please try rephrasing your question."
      } else {
        userMessage = `API Error: ${error.message}`
      }
    } else if (error.message.includes("safety filters")) {
      userMessage = "Your question was blocked by safety filters. Please try rephrasing it."
    } else if (error.message.includes("network") || error.message.includes("fetch")) {
      userMessage = "Network error. Please check your internet connection."
    }

    this.showNotification(userMessage, "error")
  }

  displayResponse(question, answer) {
    const responseSection = document.getElementById("responseSection")
    const responseContent = document.getElementById("responseContent")

    responseContent.textContent = answer
    responseSection.style.display = "block"

    // Scroll to response smoothly
    setTimeout(() => {
      responseSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      })
    }, 100)
  }

  clearResponse() {
    const responseSection = document.getElementById("responseSection")
    responseSection.style.display = "none"
  }

  saveToHistory(question, answer) {
    const historyItem = {
      id: Date.now(),
      question: question,
      answer: answer,
      subject: document.getElementById("subject").value,
      timestamp: new Date().toISOString(),
    }

    this.history.unshift(historyItem)

    // Keep only last 20 items
    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20)
    }

    localStorage.setItem("study_history", JSON.stringify(this.history))
    this.loadHistory()
  }

  loadHistory() {
    const historySection = document.getElementById("historySection")
    const historyList = document.getElementById("historyList")

    if (this.history.length === 0) {
      historySection.style.display = "none"
      return
    }

    historySection.style.display = "block"
    historyList.innerHTML = ""

    this.history.slice(0, 10).forEach((item) => {
      const historyItem = document.createElement("div")
      historyItem.className = "history-item"
      historyItem.innerHTML = `
        <div class="history-question">${this.escapeHtml(item.question)}</div>
        <div class="history-time">${this.formatDate(item.timestamp)} • ${this.capitalizeFirst(item.subject)}</div>
      `

      historyItem.addEventListener("click", () => {
        document.getElementById("questionInput").value = item.question
        document.getElementById("subject").value = item.subject
        this.displayResponse(item.question, item.answer)
      })

      historyList.appendChild(historyItem)
    })
  }

  setLoadingState(isLoading) {
    const askButton = document.getElementById("askButton")
    const btnText = askButton.querySelector(".btn-text")
    const btnLoading = askButton.querySelector(".btn-loading")
    const questionInput = document.getElementById("questionInput")

    if (isLoading) {
      btnText.style.display = "none"
      btnLoading.style.display = "flex"
      askButton.disabled = true
      questionInput.disabled = true
    } else {
      btnText.style.display = "block"
      btnLoading.style.display = "none"
      askButton.disabled = false
      questionInput.disabled = false
    }
  }

  showNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll(".notification")
    existingNotifications.forEach((n) => n.remove())

    // Create new notification
    const notification = document.createElement("div")
    notification.className = `notification notification-${type}`
    notification.textContent = message

    // Add animation styles
    notification.style.cssText += `
      animation: slideInRight 0.3s ease-out;
      transform: translateX(0);
    `

    document.body.appendChild(notification)

    // Auto remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = "slideOutRight 0.3s ease-out"
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove()
          }
        }, 300)
      }
    }, 4000)
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

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  escapeHtml(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }
}

// Add CSS animations
const style = document.createElement("style")
style.textContent = `
  @keyframes slideInRight {
    from { 
      transform: translateX(100%); 
      opacity: 0; 
    }
    to { 
      transform: translateX(0); 
      opacity: 1; 
    }
  }
  
  @keyframes slideOutRight {
    from { 
      transform: translateX(0); 
      opacity: 1; 
    }
    to { 
      transform: translateX(100%); 
      opacity: 0; 
    }
  }
`
document.head.appendChild(style)

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("🎯 DOM loaded, initializing AI Study Buddy...")
  new AIStudyBuddy()
})
