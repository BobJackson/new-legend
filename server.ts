import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory server data for leaderboards & Sabak status
  let sabakLord = {
    guildName: "兄弟会",
    leaderName: "霸天战神",
    capturedAt: new Date().toISOString(),
    taxGold: 1000000,
  };

  let leaderboards = [
    { rank: 1, name: "霸天战神", profession: "warrior", level: 52, battlePower: 128500, guild: "兄弟会" },
    { rank: 2, name: "法神无双", profession: "mage", level: 50, battlePower: 112000, guild: "兄弟会" },
    { rank: 3, name: "天尊逍遥", profession: "taoist", level: 49, battlePower: 108400, guild: "义薄云天" },
    { rank: 4, name: "屠龙圣者", profession: "warrior", level: 48, battlePower: 99800, guild: "绝顶高手" },
    { rank: 5, name: "冰霜主宰", profession: "mage", level: 47, battlePower: 92100, guild: "义薄云天" },
  ];

  let userSaves: Record<string, any> = {};

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
  });

  app.get("/api/sabak", (req, res) => {
    res.json(sabakLord);
  });

  app.post("/api/sabak/claim", (req, res) => {
    const { guildName, leaderName } = req.body;
    if (guildName && leaderName) {
      sabakLord = {
        guildName,
        leaderName,
        capturedAt: new Date().toISOString(),
        taxGold: sabakLord.taxGold + 500000,
      };
      return res.json({ success: true, sabakLord });
    }
    res.status(400).json({ error: "Invalid parameters" });
  });

  app.get("/api/leaderboard", (req, res) => {
    res.json(leaderboards);
  });

  app.post("/api/leaderboard/submit", (req, res) => {
    const { name, profession, level, battlePower, guild } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const existingIdx = leaderboards.findIndex((l) => l.name === name);
    const entry = {
      rank: 0,
      name,
      profession: profession || "warrior",
      level: level || 1,
      battlePower: battlePower || 0,
      guild: guild || "散人联盟",
    };

    if (existingIdx >= 0) {
      leaderboards[existingIdx] = entry;
    } else {
      leaderboards.push(entry);
    }

    // Sort descending by battlePower
    leaderboards.sort((a, b) => b.battlePower - a.battlePower);
    leaderboards = leaderboards.slice(0, 20).map((item, idx) => ({ ...item, rank: idx + 1 }));

    res.json({ success: true, leaderboards });
  });

  app.post("/api/save", (req, res) => {
    const { userId, data } = req.body;
    if (!userId || !data) return res.status(400).json({ error: "Missing parameters" });
    userSaves[userId] = data;
    res.json({ success: true });
  });

  app.get("/api/load/:userId", (req, res) => {
    const { userId } = req.params;
    if (userSaves[userId]) {
      return res.json({ success: true, data: userSaves[userId] });
    }
    res.json({ success: false, message: "Save file not found" });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Legend Game Server running on http://localhost:${PORT}`);
  });
}

startServer();
