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

// 👉 Railway usa su propio dominio en producción, pero respetamos localhost en dev
const REDIRECT_URI =
  process.env.REDIRECT_URI || "http://localhost:3000/oauth2callback";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// 🔁 Intentar cargar tokens previos si existen (evita pedir OAuth cada vez)
if (fs.existsSync("tokens.json")) {
  const tokens = JSON.parse(fs.readFileSync("tokens.json", "utf8"));
  oauth2Client.setCredentials(tokens);
  console.log("🔁 Tokens cargados desde tokens.json");
}

app.get("/", (req, res) => {
  res.send("QR Music Menu Backend 🚀");
});

app.get("/auth", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/youtube"]
  });
  res.redirect(url);
});

app.get("/oauth2callback", async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync("tokens.json", JSON.stringify(tokens));
    console.log("🎉 Tokens de OAuth guardados con éxito");
    res.send("Autorización completada ✔ Ya puedes agregar canciones al playlist.");
  } catch (error) {
    console.error("❌ Error en OAuth Callback:", error);
    res.status(500).send("Error durante la autorización.");
  }
});

app.post("/add-song", async (req, res) => {
  try {
    const { playlistId, videoId } = req.body;

    if (!playlistId || !videoId) {
      return res.status(400).json({
        ok: false,
        error: "playlistId y videoId son obligatorios"
      });
    }

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

    console.log("🎵 Canción agregada:", videoId);
    res.json({ ok: true, agregado: result.data });

  } catch (error) {
    console.error("❌ Error al agregar canción:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// 🚀 CAMBIO CRÍTICO PARA RAILWAY — DEBE ESCUCHAR EN 0.0.0.0
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor escuchando correctamente en http://0.0.0.0:${PORT}`);
  console.log(`REDIRECT_URI activo: ${REDIRECT_URI}`);
});
