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
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await client.chat.completions.create({
      model,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      // const delta = chunk.choices?.[0]?.delta?.content;
      // if (delta) {
      //   res.write(`data: ${delta}\n\n`);
      // }
      res.write(chunk.choices[0]?.delta?.content || "");
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
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
