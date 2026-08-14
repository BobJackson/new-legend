import { Mail, MailSendLog } from '../types/game';
import { INITIAL_SYSTEM_MAILS } from '../data/initialMails';

const LOCAL_MAILS_KEY = 'legend_game_local_mails_v1';
const LOCAL_READ_KEY = 'legend_game_read_mails_v1';
const LOCAL_CLAIMED_KEY = 'legend_game_claimed_mails_v1';
const LOCAL_LOGS_KEY = 'legend_game_mail_logs_v1';

export async function fetchPlayerMails(playerId: string, playerName: string, uid?: string): Promise<Mail[]> {
  try {
    const res = await fetch(`/api/mails?playerId=${encodeURIComponent(playerId)}&playerName=${encodeURIComponent(playerName)}&uid=${encodeURIComponent(uid || '')}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.mails)) {
        return data.mails;
      }
    }
  } catch (e) {
    console.warn('Backend /api/mails failed, fallback to local storage:', e);
  }

  // Fallback to localStorage
  const readList = JSON.parse(localStorage.getItem(LOCAL_READ_KEY) || '[]');
  const claimedList = JSON.parse(localStorage.getItem(LOCAL_CLAIMED_KEY) || '[]');
  const savedMails: Mail[] = JSON.parse(localStorage.getItem(LOCAL_MAILS_KEY) || JSON.stringify(INITIAL_SYSTEM_MAILS));

  return savedMails
    .filter(m => {
      if (m.targetType === 'all') return true;
      if (m.targetPlayerId && (m.targetPlayerId === playerId || m.targetPlayerId === uid)) return true;
      if (m.targetPlayerName && m.targetPlayerName.toLowerCase() === playerName.toLowerCase()) return true;
      return false;
    })
    .map(m => ({
      ...m,
      isRead: readList.includes(m.id) || m.isRead,
      isClaimed: claimedList.includes(m.id) || m.isClaimed
    }));
}

export async function markMailRead(playerId: string, mailId: string): Promise<void> {
  // Sync to local
  const readList = JSON.parse(localStorage.getItem(LOCAL_READ_KEY) || '[]');
  if (!readList.includes(mailId)) {
    readList.push(mailId);
    localStorage.setItem(LOCAL_READ_KEY, JSON.stringify(readList));
  }

  // Sync to API
  try {
    await fetch('/api/mails/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, mailId })
    });
  } catch (e) {}
}

export async function markMailClaimed(playerId: string, mailId: string): Promise<void> {
  // Sync to local
  const claimedList = JSON.parse(localStorage.getItem(LOCAL_CLAIMED_KEY) || '[]');
  if (!claimedList.includes(mailId)) {
    claimedList.push(mailId);
    localStorage.setItem(LOCAL_CLAIMED_KEY, JSON.stringify(claimedList));
  }

  // Also mark as read
  await markMailRead(playerId, mailId);

  // Sync to API
  try {
    await fetch('/api/mails/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, mailId })
    });
  } catch (e) {}
}

export async function deletePlayerMail(playerId: string, mailId: string): Promise<void> {
  try {
    await fetch('/api/mails/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, mailId })
    });
  } catch (e) {}
}

export async function fetchGMPlayers(): Promise<any[]> {
  try {
    const res = await fetch('/api/gm/players');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.players)) {
        return data.players;
      }
    }
  } catch (e) {}
  return [];
}

export async function sendGMMail(mailData: {
  sender?: string;
  title: string;
  content: string;
  type?: string;
  targetType: 'all' | 'player';
  targetPlayerId?: string;
  targetPlayerName?: string;
  attachment?: any;
}): Promise<{ success: boolean; mail?: Mail; log?: MailSendLog; error?: string }> {
  try {
    const res = await fetch('/api/gm/send-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mailData)
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.error('sendGMMail error:', e);
  }

  // Fallback local creation
  const mailId = `mail_gm_${Date.now()}`;
  const newMail: Mail = {
    id: mailId,
    sender: mailData.sender || 'GM管理员',
    title: mailData.title,
    content: mailData.content,
    type: (mailData.type as any) || 'gm',
    sentAt: new Date().toISOString(),
    targetType: mailData.targetType,
    targetPlayerId: mailData.targetPlayerId,
    targetPlayerName: mailData.targetPlayerName,
    attachment: mailData.attachment,
    isRead: false,
    isClaimed: false
  };

  const existingMails = JSON.parse(localStorage.getItem(LOCAL_MAILS_KEY) || JSON.stringify(INITIAL_SYSTEM_MAILS));
  existingMails.unshift(newMail);
  localStorage.setItem(LOCAL_MAILS_KEY, JSON.stringify(existingMails));

  const log: MailSendLog = {
    id: `log_${Date.now()}`,
    sender: mailData.sender || 'GM管理员',
    title: mailData.title,
    target: mailData.targetType === 'all' ? '全服玩家' : `${mailData.targetPlayerName || '指定玩家'}`,
    targetType: mailData.targetType,
    targetPlayerId: mailData.targetPlayerId,
    targetPlayerName: mailData.targetPlayerName,
    sentAt: new Date().toISOString(),
    attachmentSummary: '自定义附件',
    status: 'success'
  };

  const existingLogs = JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
  existingLogs.unshift(log);
  localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(existingLogs));

  return { success: true, mail: newMail, log };
}

export async function fetchGMMailLogs(): Promise<MailSendLog[]> {
  try {
    const res = await fetch('/api/gm/mail-logs');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        return data.logs;
      }
    }
  } catch (e) {}

  return JSON.parse(localStorage.getItem(LOCAL_LOGS_KEY) || '[]');
}

export async function revokeGMMail(mailId: string, logId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/gm/delete-mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mailId, logId })
    });
    if (res.ok) return true;
  } catch (e) {}
  return false;
}
