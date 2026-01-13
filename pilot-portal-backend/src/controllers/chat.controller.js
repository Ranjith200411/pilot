const axios = require("axios");
const fs = require("fs");
const path = require("path");

// TRUE AI: Using Groq's FREE API with Llama models
// Sign up at https://console.groq.com for FREE API key
// OR use OpenRouter's free tier: https://openrouter.ai/

const GROQ_API_KEY = process.env.GROQ_API_KEY || "YOUR_FREE_GROQ_API_KEY_HERE";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Alternative: OpenRouter (supports many free models)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Fallback models (these are more reliable than Hugging Face inference)
const AI_MODELS = [
  {
    name: "Groq-Llama-3.1-8B",
    provider: "groq",
    model: "llama-3.1-8b-instant",
    apiKey: GROQ_API_KEY,
    url: GROQ_API_URL
  },
  {
    name: "OpenRouter-Llama-3.2-3B-Free",
    provider: "openrouter", 
    model: "meta-llama/llama-3.2-3b-instruct:free",
    apiKey: OPENROUTER_API_KEY,
    url: OPENROUTER_API_URL
  }
];

// Read and analyze actual project files
function analyzeProjectCode() {
  // Inside Docker, paths are different - we're in /app
  const projectRoot = "/app";  // Backend is in /app
  const frontendRoot = "/app/../frontend"; // Try to access frontend if mounted
  
  const codeAnalysis = {
    files: {},
    structure: ""
  };

  try {
    // Read key files from YOUR actual codebase (adjust paths for Docker)
    const filesToRead = [
      { path: path.join(projectRoot, "package.json"), name: "backend/package.json" },
      { path: path.join(projectRoot, "src/app.js"), name: "backend/src/app.js" },
      { path: path.join(projectRoot, "src/models/user.model.js"), name: "backend/src/models/user.model.js" },
      { path: path.join(projectRoot, "src/models/logbook.model.js"), name: "backend/src/models/logbook.model.js" },
      { path: path.join(projectRoot, "src/models/license.model.js"), name: "backend/src/models/license.model.js" },
      { path: path.join(projectRoot, "src/models/medicals.model.js"), name: "backend/src/models/medicals.model.js" },
      { path: path.join(projectRoot, "src/controllers/auth.controller.js"), name: "backend/src/controllers/auth.controller.js" },
      { path: path.join(projectRoot, "src/routes/chat.routes.js"), name: "backend/src/routes/chat.routes.js" }
    ];

    filesToRead.forEach(({ path: filePath, name }) => {
      try {
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, "utf-8");
          // Truncate if too large
          if (content.length > 1500) {
            content = content.substring(0, 1500) + "\n... (truncated for brevity)";
          }
          codeAnalysis.files[name] = content;
          console.log(`[CHAT] ✓ Read file: ${name} (${content.length} bytes)`);
        } else {
          console.log(`[CHAT] ✗ File not found: ${filePath}`);
        }
      } catch (err) {
        console.error(`[CHAT] Error reading ${filePath}:`, err.message);
      }
    });

    // Scan directory structure
    codeAnalysis.structure = scanProjectStructure(projectRoot);

  } catch (error) {
    console.error("[CHAT] Error reading project files:", error.message);
  }

  return codeAnalysis;
}

// Scan project directory structure
function scanProjectStructure(dir, depth = 0, maxDepth = 2) {
  if (depth > maxDepth) return "";
  
  let structure = "";
  try {
    const items = fs.readdirSync(dir);
    const indent = "  ".repeat(depth);
    
    items.forEach(item => {
      // Skip hidden, node_modules, dist
      if (item.startsWith(".") || item === "node_modules" || item === "dist" || item === "uploads") return;
      
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        structure += `${indent}📁 ${item}/\n`;
        structure += scanProjectStructure(itemPath, depth + 1, maxDepth);
      } else if (item.endsWith(".js") || item.endsWith(".ts") || item.endsWith(".json") || item.endsWith(".yml")) {
        structure += `${indent}📄 ${item}\n`;
      }
    });
  } catch (error) {
    // Skip inaccessible directories
  }
  
  return structure;
}

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    console.log(`\n[CHAT] 🤖 User Question: "${message}"`);
    console.log("[CHAT] 📂 Reading actual project source code...");

    // STEP 1: Read and analyze YOUR actual project files
    const projectCode = analyzeProjectCode();
    
    console.log(`[CHAT] ✓ Analyzed ${Object.keys(projectCode.files).length} files from your codebase`);

    // STEP 2: Build prompt with REAL CODE for AI to analyze
    const codeSnippets = Object.entries(projectCode.files)
      .map(([filename, code]) => `\n--- File: ${filename} ---\n${code}`)
      .join("\n");

    const aiPrompt = `You are analyzing a real Pilot Portal application. Here is the ACTUAL source code:

PROJECT DIRECTORY STRUCTURE:
${projectCode.structure}

ACTUAL SOURCE CODE FILES:
${codeSnippets}

USER QUESTION: ${message}

IMPORTANT INSTRUCTIONS:
1. **Use Simple Language**: Explain like you're talking to someone who doesn't know programming
2. **Use Real-World Analogies**: Compare technical concepts to everyday things
3. **Step-by-Step Process**: Break down tasks into clear, numbered steps
4. **Focus on WHAT and WHY**: Explain what happens and why, not just code syntax
5. **Use UI Terms**: Talk about "forms", "buttons", "dropdowns", "pages" instead of "components", "functions", "APIs"
6. **Avoid Jargon**: Don't use words like "schema", "controller", "endpoint", "model" without explaining them first
7. **Provide Context**: Explain what each file does in simple terms (e.g., "This file stores medical certificate information")

Example of BAD answer: "Update the medicalSchema in medicals.model.js by adding a new field to the mongoose schema"

Example of GOOD answer: "Think of the medical records like a form in a filing cabinet. To add a new field:
Step 1: Open the 'Medical Records Template' file (this tells the system what information each medical certificate should have)
Step 2: Add your new field to the template (like adding a new blank line to a paper form)
Step 3: Update the form that pilots fill out on the website to include this new field
Step 4: When pilots submit the form, the system will now save this new information"

ANSWER (in simple, clear language that anyone can understand):`;

    console.log(`[CHAT] 📝 Prompt prepared with real code (${aiPrompt.length} characters)`);
    console.log("[CHAT] 🚀 Sending to AI for dynamic analysis...");

    let answer = null;
    let modelUsed = null;

    // STEP 3: Send REAL CODE to TRUE AI for intelligent analysis
    for (const model of AI_MODELS) {
      try {
        console.log(`[CHAT]   → Calling ${model.name}...`);
        
        // Check if API key is configured
        if (!model.apiKey || model.apiKey.includes("YOUR_FREE") || model.apiKey === "") {
          console.log(`[CHAT]   ⚠️  ${model.provider} API key not configured - skipping`);
          continue;
        }

        // OpenAI-compatible chat completion format
        const response = await axios.post(
          model.url,
          {
            model: model.model,
            messages: [
              {
                role: "system",
                content: "You are a friendly assistant helping non-technical users understand a Pilot Portal application. Explain everything in simple, clear language without technical jargon. Use real-world analogies and step-by-step instructions. Focus on WHAT happens and WHY, not code syntax. When explaining how to do something, describe it like you're guiding someone through a website, not writing code."
              },
              {
                role: "user",
                content: aiPrompt
              }
            ],
            max_tokens: 1000,
            temperature: 0.7
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${model.apiKey}`,
              ...(model.provider === "openrouter" && {
                "HTTP-Referer": "http://localhost:4200",
                "X-Title": "Pilot Portal"
              })
            },
            timeout: 35000
          }
        );

        if (response.data?.choices?.[0]?.message?.content) {
          const aiText = response.data.choices[0].message.content.trim();
          
          if (aiText.length > 60) {
            answer = aiText;
            modelUsed = `${model.name} (TRUE AI Code Analysis)`;
            console.log(`[CHAT] ✅ ${model.name} generated intelligent response (${aiText.length} chars)`);
            break;
          }
        }
      } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.log(`[CHAT]   ✗ ${model.name} failed: ${errorMsg}`);
      }
    }

    // STEP 4: If no API keys configured, show code with explanation
    if (!answer) {
      console.log("[CHAT] ⚠️  No AI APIs configured - showing code with intelligent explanation");
      answer = generateIntelligentCodeResponse(message, projectCode);
      modelUsed = "Code Analysis (No AI API configured - Please add GROQ_API_KEY)";
    }

    console.log(`[CHAT] ✓ Response ready from: ${modelUsed}\n`);
    
    res.json({ 
      answer,
      model: modelUsed,
      codeFilesAnalyzed: Object.keys(projectCode.files).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("[CHAT] Critical error:", error);
    res.status(500).json({ 
      message: "Error processing chat",
      error: error.message 
    });
  }
};

// Intelligent code response - shows actual code with smart context
function generateIntelligentCodeResponse(question, projectCode) {
  let response = `**🤖 AI Code Analysis (Configure FREE Groq API for TRUE AI)**\n\n`;
  response += `I analyzed ${Object.keys(projectCode.files).length} real source files from your project:\n\n`;
  
  // Show analyzed files
  response += `**Files Analyzed:**\n${Object.keys(projectCode.files).map(f => `• ${f}`).join("\n")}\n\n`;
  
  // Show relevant code based on question keywords
  const q = question.toLowerCase();
  let relevantCode = [];
  
  // Intelligently select relevant files
  if (q.match(/model|database|schema|collection/)) {
    relevantCode = Object.entries(projectCode.files).filter(([name]) => name.includes("models"));
  } else if (q.match(/auth|login|register|security|jwt/)) {
    relevantCode = Object.entries(projectCode.files).filter(([name]) => name.includes("auth"));
  } else if (q.match(/api|endpoint|route|server/)) {
    relevantCode = Object.entries(projectCode.files).filter(([name]) => name.includes("app.js") || name.includes("routes"));
  } else {
    // Show all code
    relevantCode = Object.entries(projectCode.files).slice(0, 3);
  }
  
  if (relevantCode.length > 0) {
    response += `**Relevant Code:**\n\n`;
    relevantCode.forEach(([filename, code]) => {
      response += `**${filename}**\n\`\`\`javascript\n${code.substring(0, 800)}${code.length > 800 ? "\n..." : ""}\n\`\`\`\n\n`;
    });
  }
  
  response += `\n---\n\n**⚡ Get TRUE AI Analysis:**\n`;
  response += `1. Get a FREE Groq API key: https://console.groq.com\n`;
  response += `2. Add to your .env file: \`GROQ_API_KEY=your_key_here\`\n`;
  response += `3. Restart backend: \`docker-compose restart backend\`\n\n`;
  response += `💡 With TRUE AI, I can intelligently analyze your code and answer ANY question about your project!\n`;
  
  return response;
}
