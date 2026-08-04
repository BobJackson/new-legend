import React, { useState } from 'react';
import { ProfessionType, GenderType, CharacterData } from '../types/game';
import { PROFESSIONS } from '../data/professions';
import { SKILL_TEMPLATES } from '../data/skills';
import { ITEM_DATABASE } from '../data/items';
import { Shield, Sparkles, Sword, UserCheck } from 'lucide-react';
import { CharacterPreviewCanvas } from './CharacterPreviewCanvas';

interface CharacterCreateProps {
  onCreate: (data: CharacterData) => void;
}

export const CharacterCreate: React.FC<CharacterCreateProps> = ({ onCreate }) => {
  const [name, setName] = useState('霸天战神');
  const [profession, setProfession] = useState<ProfessionType>('warrior');
  const [gender, setGender] = useState<GenderType>('male');

  const selectedProf = PROFESSIONS[profession];
  const profSkills = SKILL_TEMPLATES.filter(s => s.profession === profession);

  // Construct dummy character data for live preview canvas
  const starterWeapon = profession === 'warrior' ? ITEM_DATABASE['weapon_wooden_sword']
                      : profession === 'mage' ? ITEM_DATABASE['weapon_ebony_sword']
                      : ITEM_DATABASE['weapon_ebony_sword'];

  const previewCharData: CharacterData = {
    id: 'preview_char',
    name: name || '勇士',
    gender,
    profession,
    level: 1,
    exp: 0,
    maxExp: 100,
    gold: 5000,
    ingot: 100,
    rebirthLevel: 0,
    wingLevel: 0,
    title: '新手勇士',
    guildName: '',
    currentMapId: 'bichi_city',
    x: 10,
    y: 10,
    equipment: {
      weapon: starterWeapon,
      armor: ITEM_DATABASE['armor_cloth_shirt'],
      helmet: ITEM_DATABASE['helmet_bronze'],
      necklace: null,
      ringLeft: null,
      ringRight: null,
      braceletLeft: null,
      braceletRight: null,
      belt: null,
      boots: null
    },
    inventory: Array(40).fill(null),
    skills: [...profSkills],
    equippedSkills: profSkills.map(s => s.id),
    autoBattleSettings: {
      enabled: true,
      autoPotionHp: 50,
      autoPotionMp: 30,
      range: 10,
      pickupEnabled: true,
      pickupTypes: { gold: true, potion: true, equipment: true, material: true },
      pickupRarities: { common: true, uncommon: true, rare: true, epic: true, legendary: true, mythic: true },
      autoRecycleEnabled: true,
      autoRecycleOnFull: true,
      autoRecycleInstant: false,
      autoRecycleRarities: { common: true, uncommon: true, rare: false, epic: false, legendary: false, mythic: false },
      autoRecycleKeepOwnProfession: true
    },
    pet: null
  };

  const handleStartGame = () => {
    if (!name.trim()) return;

    const newChar: CharacterData = {
      ...previewCharData,
      id: `char_${Date.now()}`,
      name: name.trim()
    };

    newChar.inventory[0] = { ...ITEM_DATABASE['potion_sun_water'], count: 10 };
    newChar.inventory[1] = { ...ITEM_DATABASE['blessing_oil'], count: 3 };
    newChar.inventory[2] = { ...ITEM_DATABASE['black_iron_ore'], count: 5 };

    onCreate(newChar);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Retro Dragon & Fire Ambient Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/40 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl bg-slate-900/90 border-2 border-amber-800/60 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-[0_0_50px_rgba(217,119,6,0.2)]">
        {/* Title Banner */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-orange-600 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)]">
            热血传奇 · 玛法大陆
          </h1>
          <p className="text-amber-200/80 text-sm mt-2 font-medium">重温经典战法道 · 杀怪爆装 · 沙巴克誓死攻城</p>
        </div>

        {/* Main Grid: Left Selection & Skills, Right Live Pixel Canvas Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column: Profession Options & Skills */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['warrior', 'mage', 'taoist'] as ProfessionType[]).map((profKey) => {
                const config = PROFESSIONS[profKey];
                const isSelected = profession === profKey;

                return (
                  <button
                    key={profKey}
                    onClick={() => setProfession(profKey)}
                    className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                      isSelected
                        ? 'border-amber-500 bg-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-[1.02]'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 bg-amber-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        已选
                      </span>
                    )}
                    <span className="text-3xl mb-1">{config.icon}</span>
                    <h2 className="text-lg font-bold text-amber-200">{config.name}</h2>
                    <p className="text-[11px] text-amber-500 font-semibold mt-0.5 mb-1">{config.tagline}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{config.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Selected Profession Skill & Stats Preview */}
            <div className="bg-slate-950/70 rounded-xl p-4 border border-amber-900/40">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-amber-200">
                  {selectedProf.name} 专属技能与属性加成
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {profSkills.map(s => (
                  <div key={s.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start gap-2">
                    <span className="text-2xl">{s.icon}</span>
                    <div>
                      <div className="font-bold text-amber-300">{s.name} <span className="text-[10px] text-amber-500">(LV{s.reqLevel})</span></div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{s.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Animated Character Pixel Art Preview */}
          <div className="flex flex-col items-center justify-center bg-slate-950/80 rounded-xl p-4 border border-amber-900/50">
            <h4 className="text-xs font-extrabold text-amber-300 mb-2 tracking-wider flex items-center gap-1">
              <span>🔥</span> 传奇像素艺术渲染 preview
            </h4>
            <CharacterPreviewCanvas
              character={previewCharData}
              width={260}
              height={290}
            />
          </div>
        </div>

        {/* Character Naming & Gender Selection */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">性别:</span>
              <button
                onClick={() => setGender('male')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  gender === 'male' ? 'bg-amber-600 text-white border-amber-500 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                ♂️ 男主角 (霸气豪杰)
              </button>
              <button
                onClick={() => setGender('female')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  gender === 'female' ? 'bg-amber-600 text-white border-amber-500 shadow-md' : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
              >
                ♀️ 女主角 (巾帼侠客)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-slate-400 font-bold whitespace-nowrap">角色名称:</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={12}
              className="bg-slate-900 border border-amber-900/60 rounded-lg px-3 py-2 text-sm text-amber-200 focus:outline-none focus:border-amber-500 w-full sm:w-48 font-bold"
              placeholder="请输入角色名..."
            />
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-6 text-center">
          <button
            onClick={handleStartGame}
            className="w-full sm:w-80 py-4 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-amber-100 font-black text-lg tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(245,158,11,0.4)] border border-amber-400/40"
          >
            🔥 开启霸业 · 踏入玛法大陆
          </button>
        </div>
      </div>
    </div>
  );
};
