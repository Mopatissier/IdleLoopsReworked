"use strict";
function initializeStats() {
    for (let i = 0; i < statList.length; i++) {
        addNewStat(statList[i]);
    }
}

function addNewStat(name) {
    stats[name] = {};
    stats[name].exp = 0;
    stats[name].talent = 0;
    stats[name].soulstone = 0;
}

function initializeSkills() {
    for (let i = 0; i < skillList.length; i++) {
        addNewSkill(skillList[i]);
    }
}

function addNewSkill(name) {
    skills[name] = {};
    skills[name].exp = 0;
}

function initializeSkillsSquirrel(){
	for(let i = 0; i < skillSquirrelList.length; i++) {
		addNewSkillSquirrel(skillSquirrelList[i]);
	}
}

function addNewSkillSquirrel(name){
	skillsSquirrel[name] = {};
	skillsSquirrel[name].exp = 0;
}

function initializeBuffs() {
    for (let i = 0; i < buffList.length; i++) {
        addNewBuff(buffList[i]);
    }
}

function addNewBuff(name) {
    buffs[name] = {};
    buffs[name].amt = 0;
}

function getLevel(stat) {
    return getLevelFromExp(stats[stat].exp);
}

/*function getTotalTalentLevel() {
    return Math.floor(Math.pow(totalTalent, 0.2));
}

function getTotalTalentPrc() {
    return (Math.pow(totalTalent, 0.2) - Math.floor(Math.pow(totalTalent, 0.2))) * 100;
}*/

function getLevelFromExp(exp) {
    return Math.floor((Math.sqrt(8 * exp / 100 + 1) - 1) / 2);
}

function getExpOfLevel(level) {
    return level * (level + 1) * 50;
}

function getTalent(stat) {
    return getLevelFromTalent(stats[stat].talent);
}

function getLevelFromTalent(exp) {
    return Math.floor((Math.sqrt(8 * exp / 100 + 1) - 1) / 2);
}

function getExpOfTalent(level) {
    return level * (level + 1) * 50;
}

function getPrcToNextLevel(stat) {
    const expOfCurLevel = getExpOfLevel(getLevel(stat));
    const curLevelProgress = stats[stat].exp - expOfCurLevel;
    const nextLevelNeeds = getExpOfLevel(getLevel(stat) + 1) - expOfCurLevel;
    return Math.floor(curLevelProgress / nextLevelNeeds * 100 * 10) / 10;
}

function getPrcToNextTalent(stat) {
    const expOfCurLevel = getExpOfTalent(getTalent(stat));
    const curLevelProgress = stats[stat].talent - expOfCurLevel;
    const nextLevelNeeds = getExpOfTalent(getTalent(stat) + 1) - expOfCurLevel;
    return Math.floor(curLevelProgress / nextLevelNeeds * 100 * 10) / 10;
}

function getSkillLevelFromExp(exp) {
    return Math.floor((Math.sqrt(8 * exp / 100 + 1) - 1) / 2);
}

function getExpOfSkillLevel(level) {
    return level * (level + 1) * 50;
}

function getSkillLevel(skill) {
    return getSkillLevelFromExp(skills[skill].exp);
}

function getSkillBonus(skill) {
    let change;
    if (skill === "Chronomancy" || skill === "Mercantilism" || skill === "Divine" || skill === "Wunderkind" || skill === "Thievery") change = "increase";
    else if (skill === "Spatiomancy" || skill === "Commune" || skill === "Gluttony") change = "decrease";
    else console.log("Skill not found:" + skill);

    if(change == "increase") return Math.pow(1 + getSkillLevel(skill) / 60, 0.25);
    else if (change == "decrease") return 1 / (1 + getSkillLevel(skill) / 100);
    else return 0;
}

function getYinYangBonus(skill){
	if(skill === "Yin"){
		
		let bonusYin = Math.min(100, getSkillLevel("Yin") * 0.5);
		const capReputation = Math.max(getBuffLevel("YinYang"), resources.reputation * (-1)) * 2;
		bonusYin = Math.min(capReputation, bonusYin);
		
		return (1 + bonusYin/100);
		
	} else if (skill === "Yang"){
		
		let bonusYang = Math.min(100, getSkillLevel("Yang") * 0.5);
		const capReputation = Math.max(getBuffLevel("YinYang"), resources.reputation) * 2;
		bonusYang = Math.min(capReputation, bonusYang);
		return (1 + bonusYang/100);
		
	} else if (skill === "YinYang"){
		
		let bonusYin = Math.min(100, getSkillLevel("Yin") * 0.5);
		const capYinReputation = Math.max(getBuffLevel("YinYang"), resources.reputation * (-1)) * 2;
		bonusYin = Math.min(capYinReputation, bonusYin);
		
		let bonusYang = Math.min(100, getSkillLevel("Yang") * 0.5);
		const capYangReputation = Math.max(getBuffLevel("YinYang"), resources.reputation) * 2;
		bonusYang = Math.min(capYangReputation, bonusYang);
		
		return (1 + bonusYin/100) * (1 + bonusYang/100);
		
	} else {
		return 0;
	}
}

function getNumberSoulstonesLargeDungeon(){
	let numberOfSoulstones = 10;
	numberOfSoulstones = numberOfSoulstones / (1 +resources.teamMembers);
	numberOfSoulstones = numberOfSoulstones * (1 + getSkillLevel("TeamWork")/200);
	numberOfSoulstones = Math.min(10, Math.floor(numberOfSoulstones));
	return numberOfSoulstones;
}

function getSkillMod(name, min, max, percentChange) {
    if (getSkillLevel(name) < min) return 1;
    else return 1 + Math.min(getSkillLevel(name) - min, max-min) * percentChange / 100;
}

function getSkillSquirrelLevelFromExp(exp) {
    return Math.floor((Math.sqrt(8 * exp / 100 + 1) - 1) / 2);
}

function getExpOfSkillSquirrelLevel(level) {
    return level * (level + 1) * 50;
}

function getSkillSquirrelLevel(skillSquirrel) {
    return getSkillSquirrelLevelFromExp(skillsSquirrel[skillSquirrel].exp);
}

function getBuffLevel(buff) {
    return buffs[buff].amt;
}

function getRitualBonus(min, max, speed)
{
    if (getBuffLevel("Ritual") < min) return 1;
    else return 1 + Math.min(getBuffLevel("Ritual") - min, max-min) * speed / 100;
}

function getSurveyBonus(town)
{
    return town.getLevel("Survey") * .005;
}

function getArmorLevel() {
    return 1 + ((resources.armor + 3 * resources.enchantments) * getCraftGuildRank().bonus) / 5;
}

function getSelfCombat() {
    return (getSkillLevel("Combat") + getSkillLevel("Pyromancy") * 5) * getArmorLevel() * (1 + getBuffLevel("Feast") * .05);
}

function getTeamCombat() {
    return ((getSelfCombat()/200) * Math.pow(200, resources.teamMembers) * (1 + getSkillLevel("TeamWork")/10));
}


function getPrcToNextSkillLevel(skill) {
    const expOfCurLevel = getExpOfSkillLevel(getSkillLevel(skill));
    const curLevelProgress = skills[skill].exp - expOfCurLevel;
    const nextLevelNeeds = getExpOfSkillLevel(getSkillLevel(skill) + 1) - expOfCurLevel;
    return Math.floor(curLevelProgress / nextLevelNeeds * 100 * 10) / 10;
}

function getPrcToNextSkillSquirrelLevel(skillSquirrel) {
    const expOfCurLevel = getExpOfSkillSquirrelLevel(getSkillSquirrelLevel(skillSquirrel));
    const curLevelProgress = skillsSquirrel[skillSquirrel].exp - expOfCurLevel;
    const nextLevelNeeds = getExpOfSkillSquirrelLevel(getSkillSquirrelLevel(skillSquirrel) + 1) - expOfCurLevel;
    return Math.floor(curLevelProgress / nextLevelNeeds * 100 * 10) / 10;
}

function addSkillExp(name, amount) {
    if (name === "Combat" || name === "Pyromancy" || name === "Restoration") amount *= 1 + getBuffLevel("Heroism") * 0.02;
    skills[name].exp += amount;
	if(name === "Yin" || name === "Yang") updateYinYanBuff();
    view.requestUpdate("updateSkill", name);
}

function addSkillSquirrelExp(name, amount) {
    skillsSquirrel[name].exp += amount;
    view.requestUpdate("updateSkillSquirrel", name);
}

function handleSkillExp(list) {
    for (const skill in list) {
        if (Number.isInteger(list[skill])) addSkillExp(skill, list[skill]);
        else addSkillExp(skill, list[skill]());
    }
}

function handleSkillSquirrelExp(list) {
    for (const skillSquirrel in list) {
        if (Number.isInteger(list[skillSquirrel])) addSkillSquirrelExp(skillSquirrel, list[skillSquirrel]);
        else addSkillSquirrelExp(skillSquirrel, list[skillSquirrel]());
    }
}

function initializeSquirrelLevels() {
	
	for(const action of totalActionList){
		addSquirrelLevel(action);
	}

}

function addSquirrelLevel(action) {
	squirrelLevel[camelize(action.varName)] = 0;
}

function initializeFavModes() {
	
	for(const action of totalActionList){
		addFavMode(action);
	}
	
}

function addFavMode(action){
	favMode[camelize(action.name)] = fav.none;
}

function addBuffAmt(name, amount) {
    if (getBuffLevel(name) === buffCaps[name]) return;
    buffs[name].amt += amount;
    view.updateBuff(name);
}

function setBuffAmt(name, amount) {
	if (amount > buffHardCaps[name]) amount = buffHardCaps[name];
	buffs[name].amt = amount;
	view.updateBuff(name);
}

function addExp(name, amount) {
    stats[name].exp += amount;
    const aspirantBonus = getBuffLevel("Aspirant") ?  getBuffLevel("Aspirant") * 0.01 : 0;
    let talentGain = (amount * getSkillBonus("Wunderkind") + amount * aspirantBonus) / 100;
    stats[name].talent += talentGain;
    totalTalent += talentGain;
    view.requestUpdate("updateStat", name);
}

function restartStats() {
    for (let i = 0; i < statList.length; i++) {
        if(getSkillLevel("Wunderkind") > 0) stats[statList[i]].exp = getExpOfLevel(getBuffLevel("Imbuement2") * 2);
        else stats[statList[i]].exp = getExpOfLevel(getBuffLevel("Imbuement2"));
        view.updateStat(statList[i]);
    }
}

function getTotalBonusXP(statName) {
    const soulstoneBonus = stats[statName].soulstone ? calcSoulstoneMult(stats[statName].soulstone) : 1;
    return soulstoneBonus * calcTalentMult(getTalent(statName));
}