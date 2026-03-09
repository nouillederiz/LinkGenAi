import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";
import cookieParser from "cookie-parser";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("database.sqlite");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT UNIQUE,
    target_url TEXT,
    title TEXT,
    description TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alias TEXT UNIQUE,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT, -- 'link' or 'page'
    target_alias TEXT,
    ip TEXT,
    user_agent TEXT,
    referer TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Insert default admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("admin", "admin123");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  const authMiddleware = (req: any, res: any, next: any) => {
    const session = req.cookies.session;
    if (session === "admin-session-id") {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // --- Public Routes ---

  // Link Redirection
  app.get("/l/:alias", (req, res) => {
    const { alias } = req.params;
    const link: any = db.prepare("SELECT * FROM links WHERE alias = ?").get(alias);

    if (!link) {
      return res.status(404).send("Link not found");
    }

    // Log visit
    db.prepare("INSERT INTO visits (type, target_alias, ip, user_agent, referer) VALUES (?, ?, ?, ?, ?)")
      .run("link", alias, req.ip, req.get("user-agent"), req.get("referer"));

    // Check if it's a bot for metadata
    const ua = req.get("user-agent") || "";
    const isBot = /bot|facebookexternalhit|twitterbot|googlebot|whatsapp|viber|discordapp/i.test(ua);

    if (isBot) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${link.title || 'Lien raccourci'}</title>
          <meta property="og:title" content="${link.title || ''}" />
          <meta property="og:description" content="${link.description || ''}" />
          <meta property="og:image" content="${link.image_url || ''}" />
          <meta name="twitter:card" content="summary_large_image">
          <meta http-equiv="refresh" content="0;url=${link.target_url}">
        </head>
        <body>
          Redirecting to <a href="${link.target_url}">${link.target_url}</a>
        </body>
        </html>
      `);
    }

    res.redirect(link.target_url);
  });

  // Custom Page Serving
  app.get("/p/:alias", (req, res) => {
    const { alias } = req.params;
    const page: any = db.prepare("SELECT * FROM pages WHERE alias = ?").get(alias);

    if (!page) {
      return res.status(404).send("Page not found");
    }

    // Log visit
    db.prepare("INSERT INTO visits (type, target_alias, ip, user_agent, referer) VALUES (?, ?, ?, ?, ?)")
      .run("page", alias, req.ip, req.get("user-agent"), req.get("referer"));

    res.send(page.content);
  });

  // --- Admin API Routes ---

  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.cookie("session", "admin-session-id", { httpOnly: true, sameSite: 'none', secure: true });
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    res.clearCookie("session");
    res.json({ success: true });
  });

  app.get("/api/admin/check", (req, res) => {
    if (req.cookies.session === "admin-session-id") {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Stats
  app.get("/api/admin/stats", authMiddleware, (req, res) => {
    const totalLinks = db.prepare("SELECT COUNT(*) as count FROM links").get() as any;
    const totalPages = db.prepare("SELECT COUNT(*) as count FROM pages").get() as any;
    const totalVisits = db.prepare("SELECT COUNT(*) as count FROM visits").get() as any;
    const recentVisits = db.prepare("SELECT * FROM visits ORDER BY timestamp DESC LIMIT 50").all();

    res.json({
      totalLinks: totalLinks.count,
      totalPages: totalPages.count,
      totalVisits: totalVisits.count,
      recentVisits
    });
  });

  // Links CRUD
  app.get("/api/admin/links", authMiddleware, (req, res) => {
    const links = db.prepare("SELECT * FROM links ORDER BY created_at DESC").all();
    res.json(links);
  });

  app.post("/api/admin/links", authMiddleware, (req, res) => {
    const { alias, target_url, title, description, image_url } = req.body;
    try {
      db.prepare("INSERT INTO links (alias, target_url, title, description, image_url) VALUES (?, ?, ?, ?, ?)")
        .run(alias, target_url, title, description, image_url);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/admin/links/:id", authMiddleware, (req, res) => {
    db.prepare("DELETE FROM links WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Pages CRUD
  app.get("/api/admin/pages", authMiddleware, (req, res) => {
    const pages = db.prepare("SELECT * FROM pages ORDER BY created_at DESC").all();
    res.json(pages);
  });

  app.post("/api/admin/pages", authMiddleware, (req, res) => {
    const { alias, title, content } = req.body;
    try {
      db.prepare("INSERT INTO pages (alias, title, content) VALUES (?, ?, ?)")
        .run(alias, title, content);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/admin/pages/:id", authMiddleware, (req, res) => {
    const { title, content, alias } = req.body;
    try {
      db.prepare("UPDATE pages SET title = ?, content = ?, alias = ? WHERE id = ?")
        .run(title, content, alias, req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/admin/pages/:id", authMiddleware, (req, res) => {
    db.prepare("DELETE FROM pages WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // AI Generation
  app.post("/api/ai/generate", authMiddleware, async (req, res) => {
    const { prompt, currentCode } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const systemInstruction = `Tu es un expert en développement web. Ta tâche est de générer ou modifier du code HTML/CSS/JS pour une page web. 
    Réponds UNIQUEMENT avec le code complet de la page, sans explications, sans blocs de code markdown. 
    Le code doit être moderne, responsive (Tailwind CSS est disponible via CDN si tu veux l'utiliser), et esthétique.
    Si du code existant est fourni, modifie-le selon les instructions. Sinon, crée une nouvelle page à partir de zéro.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Instructions: ${prompt}\n\nCode actuel:\n${currentCode || ''}`,
        config: { systemInstruction }
      });
      
      res.json({ code: response.text });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
