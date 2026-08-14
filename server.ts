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

  // Global Server Mails Data
  let serverMails: any[] = [
    {
      id: "mail_welcome_package",
      sender: "玛法大陆使节",
      title: "【开服庆典】玛法至尊勇士迎新大礼包",
      content: "尊敬的玛法勇士：\n欢迎来到热血传奇世界！为助力各位勇士在玛法大陆斩妖除魔、成就宏图霸业，王城军需官特此奉上开服至尊迎新厚礼！请查收附件并在背包中妥善使用。愿您刀刀暴击，问鼎沙巴克！",
      type: "event",
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      targetType: "all",
      attachment: {
        gold: 500000,
        ingot: 888,
        expPills: 2,
        items: [
          { itemId: "blessing_oil", count: 5 },
          { itemId: "potion_sun_water", count: 20 },
          { itemId: "black_iron_ore", count: 10 }
        ]
      }
    },
    {
      id: "mail_server_compensation",
      sender: "传奇运营团队",
      title: "【系统福利】全服性能优化与版本更新补偿",
      content: "各位热血勇士：\n我们已于近期完成了全服底层网络通信优化与爆率引擎升级。为感谢大家对玛法大陆的坚定支持与守候，现发放全服版本优化补偿福利，祝各位游戏愉快，神装爆满屏！",
      type: "compensation",
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      targetType: "all",
      attachment: {
        gold: 300000,
        ingot: 500,
        expPills: 1,
        items: [
          { itemId: "pill_mount_advance", count: 15 },
          { itemId: "potion_sun_water", count: 10 }
        ]
      }
    }
  ];

  // Player Mail Interaction Records
  let playerClaimRecords: Record<string, string[]> = {};
  let playerReadRecords: Record<string, string[]> = {};
  let playerDeletedRecords: Record<string, string[]> = {};

  // GM Mail Dispatch History Logs
  let mailSendLogs: any[] = [
    {
      id: "log_init_01",
      sender: "系统自动触发",
      title: "【开服庆典】玛法至尊勇士迎新大礼包",
      target: "全服玩家",
      targetType: "all",
      sentAt: new Date().toISOString(),
      attachmentSummary: "金币50万、元宝888、直升经验丹x2、祝福油x5、太阳水x20、黑铁矿石x10",
      status: "success"
    },
    {
      id: "log_init_02",
      sender: "系统维护引擎",
      title: "【系统福利】全服性能优化与版本更新补偿",
      target: "全服玩家",
      targetType: "all",
      sentAt: new Date().toISOString(),
      attachmentSummary: "金币30万、元宝500、直升经验丹x1、坐骑进阶丹x15、太阳水x10",
      status: "success"
    }
  ];

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
  });

  // Fetch Player Mails with read/claimed status computed
  app.get("/api/mails", (req, res) => {
    const { playerId, playerName, uid } = req.query as { playerId?: string; playerName?: string; uid?: string };
    const pId = playerId || uid || playerName || "default";

    const claimed = playerClaimRecords[pId] || [];
    const read = playerReadRecords[pId] || [];
    const deleted = playerDeletedRecords[pId] || [];

    // Filter relevant mails for this player
    const list = serverMails
      .filter((m) => {
        if (deleted.includes(m.id)) return false;
        if (m.targetType === "all") return true;
        if (m.targetPlayerId && (m.targetPlayerId === playerId || m.targetPlayerId === uid)) return true;
        if (m.targetPlayerName && playerName && m.targetPlayerName.toLowerCase() === playerName.toLowerCase()) return true;
        return false;
      })
      .map((m) => ({
        ...m,
        isRead: read.includes(m.id),
        isClaimed: claimed.includes(m.id)
      }));

    res.json({ success: true, mails: list });
  });

  // Mark Mail as Read
  app.post("/api/mails/read", (req, res) => {
    const { playerId, mailId } = req.body;
    if (!playerId || !mailId) return res.status(400).json({ error: "Missing parameters" });

    if (!playerReadRecords[playerId]) playerReadRecords[playerId] = [];
    if (!playerReadRecords[playerId].includes(mailId)) {
      playerReadRecords[playerId].push(mailId);
    }
    res.json({ success: true });
  });

  // Mark Mail as Claimed
  app.post("/api/mails/claim", (req, res) => {
    const { playerId, mailId } = req.body;
    if (!playerId || !mailId) return res.status(400).json({ error: "Missing parameters" });

    if (!playerClaimRecords[playerId]) playerClaimRecords[playerId] = [];
    if (!playerClaimRecords[playerId].includes(mailId)) {
      playerClaimRecords[playerId].push(mailId);
    }
    if (!playerReadRecords[playerId]) playerReadRecords[playerId] = [];
    if (!playerReadRecords[playerId].includes(mailId)) {
      playerReadRecords[playerId].push(mailId);
    }
    res.json({ success: true });
  });

  // Delete Mail for Player
  app.post("/api/mails/delete", (req, res) => {
    const { playerId, mailId } = req.body;
    if (!playerId || !mailId) return res.status(400).json({ error: "Missing parameters" });

    if (!playerDeletedRecords[playerId]) playerDeletedRecords[playerId] = [];
    if (!playerDeletedRecords[playerId].includes(mailId)) {
      playerDeletedRecords[playerId].push(mailId);
    }
    res.json({ success: true });
  });

  // GM: List registered/known player characters
  app.get("/api/gm/players", (req, res) => {
    const playerList: any[] = [];
    const seenIds = new Set<string>();

    // Scan userSaves
    Object.values(userSaves).forEach((save: any) => {
      if (save && save.name) {
        seenIds.add(save.name);
        playerList.push({
          id: save.id || `char_${save.name}`,
          uid: save.uid || `UID-${Math.abs(save.name.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 100000))}`,
          name: save.name,
          profession: save.profession || "warrior",
          level: save.level || 1,
          gold: save.gold || 0,
          ingot: save.ingot || 0,
          currentMapId: save.currentMapId || "bichi_city",
          createdAt: save.createdAt || new Date().toISOString(),
          isOnline: true
        });
      }
    });

    // Fallback seed characters if empty
    if (playerList.length === 0) {
      leaderboards.forEach((lb, idx) => {
        playerList.push({
          id: `seed_${idx + 1}`,
          uid: `UID-${778800 + idx}`,
          name: lb.name,
          profession: lb.profession,
          level: lb.level,
          gold: 500000 + idx * 100000,
          ingot: 1000 + idx * 200,
          currentMapId: "bichi_city",
          createdAt: new Date(Date.now() - (idx + 1) * 86400000).toISOString(),
          isOnline: idx === 0
        });
      });
    }

    res.json({ success: true, players: playerList });
  });

  // GM: Send Mail with Attachments
  app.post("/api/gm/send-mail", (req, res) => {
    const {
      sender = "GM管理员",
      title,
      content,
      type = "gm",
      targetType = "all",
      targetPlayerId,
      targetPlayerName,
      attachment
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "邮件标题和正文不能为空" });
    }

    const mailId = `mail_gm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMail = {
      id: mailId,
      sender,
      title,
      content,
      type,
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      targetType,
      targetPlayerId: targetType === "player" ? targetPlayerId : undefined,
      targetPlayerName: targetType === "player" ? targetPlayerName : undefined,
      attachment: attachment || {}
    };

    serverMails.unshift(newMail);

    // Build human-readable summary for logs
    const summaries: string[] = [];
    if (attachment?.gold) summaries.push(`金币 ${Number(attachment.gold).toLocaleString()}`);
    if (attachment?.ingot) summaries.push(`元宝 ${Number(attachment.ingot).toLocaleString()}`);
    if (attachment?.expPills) summaries.push(`直升经验丹 x${attachment.expPills}`);
    if (attachment?.items && Array.isArray(attachment.items)) {
      attachment.items.forEach((it: any) => {
        summaries.push(`${it.customItem?.name || it.itemId} x${it.count || 1}`);
      });
    }

    const logEntry = {
      id: `log_${Date.now()}`,
      sender,
      title,
      target: targetType === "all" ? "全服玩家" : `${targetPlayerName || '指定玩家'} (${targetPlayerId || '定向'})`,
      targetType,
      targetPlayerId,
      targetPlayerName,
      sentAt: new Date().toISOString(),
      attachmentSummary: summaries.length > 0 ? summaries.join("、") : "无附件",
      status: "success"
    };

    mailSendLogs.unshift(logEntry);

    res.json({ success: true, mail: newMail, log: logEntry });
  });

  // GM: Fetch Mail Send Logs
  app.get("/api/gm/mail-logs", (req, res) => {
    res.json({ success: true, logs: mailSendLogs });
  });

  // GM: Revoke or delete mail
  app.post("/api/gm/delete-mail", (req, res) => {
    const { mailId, logId } = req.body;
    if (mailId) {
      serverMails = serverMails.filter((m) => m.id !== mailId);
    }
    if (logId) {
      const target = mailSendLogs.find((l) => l.id === logId);
      if (target) target.status = "revoked";
    }
    res.json({ success: true });
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
