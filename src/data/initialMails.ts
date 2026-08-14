import { Mail } from '../types/game';

export const INITIAL_SYSTEM_MAILS: Mail[] = [
  {
    id: 'mail_welcome_package',
    sender: '玛法大陆使节',
    title: '【开服庆典】玛法至尊勇士迎新大礼包',
    content: '尊敬的玛法勇士：\n欢迎来到热血传奇世界！为助力各位勇士在玛法大陆斩妖除魔、成就宏图霸业，王城军需官特此奉上开服至尊迎新厚礼！请查收附件并在背包中妥善使用。愿您刀刀暴击，问鼎沙巴克！',
    type: 'event',
    sentAt: '2026-08-14T00:00:00.000Z',
    expiresAt: '2026-09-14T00:00:00.000Z',
    targetType: 'all',
    attachment: {
      gold: 500000,
      ingot: 888,
      expPills: 2,
      items: [
        { itemId: 'blessing_oil', count: 5 },
        { itemId: 'potion_sun_water', count: 20 },
        { itemId: 'black_iron_ore', count: 10 }
      ]
    },
    isRead: false,
    isClaimed: false
  },
  {
    id: 'mail_server_compensation',
    sender: '传奇运营团队',
    title: '【系统福利】全服性能优化与版本更新补偿',
    content: '各位热血勇士：\n我们已于近期完成了全服底层网络通信优化与爆率引擎升级。为感谢大家对玛法大陆的坚定支持与守候，现发放全服版本优化补偿福利，祝各位游戏愉快，神装爆满屏！',
    type: 'compensation',
    sentAt: '2026-08-14T01:30:00.000Z',
    expiresAt: '2026-09-14T01:30:00.000Z',
    targetType: 'all',
    attachment: {
      gold: 300000,
      ingot: 500,
      expPills: 1,
      items: [
        { itemId: 'pill_mount_advance', count: 15 },
        { itemId: 'potion_sun_water', count: 10 }
      ]
    },
    isRead: false,
    isClaimed: false
  }
];
