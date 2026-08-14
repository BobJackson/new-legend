import React, { useState } from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { Mail, MailType } from '../../types/game';
import { ITEM_DATABASE } from '../../data/items';
import { 
  X, 
  Mail as MailIcon, 
  MailOpen, 
  Trash2, 
  Gift, 
  Sparkles, 
  Clock, 
  Coins, 
  Gem, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  PackageCheck,
  RefreshCw
} from 'lucide-react';

interface MailModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const MailModal: React.FC<MailModalProps> = ({ engine, onClose }) => {
  const [selectedMailId, setSelectedMailId] = useState<string | null>(
    engine.mails.length > 0 ? engine.mails[0].id : null
  );
  const [activeTab, setActiveTab] = useState<'all' | MailType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const mails = engine.mails;

  const filteredMails = mails.filter(m => {
    if (activeTab === 'all') return true;
    return m.type === activeTab;
  });

  const selectedMail = mails.find(m => m.id === selectedMailId) || filteredMails[0] || null;

  const handleSelectMail = (mail: Mail) => {
    setSelectedMailId(mail.id);
    if (!mail.isRead) {
      engine.markMailRead(mail.id);
    }
  };

  const handleClaim = async (mailId: string) => {
    const res = await engine.claimMail(mailId);
    setActionFeedback(res.message);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleClaimAll = async () => {
    const res = await engine.claimAllMails();
    setActionFeedback(res.message);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleDelete = async (mailId: string) => {
    await engine.deleteMail(mailId);
    if (selectedMailId === mailId) {
      const remaining = engine.mails.filter(m => m.id !== mailId);
      setSelectedMailId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleDeleteClaimed = async () => {
    const count = await engine.deleteReadAndClaimedMails();
    setActionFeedback(`已清理 ${count} 封已读已领取邮件！`);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await engine.refreshMails();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getTypeLabel = (type: MailType) => {
    switch (type) {
      case 'event': return { label: '活动庆典', color: 'bg-amber-950 text-amber-300 border-amber-800' };
      case 'compensation': return { label: '维护补偿', color: 'bg-blue-950 text-blue-300 border-blue-800' };
      case 'gm': return { label: 'GM特令', color: 'bg-purple-950 text-purple-300 border-purple-800' };
      case 'guild': return { label: '行会通知', color: 'bg-emerald-950 text-emerald-300 border-emerald-800' };
      case 'system':
      default: return { label: '系统通知', color: 'bg-slate-900 text-slate-300 border-slate-700' };
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '刚刚';
    try {
      const d = new Date(isoString);
      return `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return isoString;
    }
  };

  const unreadCount = engine.getUnreadMailsCount();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 select-none animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[640px] bg-slate-900 border-2 border-amber-700/70 rounded-2xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-inner">
              <MailIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-amber-200 tracking-wider">
                  玛法皇家信使 · 邮件中心
                </h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                    {unreadCount} 封待处理
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-400/70">
                接收系统通告、活动奖励与补偿礼包，邮件附件保留30天
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`p-1.5 bg-slate-800 hover:bg-slate-700 border border-amber-900/50 rounded-lg text-amber-300 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
              title="刷新邮件"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800/80 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-700 rounded-lg text-slate-400 hover:text-rose-200 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Toast */}
        {actionFeedback && (
          <div className="bg-amber-950/90 border-b border-amber-500/50 px-4 py-2 text-xs text-amber-200 font-bold flex items-center justify-center gap-2 animate-fadeIn">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Mail List & Filter */}
          <div className="w-full md:w-80 border-r border-amber-950/80 bg-slate-950/60 flex flex-col justify-between">
            {/* Filter Tabs */}
            <div className="p-2 border-b border-slate-800/80 flex items-center gap-1 overflow-x-auto text-[11px]">
              {[
                { id: 'all', name: '全部' },
                { id: 'event', name: '活动' },
                { id: 'compensation', name: '补偿' },
                { id: 'gm', name: 'GM令' },
                { id: 'system', name: '系统' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-amber-600 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-amber-200 hover:bg-slate-800'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {filteredMails.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-slate-500 text-xs text-center">
                  <MailOpen className="w-10 h-10 mb-2 text-slate-700 stroke-1" />
                  <p>信箱空空如也</p>
                  <p className="text-[10px] text-slate-600 mt-1">暂无相关邮件记录</p>
                </div>
              ) : (
                filteredMails.map(mail => {
                  const isSelected = selectedMail?.id === mail.id;
                  const hasAtt = engine.hasAttachment(mail);
                  const typeCfg = getTypeLabel(mail.type);

                  return (
                    <div
                      key={mail.id}
                      onClick={() => handleSelectMail(mail)}
                      className={`relative p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-amber-950/50 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                          : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      {/* Unread Red Dot */}
                      {!mail.isRead && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
                      )}

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                        <h4 className={`text-xs font-bold truncate flex-1 ${isSelected ? 'text-amber-200' : 'text-slate-200'}`}>
                          {mail.title}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                        <span className="truncate max-w-[120px]">{mail.sender}</span>
                        <span className="text-slate-500">{formatDate(mail.sentAt)}</span>
                      </div>

                      {/* Attachment Status Badge */}
                      <div className="flex items-center justify-between pt-1 mt-0.5 border-t border-slate-800/60 text-[10px]">
                        {hasAtt ? (
                          mail.isClaimed ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> 附件已领取
                            </span>
                          ) : (
                            <span className="text-yellow-400 font-bold flex items-center gap-1 animate-pulse">
                              <Gift className="w-3 h-3 text-yellow-400" /> 含未领附件
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500">无附件通知</span>
                        )}

                        <span className="text-[9px] text-slate-500">
                          {mail.isRead ? '已读' : '未读'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions for List */}
            <div className="p-2.5 bg-slate-950 border-t border-slate-800/80 flex items-center gap-2">
              <button
                onClick={handleDeleteClaimed}
                className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                title="清理所有已读且已领取的邮件"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清理已领</span>
              </button>

              <button
                onClick={handleClaimAll}
                className="flex-1 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:brightness-110 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>一键领取</span>
              </button>
            </div>
          </div>

          {/* Right Column: Mail Details */}
          <div className="flex-1 bg-slate-900/90 flex flex-col justify-between overflow-y-auto">
            {selectedMail ? (
              <div className="p-5 flex flex-col gap-4 flex-1">
                
                {/* Mail Header Info */}
                <div className="border-b border-amber-900/40 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded border font-bold ${getTypeLabel(selectedMail.type).color}`}>
                      {getTypeLabel(selectedMail.type).label}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-amber-200">
                      {selectedMail.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                    <span>发件人: <strong className="text-amber-300">{selectedMail.sender}</strong></span>
                    <span>发信时间: <strong className="text-slate-300">{new Date(selectedMail.sentAt).toLocaleString()}</strong></span>
                    {selectedMail.targetType === 'player' && (
                      <span className="text-purple-300 font-bold bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-800">
                        👑 定向发放
                      </span>
                    )}
                  </div>
                </div>

                {/* Mail Content Text */}
                <div className="bg-slate-950/80 border border-amber-900/30 rounded-xl p-4 text-amber-100/90 text-sm leading-relaxed whitespace-pre-wrap shadow-inner font-sans">
                  {selectedMail.content}
                </div>

                {/* Mail Attachments Display */}
                {engine.hasAttachment(selectedMail) && (
                  <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 shadow-inner">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                        <Gift className="w-4 h-4 text-yellow-400" />
                        邮件随函附件奖励清单
                      </h4>
                      {selectedMail.isClaimed && (
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 已存入角色账户与背包
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Gold */}
                      {selectedMail.attachment?.gold && selectedMail.attachment.gold > 0 ? (
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-amber-700/40 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <Coins className="w-5 h-5 text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] text-slate-400 font-bold">金币</div>
                            <div className="text-xs font-black text-amber-300 truncate">
                              +{selectedMail.attachment.gold.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Ingot */}
                      {selectedMail.attachment?.ingot && selectedMail.attachment.ingot > 0 ? (
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-yellow-700/40 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0">
                            <Gem className="w-5 h-5 text-yellow-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] text-slate-400 font-bold">元宝</div>
                            <div className="text-xs font-black text-yellow-300 truncate">
                              +{selectedMail.attachment.ingot.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* EXP Pill */}
                      {selectedMail.attachment?.expPills && selectedMail.attachment.expPills > 0 ? (
                        <div className="bg-slate-950 p-2.5 rounded-lg border border-purple-700/40 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded bg-purple-500/20 flex items-center justify-center text-lg shrink-0">
                            ⚡
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] text-purple-300 font-bold">直升经验丹</div>
                            <div className="text-xs font-black text-purple-200">
                              x{selectedMail.attachment.expPills}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Items & Equipment */}
                      {selectedMail.attachment?.items?.map((it, idx) => {
                        const itemTemplate = it.customItem || ITEM_DATABASE[it.itemId];
                        if (!itemTemplate) return null;

                        return (
                          <div 
                            key={idx}
                            className="bg-slate-950 p-2.5 rounded-lg border border-amber-900/50 flex items-center gap-2.5 hover:border-amber-500 transition-all group relative"
                            title={`${itemTemplate.name}\n${itemTemplate.description}`}
                          >
                            <span className="text-2xl shrink-0">{itemTemplate.icon}</span>
                            <div className="min-w-0 flex-1">
                              <div className={`text-xs font-bold truncate ${
                                itemTemplate.rarity === 'mythic' ? 'text-rose-400 font-black' :
                                itemTemplate.rarity === 'legendary' ? 'text-amber-400' :
                                itemTemplate.rarity === 'epic' ? 'text-purple-400' :
                                itemTemplate.rarity === 'rare' ? 'text-blue-400' : 'text-slate-200'
                              }`}>
                                {itemTemplate.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold">
                                数量: x{it.count || 1}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bottom Detail Action Toolbar */}
                <div className="mt-auto pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => handleDelete(selectedMail.id)}
                    className="px-3 py-2 bg-slate-950 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-700 text-slate-400 hover:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>删除邮件</span>
                  </button>

                  {engine.hasAttachment(selectedMail) ? (
                    <button
                      onClick={() => handleClaim(selectedMail.id)}
                      disabled={selectedMail.isClaimed}
                      className={`px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-md ${
                        selectedMail.isClaimed
                          ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 text-slate-950 hover:brightness-110 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                      }`}
                    >
                      {selectedMail.isClaimed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>已领取附件</span>
                        </>
                      ) : (
                        <>
                          <Gift className="w-4 h-4" />
                          <span>立即领取附件</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-slate-600" />
                      <span>通知型邮件已查阅</span>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-slate-500 text-xs">
                <MailOpen className="w-12 h-12 mb-3 text-slate-700 stroke-1" />
                <p className="text-sm text-slate-400 font-bold">请从左侧选择要查看的邮件</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
