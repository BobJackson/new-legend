import React, { useState, useEffect } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { MailSendLog, Item } from '../../types/game';
import { ITEM_DATABASE } from '../../data/items';
import { 
  fetchGMPlayers, 
  sendGMMail, 
  fetchGMMailLogs, 
  revokeGMMail 
} from '../../utils/mailService';
import { 
  X, 
  ShieldCheck, 
  Send, 
  FileText, 
  Users, 
  Sparkles, 
  Coins, 
  Gem, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  RotateCcw,
  Gift,
  Award,
  Layers
} from 'lucide-react';

interface GMAdminModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const GMAdminModal: React.FC<GMAdminModalProps> = ({ engine, onClose }) => {
  const [activeTab, setActiveTab] = useState<'send' | 'logs' | 'players'>('send');
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [mailLogs, setMailLogs] = useState<MailSendLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Send Mail Form State
  const [targetType, setTargetType] = useState<'all' | 'player'>('all');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');
  const [sender, setSender] = useState('GM总控系统');
  const [mailTitle, setMailTitle] = useState('【GM特许】玛法至尊狂欢犒赏');
  const [mailType, setMailType] = useState<'gm' | 'event' | 'compensation' | 'system'>('gm');
  const [mailContent, setMailContent] = useState(
    '尊敬的勇士：\nGM总控系统已核准向您发放专属特许游戏资源与神兵利器，请前往背包查收并妥善使用。祝您在玛法大陆征战无双！'
  );

  // Attachment State
  const [goldReward, setGoldReward] = useState<number>(1000000);
  const [ingotReward, setIngotReward] = useState<number>(2000);
  const [expPillsReward, setExpPillsReward] = useState<number>(2);
  const [selectedItems, setSelectedItems] = useState<{ item: Item; count: number }[]>([
    { item: ITEM_DATABASE['weapon_judgment_staff'], count: 1 },
    { item: ITEM_DATABASE['blessing_oil'], count: 10 }
  ]);

  // Item Search Modal in GM
  const [itemSearchText, setItemSearchText] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');
  const [showItemPicker, setShowItemPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    const [players, logs] = await Promise.all([
      fetchGMPlayers(),
      fetchGMMailLogs()
    ]);
    
    // Include current player character if not in list
    const hasCurrent = players.some((p: any) => p.name === engine.character.name);
    if (!hasCurrent) {
      players.unshift({
        id: engine.character.id,
        uid: engine.character.uid || 'UID-888666',
        name: engine.character.name,
        profession: engine.character.profession,
        level: engine.character.level,
        gold: engine.character.gold,
        ingot: engine.character.ingot,
        createdAt: engine.character.createdAt || new Date().toISOString(),
        isOnline: true
      });
    }

    setPlayersList(players);
    setMailLogs(logs);
    setIsLoading(false);
  };

  const applyTemplate = (templateName: string) => {
    if (templateName === 'open_server') {
      setMailTitle('【开服狂欢】全服至尊迎新大礼包');
      setSender('玛法王城军需处');
      setMailType('event');
      setMailContent('热烈庆祝玛法大陆盛大开服！特向全服热血勇士派发高额金币、元宝与开荒神兵，助您快马加鞭、早日登顶沙城！');
      setGoldReward(1000000);
      setIngotReward(1888);
      setExpPillsReward(3);
      setSelectedItems([
        { item: ITEM_DATABASE['weapon_dragon_blade'] || ITEM_DATABASE['weapon_judgment_staff'], count: 1 },
        { item: ITEM_DATABASE['blessing_oil'], count: 10 },
        { item: ITEM_DATABASE['potion_sun_water'], count: 20 }
      ]);
    } else if (templateName === 'maintenance') {
      setMailTitle('【停机维护】版本热更与防卡顿优化补偿');
      setSender('传奇运维运营中心');
      setMailType('compensation');
      setMailContent('服务器已完成维护与防御升级，现发放停机维护补偿礼包。感谢各位勇士的理解与支持！');
      setGoldReward(500000);
      setIngotReward(1000);
      setExpPillsReward(1);
      setSelectedItems([
        { item: ITEM_DATABASE['pill_mount_advance'], count: 20 },
        { item: ITEM_DATABASE['potion_sun_water'], count: 30 }
      ]);
    } else if (templateName === 'god_gear') {
      setMailTitle('【神兵现世】终极屠龙战甲至尊宝匣');
      setSender('GM管理员');
      setMailType('gm');
      setMailContent('GM特别授权发放至尊屠龙宝刀与高级重装！一刀破万法，笑傲沙巴克！');
      setGoldReward(5000000);
      setIngotReward(8888);
      setExpPillsReward(5);
      setSelectedItems([
        { item: ITEM_DATABASE['weapon_dragon_blade'], count: 1 },
        { item: ITEM_DATABASE['armor_heavy_armor'], count: 1 },
        { item: ITEM_DATABASE['ring_paralysis'], count: 1 },
        { item: ITEM_DATABASE['blessing_oil'], count: 20 }
      ]);
    } else if (templateName === 'clear') {
      setMailTitle('');
      setMailContent('');
      setGoldReward(0);
      setIngotReward(0);
      setExpPillsReward(0);
      setSelectedItems([]);
    }
  };

  const handleSendMail = async () => {
    if (!mailTitle.trim() || !mailContent.trim()) {
      setFeedback('⚠️ 邮件标题和正文不能为空！');
      return;
    }

    if (targetType === 'player' && !selectedPlayerName.trim()) {
      setFeedback('⚠️ 请指定接收奖励的目标玩家！');
      return;
    }

    setIsLoading(true);
    const attachmentData = {
      gold: goldReward > 0 ? goldReward : undefined,
      ingot: ingotReward > 0 ? ingotReward : undefined,
      expPills: expPillsReward > 0 ? expPillsReward : undefined,
      items: selectedItems.map(it => ({
        itemId: it.item.id,
        count: it.count,
        customItem: it.item
      }))
    };

    const res = await sendGMMail({
      sender,
      title: mailTitle.trim(),
      content: mailContent.trim(),
      type: mailType,
      targetType,
      targetPlayerId: targetType === 'player' ? selectedPlayerId : undefined,
      targetPlayerName: targetType === 'player' ? selectedPlayerName : undefined,
      attachment: attachmentData
    });

    setIsLoading(false);
    if (res.success) {
      setFeedback(`🎉 邮件发放成功！目标：${targetType === 'all' ? '全服所有玩家' : selectedPlayerName}`);
      // Refresh player's own engine mails if broadcast or sent to current player
      if (targetType === 'all' || selectedPlayerName === engine.character.name) {
        await engine.refreshMails();
      }
      setTimeout(() => {
        setFeedback(null);
      }, 4000);
      // Reload logs
      const updatedLogs = await fetchGMMailLogs();
      setMailLogs(updatedLogs);
    } else {
      setFeedback(`❌ 发放失败: ${res.error || '服务器异常'}`);
    }
  };

  const handleRevoke = async (mailId: string, logId: string) => {
    await revokeGMMail(mailId, logId);
    setFeedback('已撤回/标记该条发送记录！');
    setTimeout(() => setFeedback(null), 3000);
    const updatedLogs = await fetchGMMailLogs();
    setMailLogs(updatedLogs);
  };

  // Add Item to Attachment
  const handleAddItem = (item: Item) => {
    const existing = selectedItems.find(i => i.item.id === item.id);
    if (existing) {
      setSelectedItems(selectedItems.map(i => i.item.id === item.id ? { ...i, count: i.count + 1 } : i));
    } else {
      setSelectedItems([...selectedItems, { item, count: 1 }]);
    }
    setShowItemPicker(false);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, idx) => idx !== index));
  };

  const allItemsList = Object.values(ITEM_DATABASE);
  const filteredDatabaseItems = allItemsList.filter(item => {
    const matchName = item.name.toLowerCase().includes(itemSearchText.toLowerCase()) ||
                      item.description.toLowerCase().includes(itemSearchText.toLowerCase());
    if (!matchName) return false;
    if (itemTypeFilter === 'all') return true;
    return item.type === itemTypeFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 select-none animate-fadeIn">
      <div className="relative w-full max-w-5xl h-[94vh] max-h-[700px] bg-slate-900 border-2 border-yellow-600/80 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_60px_rgba(234,179,8,0.25)]">
        
        {/* Header */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-amber-950 via-slate-900 to-yellow-950 border-b border-amber-600/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-md border border-yellow-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-400 tracking-wider">
                  玛法运营后台 · GM 邮件与奖励总控系统
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/30 border border-amber-400 text-yellow-300">
                  GM SUPERADMIN
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80">
                支持全服广播或定向指定玩家发放金币、元宝、直升丹与神装道具，附带全流程发放流水日志
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-slate-800/80 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-700 rounded-lg text-slate-400 hover:text-rose-200 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Toast Feedback */}
        {feedback && (
          <div className="bg-amber-900/90 border-b border-yellow-500 px-4 py-2 text-xs font-bold text-yellow-100 flex items-center justify-center gap-2 animate-fadeIn shadow-md">
            <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 bg-slate-950 border-b border-slate-800 flex items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('send')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'send'
                ? 'border-yellow-400 text-yellow-300 bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>📧 发送邮件奖励</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'logs'
                ? 'border-yellow-400 text-yellow-300 bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📜 邮件发放记录 ({mailLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('players')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'players'
                ? 'border-yellow-400 text-yellow-300 bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 玩家角色花名册 ({playersList.length})</span>
          </button>
        </div>

        {/* Tab 1: Send Mail Console */}
        {activeTab === 'send' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            
            {/* Quick Templates Bar */}
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                快捷模版载入:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => applyTemplate('open_server')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-amber-900/60 border border-amber-700/60 text-amber-200 rounded-lg font-bold transition-all"
                >
                  🎉 开服至尊大礼包
                </button>
                <button
                  onClick={() => applyTemplate('maintenance')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-blue-900/60 border border-blue-700/60 text-blue-200 rounded-lg font-bold transition-all"
                >
                  🛠️ 停机维护补偿
                </button>
                <button
                  onClick={() => applyTemplate('god_gear')}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-purple-900/60 border border-purple-700/60 text-purple-200 rounded-lg font-bold transition-all"
                >
                  👑 终极屠龙麻痹特许
                </button>
                <button
                  onClick={() => applyTemplate('clear')}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 rounded-lg font-medium transition-all"
                >
                  清空表单
                </button>
              </div>
            </div>

            {/* Target & Basic Config Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              {/* Target Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">发放目标范围:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTargetType('all')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      targetType === 'all'
                        ? 'bg-amber-600 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    📢 全服所有玩家 (广播)
                  </button>
                  <button
                    onClick={() => setTargetType('player')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                      targetType === 'player'
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    🎯 指定单个玩家 (定向)
                  </button>
                </div>

                {targetType === 'player' && (
                  <div className="mt-2 space-y-1.5">
                    <label className="text-[11px] text-slate-400">选择在线/注册角色 或 手动输入角色名/UID:</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedPlayerName}
                        onChange={(e) => {
                          const p = playersList.find(pl => pl.name === e.target.value);
                          if (p) {
                            setSelectedPlayerName(p.name);
                            setSelectedPlayerId(p.id || p.uid);
                          } else {
                            setSelectedPlayerName(e.target.value);
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- 从花名册快速挑选 --</option>
                        {playersList.map((p, idx) => (
                          <option key={idx} value={p.name}>
                            {p.name} (LV.{p.level} {p.profession === 'warrior' ? '战士' : p.profession === 'mage' ? '法师' : '道士'} · {p.uid || p.id})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="或输入角色名"
                        value={selectedPlayerName}
                        onChange={(e) => {
                          setSelectedPlayerName(e.target.value);
                          setSelectedPlayerId(e.target.value);
                        }}
                        className="w-32 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sender & Type */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">发件人署名:</label>
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">邮件类型标签:</label>
                  <select
                    value={mailType}
                    onChange={(e) => setMailType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="gm">👑 GM特令</option>
                    <option value="event">🎉 活动庆典</option>
                    <option value="compensation">🛠️ 维护补偿</option>
                    <option value="system">📜 系统通告</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Title & Content */}
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">邮件标题:</label>
                <input
                  type="text"
                  value={mailTitle}
                  onChange={(e) => setMailTitle(e.target.value)}
                  placeholder="请输入邮件标题..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-200 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">邮件正文内容:</label>
                <textarea
                  value={mailContent}
                  onChange={(e) => setMailContent(e.target.value)}
                  rows={3}
                  placeholder="请输入邮件正文..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-amber-100 focus:outline-none focus:border-amber-500 custom-scrollbar resize-none font-sans"
                />
              </div>
            </div>

            {/* Attachments Configuration */}
            <div className="space-y-3 bg-amber-950/20 p-4 rounded-xl border border-amber-900/60">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-yellow-400" />
                  随函附件奖励自由配置 (金币、元宝、直升丹、神兵利器)
                </h3>
                <button
                  onClick={() => setShowItemPicker(true)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>挑选游戏装备/道具</span>
                </button>
              </div>

              {/* Currency & Pills Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Gold */}
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" /> 赠送金币:
                    </span>
                    <span>{goldReward.toLocaleString()} 金币</span>
                  </div>
                  <input
                    type="number"
                    value={goldReward}
                    onChange={(e) => setGoldReward(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-bold focus:outline-none"
                  />
                  <div className="flex items-center gap-1 mt-1.5 text-[10px]">
                    <button onClick={() => setGoldReward(100000)} className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-300">+10万</button>
                    <button onClick={() => setGoldReward(1000000)} className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-300">+100万</button>
                    <button onClick={() => setGoldReward(10000000)} className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-300">+1000万</button>
                  </div>
                </div>

                {/* Ingot */}
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-yellow-400 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Gem className="w-3.5 h-3.5" /> 赠送元宝:
                    </span>
                    <span>{ingotReward.toLocaleString()} 元宝</span>
                  </div>
                  <input
                    type="number"
                    value={ingotReward}
                    onChange={(e) => setIngotReward(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-yellow-300 font-bold focus:outline-none"
                  />
                  <div className="flex items-center gap-1 mt-1.5 text-[10px]">
                    <button onClick={() => setIngotReward(500)} className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-300">+500</button>
                    <button onClick={() => setIngotReward(2000)} className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-300">+2000</button>
                    <button onClick={() => setIngotReward(10000)} className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-300">+10000</button>
                  </div>
                </div>

                {/* EXP Pills */}
                <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-300 mb-1.5">
                    <span className="flex items-center gap-1">
                      ⚡ 直升经验丹:
                    </span>
                    <span>x{expPillsReward} 颗</span>
                  </div>
                  <input
                    type="number"
                    value={expPillsReward}
                    onChange={(e) => setExpPillsReward(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-purple-200 font-bold focus:outline-none"
                  />
                  <div className="flex items-center gap-1 mt-1.5 text-[10px]">
                    <button onClick={() => setExpPillsReward(1)} className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-300">1颗</button>
                    <button onClick={() => setExpPillsReward(3)} className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-300">3颗</button>
                    <button onClick={() => setExpPillsReward(10)} className="px-1.5 py-0.5 bg-slate-800 rounded hover:bg-slate-700 text-slate-300">10颗</button>
                  </div>
                </div>
              </div>

              {/* Selected Equipment & Items List */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400">已附加神装与道具列表 ({selectedItems.length}):</label>
                {selectedItems.length === 0 ? (
                  <div className="p-3 bg-slate-950/60 rounded-lg text-center text-xs text-slate-500 border border-slate-800">
                    暂未添加额外装备，点击上方按钮从游戏道具库挑选
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedItems.map((it, idx) => (
                      <div key={idx} className="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl">{it.item.icon}</span>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-amber-200 truncate">{it.item.name}</h5>
                            <span className="text-[10px] text-slate-400">数量: x{it.count}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={it.count}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setSelectedItems(selectedItems.map((item, i) => i === idx ? { ...item, count: val } : item));
                            }}
                            className="w-12 bg-slate-900 border border-slate-700 rounded px-1 text-xs text-center text-amber-200 focus:outline-none"
                          />
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-all"
                            title="移除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                onClick={handleSendMail}
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 hover:brightness-110 text-slate-950 font-black text-sm rounded-xl tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>立即核准并执行邮件发放</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Mail Send Logs */}
        {activeTab === 'logs' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>共记录 {mailLogs.length} 条邮件发放流水记录</span>
              <button
                onClick={loadData}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-bold transition-all"
              >
                刷新记录
              </button>
            </div>

            {mailLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                暂无历史发送记录
              </div>
            ) : (
              <div className="space-y-2">
                {mailLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      log.status === 'revoked'
                        ? 'bg-slate-950/40 border-slate-800 opacity-60'
                        : 'bg-slate-950/80 border-slate-800/90 hover:border-amber-900/60'
                    }`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          log.targetType === 'all'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}>
                          {log.target}
                        </span>
                        <h4 className="text-xs font-bold text-amber-200">{log.title}</h4>
                        {log.status === 'revoked' && (
                          <span className="text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded border border-rose-800">
                            已撤回/已废弃
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-amber-300/80 font-medium">
                        🎁 附件明细: {log.attachmentSummary}
                      </p>

                      <div className="text-[10px] text-slate-500 flex items-center gap-3">
                        <span>操作人: {log.sender}</span>
                        <span>发放时间: {new Date(log.sentAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {log.status !== 'revoked' && (
                      <button
                        onClick={() => handleRevoke(log.id.replace('log_', 'mail_gm_'), log.id)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700 text-slate-400 hover:text-rose-200 rounded text-xs transition-all shrink-0"
                      >
                        撤回记录
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Players Roster */}
        {activeTab === 'players' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>服务器现存角色总数: <strong className="text-amber-300">{playersList.length}</strong></span>
              <span className="text-[11px] text-slate-500">点击右侧按钮可直接为指定玩家定制专属邮件</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {playersList.map((p, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3 hover:border-amber-900/60 transition-all"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {p.profession === 'warrior' ? '🗡️' : p.profession === 'mage' ? '🔮' : '☯️'}
                      </span>
                      <h4 className="text-sm font-bold text-amber-200 truncate">{p.name}</h4>
                      <span className="text-[10px] bg-amber-950 text-amber-400 px-1.5 py-0.2 rounded font-bold border border-amber-800">
                        LV.{p.level}
                      </span>
                      {p.isOnline && (
                        <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded font-bold border border-emerald-800">
                          在线
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>编号: <strong className="text-slate-300">{p.uid || p.id}</strong></span>
                      <span>元宝: <strong className="text-yellow-400">{p.ingot?.toLocaleString()}</strong></span>
                      <span>金币: <strong className="text-amber-400">{p.gold?.toLocaleString()}</strong></span>
                    </div>

                    <div className="text-[10px] text-slate-500">
                      创建时间: {new Date(p.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setTargetType('player');
                      setSelectedPlayerName(p.name);
                      setSelectedPlayerId(p.id || p.uid);
                      setActiveTab('send');
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow shrink-0 active:scale-95 transition-all"
                  >
                    <Send className="w-3 h-3" />
                    <span>定向发奖</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Item Picker Modal Overlay inside GM Modal */}
        {showItemPicker && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex flex-col p-6 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                玛法神装道具全库检索 (点击即可加入随函附件)
              </h3>
              <button
                onClick={() => setShowItemPicker(false)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="搜索装备名、描述、特效..."
                  value={itemSearchText}
                  onChange={(e) => setItemSearchText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={itemTypeFilter}
                onChange={(e) => setItemTypeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-200 focus:outline-none"
              >
                <option value="all">全部分类</option>
                <option value="weapon">武器 (Weapons)</option>
                <option value="armor">衣服 (Armor)</option>
                <option value="helmet">头盔 (Helmets)</option>
                <option value="necklace">项链 (Necklaces)</option>
                <option value="ring">戒指 (Rings)</option>
                <option value="bracelet">手镯 (Bracelets)</option>
                <option value="special_ring">特戒 (Special Rings)</option>
                <option value="potion">药剂 (Potions)</option>
                <option value="material">材料 (Materials)</option>
              </select>
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-1 custom-scrollbar">
              {filteredDatabaseItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 hover:border-amber-500 hover:bg-slate-800/80 cursor-pointer flex items-center gap-2.5 transition-all group"
                >
                  <span className="text-2xl shrink-0 group-hover:scale-110 transition-all">{item.icon}</span>
                  <div className="min-w-0 flex-1">
                    <h5 className={`text-xs font-bold truncate ${
                      item.rarity === 'mythic' ? 'text-rose-400' :
                      item.rarity === 'legendary' ? 'text-amber-400' :
                      item.rarity === 'epic' ? 'text-purple-400' :
                      item.rarity === 'rare' ? 'text-blue-400' : 'text-slate-300'
                    }`}>
                      {item.name}
                    </h5>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.description}</p>
                    <span className="text-[9px] bg-slate-950 px-1 py-0.2 rounded text-slate-400 border border-slate-800">
                      需求 LV.{item.reqLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
