// A hand-built, realistic D&D Beyond export used both as a test fixture and as
// the in-app "Try a sample character" option. It is a Level 5 Half-Elf Bard
// (College of Lore) whose final numbers are known, so the parser's math can be
// asserted against it.
//
// Expected derived values:
//   Abilities: STR 8(-1) DEX 15(+2) CON 14(+2) INT 10(+0) WIS 12(+1) CHA 19(+4)
//   Proficiency bonus: +3 (level 5)
//   Saves: DEX +5, CHA +7 (proficient); others = ability mod
//   Persuasion +10 & Perception +7 (expertise), Performance/Deception +7 (prof)
//   Passive Perception: 17
//   Max HP: 38 (28 base + CON 2 x 5)
//   AC: 14 (studded leather 12 + DEX 2)
//   Spell save DC 15, spell attack +7

export const sampleDdbCharacter = {
  id: 999999,
  name: 'Lyra Quickwit',
  alignmentId: 5,
  decorations: { avatarUrl: null },

  stats: [
    { id: 1, value: 8 },
    { id: 2, value: 14 },
    { id: 3, value: 13 },
    { id: 4, value: 10 },
    { id: 5, value: 12 },
    { id: 6, value: 15 },
  ],
  bonusStats: [
    { id: 1, value: null },
    { id: 2, value: null },
    { id: 3, value: null },
    { id: 4, value: null },
    { id: 5, value: null },
    { id: 6, value: null },
  ],
  overrideStats: [
    { id: 1, value: null },
    { id: 2, value: null },
    { id: 3, value: null },
    { id: 4, value: null },
    { id: 5, value: null },
    { id: 6, value: null },
  ],

  baseHitPoints: 28,
  bonusHitPoints: null,
  overrideHitPoints: null,
  removedHitPoints: 0,
  temporaryHitPoints: 0,

  currencies: { cp: 0, sp: 5, ep: 0, gp: 75, pp: 1 },

  race: {
    fullName: 'Half-Elf',
    baseRaceName: 'Half-Elf',
    weightSpeeds: { normal: { walk: 30 } },
    racialTraits: [
      { definition: { name: 'Darkvision', description: 'You can see in dim light within 60 feet as if it were bright light.' } },
      { definition: { name: 'Fey Ancestry', description: 'You have advantage on saving throws against being charmed, and magic can’t put you to sleep.' } },
      { definition: { name: 'Skill Versatility', description: 'You gain proficiency in two skills of your choice.' } },
    ],
  },

  background: { definition: { name: 'Entertainer' } },

  classes: [
    {
      level: 5,
      subclassDefinition: { name: 'College of Lore' },
      definition: {
        name: 'Bard',
        hitDice: 8,
        canCastSpells: true,
        spellCastingAbilityId: 6,
        spellRules: {
          levelSpellSlots: [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [2, 0, 0, 0, 0, 0, 0, 0, 0],
            [3, 0, 0, 0, 0, 0, 0, 0, 0],
            [4, 2, 0, 0, 0, 0, 0, 0, 0],
            [4, 3, 0, 0, 0, 0, 0, 0, 0],
            [4, 3, 2, 0, 0, 0, 0, 0, 0],
          ],
        },
        classFeatures: [
          { definition: { name: 'Bardic Inspiration', requiredLevel: 1, description: 'You can inspire others through stirring words or music. Bonus action; grant a d6 (scales with level).' } },
          { definition: { name: 'Jack of All Trades', requiredLevel: 2, description: 'Add half your proficiency bonus to any ability check that doesn’t already include it.' } },
          { definition: { name: 'Expertise', requiredLevel: 3, description: 'Double your proficiency bonus for two chosen skills.' } },
          { definition: { name: 'Font of Inspiration', requiredLevel: 5, description: 'You regain all expended Bardic Inspiration on a short or long rest.' } },
          { definition: { name: 'Magical Secrets', requiredLevel: 10, description: 'Learn spells from any class.' } },
        ],
      },
    },
  ],

  modifiers: {
    race: [
      { type: 'bonus', subType: 'charisma-score', value: 2 },
      { type: 'bonus', subType: 'dexterity-score', value: 1 },
      { type: 'bonus', subType: 'constitution-score', value: 1 },
    ],
    class: [
      { type: 'proficiency', subType: 'dexterity-saving-throws' },
      { type: 'proficiency', subType: 'charisma-saving-throws' },
      { type: 'proficiency', subType: 'persuasion' },
      { type: 'proficiency', subType: 'performance' },
      { type: 'proficiency', subType: 'deception' },
      { type: 'proficiency', subType: 'perception' },
      { type: 'expertise', subType: 'persuasion' },
      { type: 'expertise', subType: 'perception' },
      // Ability Score Improvement chosen at level 4.
      { type: 'bonus', subType: 'charisma-score', value: 2 },
    ],
    background: [],
    feat: [],
    item: [],
    condition: [],
  },

  inventory: [
    {
      id: 101,
      equipped: true,
      isAttuned: false,
      quantity: 1,
      definition: {
        id: 1,
        name: 'Studded Leather Armor',
        filterType: 'Armor',
        armorTypeId: 1,
        armorClass: 12,
        weight: 13,
        rarity: 'Common',
        magic: false,
        description: 'Light armor made of tough but flexible leather reinforced with rivets.',
      },
    },
    {
      id: 102,
      equipped: true,
      isAttuned: false,
      quantity: 1,
      definition: {
        id: 2,
        name: 'Rapier',
        filterType: 'Weapon',
        attackType: 1,
        damage: { diceCount: 1, diceValue: 8, diceString: '1d8' },
        damageType: 'Piercing',
        properties: [{ name: 'Finesse' }],
        range: 5,
        weight: 2,
        rarity: 'Common',
        description: 'A slender, sharply pointed sword.',
      },
    },
    {
      id: 103,
      equipped: false,
      isAttuned: false,
      quantity: 1,
      definition: {
        id: 3,
        name: 'Lute',
        filterType: 'Tools',
        weight: 2,
        rarity: 'Common',
        description: 'A stringed musical instrument; your spellcasting focus.',
      },
    },
  ],

  classSpells: [
    {
      characterClassId: 1,
      spells: [
        { prepared: true, definition: { name: 'Vicious Mockery', level: 0, school: 'Enchantment', activation: { activationType: 1, activationTime: 1 }, range: { origin: 'Ranged', rangeValue: 60 }, duration: { durationType: 'Instantaneous' }, components: [1], concentration: false, ritual: false, description: 'You unleash a string of insults laced with subtle enchantments. One creature you can see must succeed on a Wisdom save or take 1d4 psychic damage and have disadvantage on its next attack.' } },
        { prepared: true, definition: { name: 'Healing Word', level: 1, school: 'Evocation', activation: { activationType: 3, activationTime: 1 }, range: { origin: 'Ranged', rangeValue: 60 }, duration: { durationType: 'Instantaneous' }, components: [1], concentration: false, ritual: false, description: 'A creature of your choice regains hit points equal to 1d4 + your spellcasting ability modifier.' } },
        { prepared: true, definition: { name: 'Cure Wounds', level: 1, school: 'Evocation', activation: { activationType: 1, activationTime: 1 }, range: { origin: 'Touch' }, duration: { durationType: 'Instantaneous' }, components: [1, 2], concentration: false, ritual: false, description: 'A creature you touch regains 1d8 + your spellcasting ability modifier hit points.' } },
        { prepared: true, definition: { name: 'Shatter', level: 2, school: 'Evocation', activation: { activationType: 1, activationTime: 1 }, range: { origin: 'Ranged', rangeValue: 60 }, duration: { durationType: 'Instantaneous' }, components: [1, 2, 3], componentsDescription: 'A burst of mica', concentration: false, ritual: false, description: 'A sudden ringing noise erupts from a point of your choice. Creatures take 3d8 thunder damage (Con save for half).' } },
      ],
    },
  ],

  spells: { race: [], class: [], background: [], item: [], feat: [] },

  feats: [],

  notes: { backstory: 'A traveling performer collecting stories — and secrets — wherever the road leads.' },
}

export default sampleDdbCharacter
