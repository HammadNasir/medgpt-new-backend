import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/chat", async (req, res) => {
  try {
    const { model, messages } = req.body;

    const completion = await client.chat.completions.create({
      model: model || "gpt-4o-mini",
      messages
    });

    res.json({
      reply: completion.choices[0].message.content
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

app.post("/chat/stream", async (req, res) => {
  try {
    const { model, messages } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const stream = await client.chat.completions.create({
      model,
      messages,
      stream: true
    });

    for await (const chunk of stream) {
      const choice = chunk?.choices?.[0];
      const delta = choice?.delta;

      if (!delta) continue;

      // New consistent text structure (delta.content array)
      if (Array.isArray(delta.content)) {
        let combined = "";

        for (const part of delta.content) {
          if (part.type === "text" && part.text) {
            combined += part.text;
          }
        }

        if (combined.length > 0) {
          res.write(`data: ${combined}\n\n`);
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("STREAM ERROR:", err);
    res.write(`data: [ERROR]\n\n`);
    res.end();
  }
});

// ------------------------------------------------------------
// Health Check (Optional)
// ------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("MedGPT backend is running.");
});

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`MedGPT backend running on port ${port}`)
);
