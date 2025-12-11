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
      const delta = chunk?.choices?.[0]?.delta?.content;

      if (!delta) continue;

      // delta is an array in the new API
      if (Array.isArray(delta)) {
        for (const part of delta) {
          if (part.type === "text" && part.text) {
            res.write(`data: ${part.text}\n\n`);
          }
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();

  } catch (err) {
    console.error("STREAM ERROR:", err);
    res.write("data: [ERROR]\n\n");
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
