import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// 🔁 Cargar tokens guardados (si existen)
if (fs.existsSync("tokens.json")) {
  const tokens = JSON.parse(fs.readFileSync("tokens.json"));
  oauth2Client.setCredentials(tokens);
  console.log("🔁 Tokens cargados al iniciar");
}

app.get("/", (req, res) => res.send("QR Music Menu Backend 🚀"));

app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube"]
  });
  res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
  const { tokens } = await oauth2Client.getToken(req.query.code);
  oauth2Client.setCredentials(tokens);

  // 💾 Guardar tokens en archivo
  fs.writeFileSync("tokens.json", JSON.stringify(tokens));

  console.log("🎉 TOKENS GUARDADOS:", tokens);
  res.send("Autorización completada ✔ Puedes agregar canciones.");
});

app.post("/add-song", async (req, res) => {
  try {
    const { playlistId, videoId } = req.body;

    const yt = google.youtube({
      version: "v3",
      auth: oauth2Client
    });

    const result = await yt.playlistItems.insert({
      part: "snippet",
      requestBody: {
        snippet: {
          playlistId,
          resourceId: {
            kind: "youtube#video",
            videoId
          }
        }
      }
    });

    res.json({ ok: true, agregado: result.data });

  } catch (error) {
    console.error("❌ ERROR AL AGREGAR VIDEO:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () =>
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
);
