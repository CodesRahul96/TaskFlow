const { GoogleGenerativeAI } = require("@google/generative-ai");
const Task = require("../models/Task");

/**
 * AI Orchestration Controller
 * Manages the "Neural Gateway" providing both deterministic (KB-based) 
 * and generative (Gemini-based) intelligence for the workspace.
 */

/**
 * Neural Knowledge Matrix
 * High-precision deterministic Knowledge Base (KB) for critical system procedures.
 * Intercepts common queries to provide zero-latency, secure responses.
 */
const NEURAL_MATRIX = [
    {
        keywords: ["magic link", "login link", "expired", "not working"],
        category: "IDENTITY_ACCESS",
        answer: "Magic links are single-use tokens sent to your email. They expire after 1 hour for your protection. If your link is non-functional, please request a new one from the authentication portal."
    },
    {
        keywords: ["mfa", "2fa", "verification code", "speakeasy", "otp"],
        category: "IDENTITY_ACCESS",
        answer: "taskflow utilizes TOTP-powered MFA. You'll need an authenticator app (like Google Authenticator) to sync your secure vault."
    },
    {
        keywords: ["captcha", "recaptcha", "human", "verification"],
        category: "IDENTITY_ACCESS",
        answer: "We utilize reCAPTCHA v3 to protect the workspace from automated agents while maintaining a frictionless experience for human operators."
    },
    {
        keywords: ["can i delete", "remove task", "delete task", "delete", "remove", "permission"],
        category: "COLLABORATION_PHYSICS",
        answer: "Permission Logic: Only the original 'Owner' can permanently delete a task. Collaborators are presented with a 'Leave Task' option to ensure data integrity for the rest of the team."
    },
    {
        keywords: ["invite", "share", "friend", "collab", "team"],
        category: "COLLABORATION_PHYSICS",
        answer: "Initialize collaboration by generating a secure invite token via the 'Share' interface. Once clicked, teammates are synchronized into the task node instantly."
    },
    {
        keywords: ["sync", "websocket", "real time", "refresh"],
        category: "WORKSPACE_PHYSICS",
        answer: "taskflow uses state-of-the-art WebSocket synchronization. State transitions are broadcasted across all active nodes in under 50ms."
    },
    {
        keywords: ["guest", "local", "register", "persistence"],
        category: "DATA_INTEGRITY",
        answer: "The 'Neural Lift' protocol: Anonymous data stored in guest mode is automatically synchronized with your cloud vault upon registration."
    },
    {
        keywords: ["audit", "history", "log", "who did"],
        category: "DATA_INTEGRITY",
        answer: "The 'Audit Ledger' provides a tamper-proof record of every operation in the workspace, ensuring total accountability for collaborative projects."
    },
    {
        keywords: ["subtask", "breakdown", "action item"],
        category: "TASK_DECOMPOSITION",
        answer: "Subtasks facilitate granular decomposition. Parent progress bars reflect completion status across all team nodes in real-time."
    },
    {
        keywords: ["priority", "critical", "urgent", "low"],
        category: "TASK_PRIORITISATION",
        answer: "taskflow supports 4 priority tiers: Urgent (Critical Node), High, Medium, and Low. Urgent tasks are highlighted for immediate attention."
    },
    {
        keywords: ["calendar", "schedule", "time block"],
        category: "SCHEDULING_ENGINE",
        answer: "The scheduling engine utilizes 'Time-Blocks'. Reserve specific slots to prevent overlapping engagements and visualize your daily throughput."
    },
    {
        keywords: ["create", "new task", "add task", "how to"],
        category: "TASK_MANAGEMENT",
        answer: "Initiate task creation via the '+' interface. Set deadlines and priorities to ensure optimal tracking within your workflow."
    },
    {
        keywords: ["joke", "funny", "laugh", "bored"],
        category: "ENTERTAINMENT_PROTOCOL",
        answer: "Dev Note: Why do programmers prefer dark mode? Because light attracts bugs. | Why did the script go to therapy? It had too many dependency issues."
    },
    {
        keywords: ["pomodoro", "productivity tip", "focus", "deep work"],
        category: "PRODUCTIVITY_SCIENCE",
        answer: "Recommendation: Utilize 25-minute 'Deep Work' sprints with 5-minute 'Neural Reset' breaks to maintain optimal focus levels."
    },
    {
        keywords: ["who built", "who made", "vaishnavi", "engineer"],
        category: "SYSTEM_CREDITS",
        answer: "taskflow is an industrial-grade workspace engineered by Vaishnavi. It was built for high-performance teams who demand secure, real-time synchronization."
    },
    {
        keywords: ["hi", "hello", "hey", "who are you"],
        category: "SYSTEM_GREETING",
        answer: "Greetings, Operator. I am the taskflow AI Companion. I am currently synchronizing your workspace node. How can I assist your productivity today?"
    },
    {
        keywords: ["safe", "security", "hack", "data", "private", "encrypted"],
        category: "SECURITY_VAULT",
        answer: "taskflow is hardened with industrial security: Bcrypt identity encryption, Helmet header-armor, and strict CSP protocols protecting every node."
    },
    {
        keywords: ["offline", "no internet", "disconnected", "local"],
        category: "RESILIENCE_MODE",
        answer: "Local Resilience active: Changes are cached in your browser during connectivity drops and merged automatically via the Multi-Node Sync engine upon reconnection."
    },
    {
        keywords: ["change password", "reset password", "forgot"],
        category: "IDENTITY_MANAGEMENT",
        answer: "Security Protocol: Reset passwords via the settings module. Use the Magic Link gateway for one-click identity verification if credentials are lost."
    },
    {
        keywords: ["export", "download", "csv", "json", "save data"],
        category: "DATA_PORTABILITY",
        answer: "Data Portability: Export your entire task history in structured JSON format via the command center (Settings)."
    },
    {
        keywords: ["two people", "simultaneous", "collision", "edit same"],
        category: "COLLABORATION_PHYSICS",
        answer: "Collision Avoidance: taskflow uses atomic Mongoose updates and <50ms WebSocket broadcasting to ensure data integrity during simultaneous operations."
    },
    {
        keywords: ["can i see", "see other", "privacy", "anyone else"],
        category: "PRIVACY_PROTOCOL",
        answer: "Privacy Policy: Your tasks are isolated. No other node can access your data unless you explicitly authorize them via an invitation token."
    },
    {
        keywords: ["recover", "undo delete", "restoring", "mistake"],
        category: "DATA_LIFECYCLE",
        answer: "Warning: Task deletion is a terminal operation. History can be reviewed in the Audit Ledger, but purged nodes cannot be restored for security reasons."
    },
    {
        keywords: ["cost", "price", "free", "premium", "plans", "subscription"],
        category: "SYSTEM_EDITIONS",
        answer: "taskflow is an open-standard productivity workspace. The core collaborative and AI engines are available for all high-performance operators."
    }
];

/**
 * Main AI Interaction Node
 * Orchestrates the transition between Knowledge Matrix and Generative reasoning.
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Interaction payload (message, history)
 * @param {Object} res - Express response object
 */
exports.chatWithAI = async (req, res) => {
  try {
    const { message, history } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const lowerMsg = message.toLowerCase();

    // Strategy 1: Identity/Neural Recognition
    if (lowerMsg.includes('my name') || lowerMsg.includes('who am i')) {
        return res.json({
            content: `🤖 **Neural Synergy** | *IDENTITY VERIFIED*\n\nYou are **Operative ${req.user.name}**. Your neural signature is verified and you are currently synchronized with the taskflow node.`
        });
    }

    // Strategy 2: Deterministic Knowledge Matrix Interception
    const matchedKB = NEURAL_MATRIX.find(item => 
        item.keywords.some(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b|${keyword}`, 'i');
            return regex.test(lowerMsg);
        })
    );

    if (matchedKB) {
        const categoryTitle = matchedKB.category.replace(/_/g, ' ');
        return res.json({ 
            content: `🤖 **Neural Synergy** | *${categoryTitle}*\n\n${matchedKB.answer}` 
        });
    }

    // Task-specific catch-all (Fuzzy Logic)
    if (lowerMsg.includes('task')) {
        return res.json({
            content: "🤖 **Neural Synergy** | *TASK HUB*\n\nProcessing task query. You can manage tasks via the '+' interface, track progress through subtasks, or synchronize with teammates using secure share tokens."
        });
    }

    // Strategy 3: Generative Reasoning Gateway (Requires API Key)
    if (!apiKey) {
      return res.json({ 
        content: "I am currently in 'Offline Support Mode'. I can answer questions about system physics and security, but I require a Neural Gateway Key for deep contextual reasoning." 
      });
    }

    // Strategy 4: Contextual Analysis (Generative)
    const tasks = await Task.find({
      $or: [{ owner: req.user._id }, { assignedTo: req.user._id }]
    }).select('title status priority deadline description subtasks');

    const taskContext = tasks.map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      deadline: t.deadline ? t.deadline.toISOString() : 'No deadline',
      subtasks: t.subtasks.map(s => ({ title: s.title, completed: s.completed }))
    }));

    const systemPrompt = `
      ROLE: taskflow AI Companion (Industrial Productivity Partner).
      OPERATOR: ${req.user.name} | UID: ${req.user.email}
      
      ACTIVE CONTEXT: ${tasks.length} tasks synced.
      STREAM DATA: ${JSON.stringify(taskContext)}
      
      PROTOCOLS:
      1. TONE: Professional, futuristic, and highly focused on execution.
      2. LOGIC: Prioritize tasks based on deadline and priority levels.
      3. PRIVACY: Maintain absolute data isolation.
    `;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "Initialize taskflow Neural Protocol." }] },
        { role: "model", parts: [{ text: "System Online. Neural Gateway Active." }] },
        ...history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      ],
      generationConfig: { maxOutputTokens: 800 },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    res.json({ content: response.text() });

  } catch (error) {
    console.error("[NEURAL ERROR]", error);
    res.status(500).json({ message: "Neural gateway timeout." });
  }
};
