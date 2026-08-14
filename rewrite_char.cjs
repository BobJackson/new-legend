const fs = require('fs');

const content = `import { CharacterData } from '../types/game';

export interface DrawCharacterOptions {
  ctx: CanvasRenderingContext2D;
  px: number;
  py: number;
  playerCenterY: number;
  character: CharacterData;
  previewEquipment?: CharacterData['equipment'];
  now: number;
  scale?: number;
  isAttacking?: boolean;
  attackProgress?: number;
  isMoving?: boolean;
  moveProgress?: number;
  isMounted?: boolean;
  actionOverride?: 'idle' | 'walk' | 'attack' | 'cast' | 'struck' | 'die';
  lookAtTarget?: { x: number; y: number };
}

// 缓存已加载的图片 (在实际项目中也可以预加载 WIL/WZL 中的资源)
const imageCache = new Map<string, HTMLImageElement>();

export const loadSprite = (url: string): HTMLImageElement => {
  if (imageCache.has(url)) return imageCache.get(url)!;
  const img = new Image();
  img.src = url;
  imageCache.set(url, img);
  return img;
};

// ==========================================
// 真实项目中这里会基于 WIL/WZL 提取的图集 URL 进行拼接
// ==========================================
const getAssetUrl = (type: string, id: string) => \`/assets/sprites/\${type}/\${id}.png\`;

export function drawCharacterAvatar(options: DrawCharacterOptions) {
  const {
    ctx, px, py, playerCenterY, character,
    previewEquipment, now, actionOverride,
    isAttacking, isMoving, isMounted, scale = 1.0
  } = options;

  const { profession, gender, state } = character;
  
  // 1. 决定当前的逻辑动画状态
  let action = actionOverride || state?.action || 'idle';
  if (isAttacking) action = 'attack';
  else if (isMoving) action = 'walk';
  
  const direction = state?.direction || { x: 0, y: 1 };
  
  // 2. 将 direction 向量转换为传奇 8 方向索引 (0-7)
  // 标准传奇方向定义：0上, 1右上, 2右, 3右下, 4下, 5左下, 6左, 7左上
  let dirIndex = 4; 
  if (direction.x === 0 && direction.y < 0) dirIndex = 0;
  else if (direction.x > 0 && direction.y < 0) dirIndex = 1;
  else if (direction.x > 0 && direction.y === 0) dirIndex = 2;
  else if (direction.x > 0 && direction.y > 0) dirIndex = 3;
  else if (direction.x === 0 && direction.y > 0) dirIndex = 4;
  else if (direction.x < 0 && direction.y > 0) dirIndex = 5;
  else if (direction.x < 0 && direction.y === 0) dirIndex = 6;
  else if (direction.x < 0 && direction.y < 0) dirIndex = 7;

  // 3. 计算帧数与播放进度
  // 模拟真实图集中的配置
  const animConfig: Record<string, { frames: number, speed: number }> = {
    idle: { frames: 4, speed: 400 },
    walk: { frames: 6, speed: 120 },
    run: { frames: 6, speed: 90 },
    attack: { frames: 6, speed: 80 },
    cast: { frames: 6, speed: 90 },
    die: { frames: 4, speed: 200 }
  };
  
  const config = animConfig[action] || animConfig['idle'];
  const frameIndex = Math.floor(now / config.speed) % config.frames;

  // 4. 解析装备数据
  const equipment = previewEquipment || character.equipment;
  const armor = equipment?.armor;
  const weapon = equipment?.weapon;
  const wings = equipment?.wings;
  
  const bodyId = \`\${profession}_\${gender}\`;
  const armorId = armor ? armor.id : 'base';
  const weaponId = weapon ? weapon.id : null;
  const wingsId = wings ? wings.id : null;

  // 传奇渲染层级：
  // 身体(含衣服) -> 武器 -> 翅膀 (方向不同时可能会有调整，例如向上走武器可能在衣服下面)
  // 此处做简单实现
  const layers = [
    { type: 'body', id: bodyId },
    { type: 'armor', id: armorId }
  ];
  if (weaponId) layers.push({ type: 'weapon', id: weaponId });
  if (wingsId) layers.push({ type: 'wings', id: wingsId });
  if (isMounted) layers.unshift({ type: 'mount', id: 'horse' }); // 坐骑在底层

  // 5. 渲染参数
  // 假设导出的精灵图图块标准尺寸
  const frameWidth = 120; 
  const frameHeight = 150; 
  
  // 图集排布规则：Row = dirIndex, Col = frameIndex
  const srcX = frameIndex * frameWidth;
  const srcY = dirIndex * frameHeight;
  
  // 画布定位：让角色的中心对齐到传入的坐标
  const drawX = px - (frameWidth * scale) / 2;
  const drawY = py - (frameHeight * scale) + 10;

  ctx.save();
  
  let hasDrawnAnything = false;

  // 6. 依次渲染图集图层
  for (const layer of layers) {
    const url = getAssetUrl(layer.type, layer.id);
    const img = loadSprite(url);
    
    // 如果图片已经加载完成并且有效，则渲染
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(
        img,
        srcX, srcY, frameWidth, frameHeight,
        drawX, drawY, frameWidth * scale, frameHeight * scale
      );
      hasDrawnAnything = true;
    }
  }

  // 7. 若没有任何素材加载成功，降级绘制程序化占位符 (防止黑屏并保障开发体验)
  if (!hasDrawnAnything) {
    drawPlaceholder(ctx, px, py, playerCenterY, character, action, dirIndex, frameIndex, scale, isMounted);
  }

  ctx.restore();
}

// ==========================================
// Fallback: 占位符渲染 (在 Sprite 图集缺失时显示)
// ==========================================
const drawPlaceholder = (
  ctx: CanvasRenderingContext2D, 
  px: number, py: number, 
  playerCenterY: number, 
  character: CharacterData,
  action: string,
  dirIndex: number,
  frameIndex: number,
  scale: number,
  isMounted: boolean | undefined
) => {
  ctx.save();
  ctx.scale(scale, scale);
  
  // 根据原始 scale 还原坐标计算 (因为整体被 scale 了)
  const spx = px / scale;
  const spy = py / scale;
  const scy = playerCenterY / scale;

  // 呼吸动画
  const bob = (action === 'idle') ? Math.sin(Date.now() / 200) * 2 : 0;
  let cy = scy + bob;

  // 脚下阴影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(spx, spy, 16, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // 坐骑占位符
  if (isMounted) {
    ctx.fillStyle = '#78350f'; // 马的颜色
    ctx.fillRect(spx - 15, cy - 10, 30, 20); // 马身
    ctx.fillRect(spx + (dirIndex > 2 && dirIndex < 6 ? -20 : 10), cy - 20, 10, 15); // 马头
    cy -= 15; // 人物抬高
  }

  // 职业专属颜色
  let baseColor = '#94a3b8'; 
  if (character.profession === 'warrior') baseColor = '#ef4444';
  if (character.profession === 'mage') baseColor = '#3b82f6';
  if (character.profession === 'taoist') baseColor = '#10b981';

  // 身体主干
  ctx.fillStyle = baseColor;
  ctx.fillRect(spx - 10, cy - 25, 20, 30);
  
  // 头部
  ctx.fillStyle = '#fcd34d'; 
  ctx.beginPath();
  ctx.arc(spx, cy - 30, 8, 0, Math.PI * 2);
  ctx.fill();

  // 面部方向特征 (眼睛)
  ctx.fillStyle = '#000';
  const lookDistance = 4;
  let lx = 0, ly = 0;
  switch (dirIndex) {
    case 0: ly = -lookDistance; break;
    case 1: lx = lookDistance; ly = -lookDistance; break;
    case 2: lx = lookDistance; break;
    case 3: lx = lookDistance; ly = lookDistance; break;
    case 4: ly = lookDistance; break;
    case 5: lx = -lookDistance; ly = lookDistance; break;
    case 6: lx = -lookDistance; break;
    case 7: lx = -lookDistance; ly = -lookDistance; break;
  }
  
  if (dirIndex >= 1 && dirIndex <= 7 && dirIndex !== 0) {
     ctx.beginPath();
     ctx.arc(spx + lx - 2, cy - 32 + ly, 1.5, 0, Math.PI*2);
     ctx.arc(spx + lx + 2, cy - 32 + ly, 1.5, 0, Math.PI*2);
     ctx.fill();
  }
  
  // 武器占位符
  const eq = character.equipment;
  if (eq?.weapon) {
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(spx + (dirIndex > 4 ? -15 : 15), cy - 10);
    ctx.lineTo(spx + (dirIndex > 4 ? -30 : 30), cy - 30);
    ctx.stroke();
  }
  
  // 翅膀占位符
  if (eq?.wings) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(spx - 5, cy - 20);
    ctx.lineTo(spx - 25, cy - 40);
    ctx.lineTo(spx - 15, cy - 10);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(spx + 5, cy - 20);
    ctx.lineTo(spx + 25, cy - 40);
    ctx.lineTo(spx + 15, cy - 10);
    ctx.fill();
  }

  // 状态 Debug 文本 (由于没有真实精灵图，保留这个有助于调试)
  ctx.fillStyle = '#fff';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(\`\${action} d:\${dirIndex} f:\${frameIndex}\`, spx, cy - 45);

  ctx.restore();
};
`;

fs.writeFileSync('src/utils/characterRenderer.ts', content);
console.log("Rewrote characterRenderer.ts");
