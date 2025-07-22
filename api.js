class AIStudyBuddy {
  constructor() {
    
    this.apiKey = "AIzaSyB-X2xaSqorpLpJpTcXSRbH05JiSvDfpFs" 

    this.history = JSON.parse(localStorage.getItem("study_history") || "[]")
    this.init()
  }

  init() {
    this.bindEvents()
    this.showMainApp() 
    this.loadHistory()
  }

  showMainApp() {
    document.getElementById("apiSetup").style.display = "none"
    document.getElementById("mainApp").style.display = "block"
  }

  bindEvents() {
    // Main app functionality
    document.getElementById("askButton").addEventListener("click", () => this.askQuestion())
    document.getElementById("questionInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.ctrlKey) {
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
      this.showNotification("Please enter a question", "error")
      return
    }

    console.log("Asking question:", question)
    console.log("Using API key:", this.apiKey ? "✅ Key found" : "❌ No key")

    // Show loading state
    this.setLoadingState(true)

    try {
      const answer = await this.getGeminiAnswer(question)
      console.log("Got answer:", answer.substring(0, 100) + "...")
      this.displayResponse(question, answer)
      this.saveToHistory(question, answer)
      questionInput.value = ""
    } catch (error) {
      console.error("Full error:", error)
      this.showNotification(`Error: ${error.message}`, "error")
    } finally {
      this.setLoadingState(false)
    }
  }

  async getGeminiAnswer(question) {
    const subject = document.getElementById("subject").value

    // Create a more detailed prompt based on subject
    let systemPrompt = `You are a helpful, clear, and patient AI tutor. `

    switch (subject) {
      case "math":
        systemPrompt += `You specialize in mathematics. Explain mathematical concepts step-by-step with examples.`
        break
      case "science":
        systemPrompt += `You specialize in science. Use simple analogies and real-world examples to explain scientific concepts.`
        break
      case "programming":
        systemPrompt += `You specialize in programming. Provide clear code examples and explain programming concepts in beginner-friendly terms.`
        break
      case "history":
        systemPrompt += `You specialize in history. Provide context and explain historical events in an engaging way.`
        break
      case "english":
        systemPrompt += `You specialize in English language and literature. Help with grammar, writing, and literary analysis.`
        break
      case "physics":
        systemPrompt += `You specialize in physics. Use analogies and visual descriptions to explain complex physics concepts.`
        break
      case "chemistry":
        systemPrompt += `You specialize in chemistry. Explain chemical processes and reactions in clear, understandable terms.`
        break
      default:
        systemPrompt += `Answer questions across all subjects with clarity and patience.`
    }

    const fullPrompt = `${systemPrompt}

Student's question: ${question}

Please provide a clear, educational answer that:
1. Explains the concept in simple terms
2. Uses examples when helpful
3. Breaks down complex ideas into smaller parts
4. Encourages further learning

Answer:`

    console.log("Making API request...")

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
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
            maxOutputTokens: 1024,
          },
        }),
      },
    )

    console.log("Response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error Response:", errorText)
      throw new Error(`API Error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    console.log("API Response:", data)

    const result = data?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!result) {
      throw new Error("No response generated from AI")
    }

    return result
  }

  displayResponse(question, answer) {
    const responseSection = document.getElementById("responseSection")
    const responseContent = document.getElementById("responseContent")

    responseContent.textContent = answer
    responseSection.style.display = "block"

    // Scroll to response
    responseSection.scrollIntoView({ behavior: "smooth", block: "start" })
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

    // Keep only last 10 items
    if (this.history.length > 10) {
      this.history = this.history.slice(0, 10)
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

    this.history.forEach((item) => {
      const historyItem = document.createElement("div")
      historyItem.className = "history-item"
      historyItem.innerHTML = `
                <div class="history-question">${item.question}</div>
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

    if (isLoading) {
      btnText.style.display = "none"
      btnLoading.style.display = "flex"
      askButton.disabled = true
    } else {
      btnText.style.display = "block"
      btnLoading.style.display = "none"
      askButton.disabled = false
    }
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div")
    notification.className = `notification notification-${type}`
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === "error" ? "#ff4757" : "#2ed573"};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
            font-weight: 500;
        `

    notification.textContent = message
    document.body.appendChild(notification)

    // Add slide-in animation
    const style = document.createElement("style")
    style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `
    document.head.appendChild(style)

    // Remove notification after 3 seconds
    setTimeout(() => {
      notification.style.animation = "slideInRight 0.3s ease-out reverse"
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 3000)
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
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new AIStudyBuddy()
})
