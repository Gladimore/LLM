// server.js
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const Together = require("together-ai");
const rateLimit = require("express-rate-limit");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize TogetherAI
const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// Load allowed models from models.json
let allowedModels = {
  textModels: [],
  imageModels: [],
};

const loadAllowedModels = () => {
  const modelsPath = path.join(__dirname, "public", "data", "models.json");
  try {
    const data = fs.readFileSync(modelsPath, "utf8");
    allowedModels = JSON.parse(data);
    console.log("Allowed models loaded successfully.");
  } catch (err) {
    console.error("Error loading models.json:", err);
  }
};

// Initial load
loadAllowedModels();

// Watch for changes in models.json and reload
fs.watchFile(
  path.join(__dirname, "public", "data", "models.json"),
  (curr, prev) => {
    console.log("models.json file changed. Reloading allowed models.");
    loadAllowedModels();
  },
);

// Rate Limiter for password attempts
const passwordLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // limit each IP to 5 password attempts per windowMs
  message:
    "Too many password attempts from this IP, please try again after 15 minutes",
});

// Password Verification Middleware
const verifyPassword = (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return res
      .status(401)
      .json({ success: false, error: "Password is required." });
  }

  if (password !== process.env.API_PASSWORD) {
    return res
      .status(401)
      .json({ success: false, error: "Incorrect password." });
  }

  next();
};

// Routes

// Redirect root to /text
app.get("/", (req, res) => {
  res.redirect("/text");
});

// Serve Text Generation Page
app.get("/text", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "text.html"));
});

// Serve Image Generation Page
app.get("/image", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "image.html"));
});

// Serve Settings Page
app.get("/settings", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "settings.html"));
});

// API Endpoint to get allowed models
app.get("/api/models", (req, res) => {
  res.json(allowedModels);
});

// API Endpoint for Text Generation
app.post(
  "/api/generate-text",
  passwordLimiter,
  verifyPassword,
  async (req, res) => {
    const { prompt, model, chatHistory } = req.body;

    if (!prompt || !model) {
      return res
        .status(400)
        .json({ success: false, error: "Prompt and model are required." });
    }

    // Verify model is allowed
    const selectedModel = allowedModels.textModels.find(
      (m) => m.name === model,
    );
    if (!selectedModel) {
      return res
        .status(400)
        .json({ success: false, error: "Selected text model is not allowed." });
    }

    // Limit chatHistory to last 10 entries
    let limitedChatHistory = chatHistory || [];
    if (limitedChatHistory.length > 10) {
      limitedChatHistory = limitedChatHistory.slice(-10);
    }

    // Convert chatHistory to TogetherAI's expected format
    const messages = limitedChatHistory
      .map((entry) => {
        return [
          { role: "user", content: entry.prompt },
          { role: "assistant", content: entry.response },
        ];
      })
      .flat();

    // Append the current prompt
    messages.push({ role: "user", content: prompt });
    //console.log(messages);
    try {
      const response = await together.chat.completions.create({
        messages: messages,
        model: model,
        max_tokens: 2028,
        temperature: 0.7,
        top_p: 0.7,
        top_k: 50,
        repetition_penalty: 1,
        stop: selectedModel.stop,
        truncate: 130560,
        stream: false, // Set to false to simplify response handling
      });

      const generatedText = response.choices[0].message.content;
      res.json({ success: true, data: generatedText });
    } catch (error) {
      console.error(
        "Error generating text:",
        error.response ? error.response.data : error.message,
      );
      res
        .status(500)
        .json({ success: false, error: "Failed to generate text." });
    }
  },
);

// API Endpoint for Image Generation
app.post(
  "/api/generate-image",
  passwordLimiter,
  verifyPassword,
  async (req, res) => {
    const { prompt, model, width, height, steps, n, response_format } =
      req.body;

    if (!prompt || !model) {
      return res
        .status(400)
        .json({ success: false, error: "Prompt and model are required." });
    }

    // Verify model is allowed
    const selectedModel = allowedModels.imageModels.find(
      (m) => m.name === model,
    );
    if (!selectedModel) {
      return res.status(400).json({
        success: false,
        error: "Selected image model is not allowed.",
      });
    }

    try {
      const response = await together.images.create({
        model: model,
        prompt: prompt,
        width: width || 512,
        height: height || 512,
        steps: steps || 4,
        n: n || 1,
        response_format: response_format || "b64_json",
      });

      // Assuming response.data is an array of images
      const images = response.data.map((img) => img.b64_json);
      res.json({ success: true, data: images });
    } catch (error) {
      console.error(
        "Error generating image:",
        error.response ? error.response.data : error.message,
      );
      res
        .status(500)
        .json({ success: false, error: "Failed to generate image." });
    }
  },
);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
