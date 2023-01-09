"use strict";

let screenSize;
let storeTextStories = [];
let storeCompletedStories = [];

function View() {
    this.initalize = function() {
        this.createStats();
        this.updateStats();
        this.updateSkills();
		this.updateSkillsSquirrel();
        this.updateBuffs();
        this.updateTime();
        this.updateNextActions();
        this.updateCurrentActionsDivs();
        this.updateTotalTicks();
        this.updateAddAmount(1);
        this.createTownActions();
        this.updateProgressActions();
        this.updateLockedHidden();
        this.updateSoulstones();
        this.showTown(0, arrow.none);
        this.showActions(false);
        this.updateTrainingLimits();
        this.changeStatView();
        this.changeTheme(true);
		this.createTravelMenu();
        this.adjustGoldCosts();
        this.adjustExpGains();
        this.updateTeamCombat();
        this.updateLoadoutNames();
        this.updateResources();
        this.updateTrials();
        setInterval(() => {
            if(!squirrelMode) view.updateStories();
            view.updateLockedHidden();
        }, 2000);
        adjustAll();
        this.updateActionTooltips();
		this.updateBuffCaps(true);
		this.updateStartingMana();
    };

    this.statLocs = [
        { x: 166, y: 45 },
        { x: 267, y: 80 },
        { x: 321, y: 167 },
        { x: 303, y: 279 },
        { x: 224, y: 343 },
        { x: 106, y: 343 },
        { x: 33, y: 278 },
        { x: 10, y: 167 },
        { x: 61, y: 80 }
    ];
    this.createStats = function() {
        statGraph.init();
        const statContainer = document.getElementById("statContainer");
        while (statContainer.firstChild) {
            statContainer.removeChild(statContainer.firstChild);
        }
        let totalStatDiv = "";
        for (let i = 0; i < statList.length; i++) {
			const stat = statList[i];
			const row = Math.floor(i / 3);
			const col = i % 3;
			let border = '';
			const borderColor = 'rgba(46,96,48,0.6)';
			border += `border-left: ${borderColor} solid 1px;`;
			border += `border-bottom: ${borderColor} solid 1px;`;
			if (col === 2) border += `border-right: ${borderColor} solid 1px;`
			if (row === 0) border += `border-top: ${borderColor} solid 1px;`
			totalStatDiv +=
				`<div class="statRadarContainer showthat" style="width: 30%;height:3.25rem; padding: 0 0.1rem; ${border}" onmouseover='view.showStat("${stat}")' onmouseout="view.showStat(undefined)">
					<div class="statLabelContainer" style="display: flex; flex-direction: column;">
						<div style="display: flex; justify-content: space-between;">
							<div class="medium bold" style="padding-top: 2px;">${_text(`stats>${stat}>short_form`)}</div>
							<div style="position: absolute; top: -0.2rem; right:0; color:#737373;" class="statNum">
								<div class="medium" id="stat${stat}ss"></div>
								<i class="fa fa-gem statIcon"></i>
							</div>
						</div>
						<div style="display: flex; justify-content: space-between;padding-bottom:0.1rem;">
							<div class="medium statNumL bold" id="stat${stat}Level">0</div>
							<div class="statNum">
								<div class="medium" id="stat${stat}Talent">0</div>
								<i class="fa fa-book statIcon"></i>
							</div>
						</div>
					</div>
					<div class="thinProgressBarUpper"><div class="statBar statLevelBar" id="stat${stat}LevelBar"></div></div>
					<div class="thinProgressBarLower"><div class="statBar statTalentBar" id="stat${stat}TalentBar"></div></div>
					<div class="showthis" id="stat${stat}Tooltip" style="width:225px;">
                    <div class="medium bold">${_text(`stats>${stat}>long_form`)}</div><br>${_text(`stats>${stat}>blurb`)}
                    <br>
                    <div class="medium bold">${_text("stats>tooltip>level")}:</div> <div id="stat${stat}Level2"></div>
                    <br>
                    <div class="medium bold">${_text("stats>tooltip>level_exp")}:</div>
                    <div id="stat${stat}LevelExp"></div>/<div id="stat${stat}LevelExpNeeded"></div>
                    <div class="statTooltipPerc">(<div id="stat${stat}LevelProgress"></div>%)</div>
                    <br>
                    <div class="medium bold">${_text("stats>tooltip>talent")}:</div>
                    <div id="stat${stat}Talent2"></div>
                    <br>
                    <div class="medium bold">${_text("stats>tooltip>talent_exp")}:</div>
                    <div id="stat${stat}TalentExp"></div>/<div id="stat${stat}TalentExpNeeded"></div>
                    <div class="statTooltipPerc">(<div id="stat${stat}TalentProgress"></div>%)</div>
                    <br>
                    <div class="medium bold">${_text("stats>tooltip>talent_multiplier")}:</div>
                    x<div id="stat${stat}TalentMult"></div>
                    <br>
                    <div id="ss${stat}Container" class="ssContainer">
                        <div class="bold">${_text("stats>tooltip>soulstone")}:</div> <div id="ss${stat}"></div><br>
                        <div class="medium bold">${_text("stats>tooltip>soulstone_multiplier")}:</div> x<div id="stat${stat}SSBonus"></div>
                    </div><br>
                    <div class="medium bold">${_text("stats>tooltip>total_multiplier")}:</div> x<div id="stat${stat}TotalMult"></div>
                </div>
                </div>`;
		}

        statContainer.innerHTML = totalStatDiv;
		
		Array.from(document.getElementsByClassName("statLevelBar")).forEach((div, index) => {
				addStatColors(div, statList[index]);
			});
    };

    // requests are properties, where the key is the function name,
    // and the array items in the value are the target of the function
    this.requests = {
        updateStat: [],
        updateSkill: [],
		updateSkillSquirrel : [],
        updateMultiPartSegments: [],
        updateMultiPart: [],
        updateMultiPartActions: [],
        updateNextActions: [],
        updateTime: [],
        updateCurrentActionBar: [],
		updateTravelMenu: [],
    };

    // requesting an update will call that update on the next view.update tick (based off player set UPS)
    this.requestUpdate = function(category, target) {
        if (!this.requests[category].includes(target)) this.requests[category].push(target);
    };

    this.handleUpdateRequests = function() {
        for (const category in this.requests) {
            for (const target of this.requests[category]) {
                this[category](target);
            }
            this.requests[category] = [];
        }
    };

    this.update = function() {

        this.handleUpdateRequests();

        if (dungeonShowing !== undefined) this.updateSoulstoneChance(dungeonShowing);
        if (this.updateStatGraphNeeded) statGraph.update();
        this.updateTime();
    };

    this.showStat = function(stat) {
        statShowing = stat;
        if (stat !== undefined) this.updateStat(stat);
    };
	
	this.adjustTooltipPosition = function(tooltipDiv) {
        let parent = tooltipDiv.parentNode;
        let y = parent.getBoundingClientRect().y;
        let windowHeight = window.innerHeight;
        let windowScrollY = window.scrollY;
        let border = (windowHeight / 2) + windowScrollY;
        if (y > border) {
            tooltipDiv.classList.add("showthisOver");
        } else {
            tooltipDiv.classList.remove("showthisOver");
        }
    }
	
	this.adjustStoryTooltipPosition = function(tooltipDiv) {
        let parent = tooltipDiv.parentNode;
        let y = parent.getBoundingClientRect().y;
        let windowHeight = window.innerHeight;
        let windowScrollY = window.scrollY;
        let border = (windowHeight / 2) + windowScrollY;
        if (y > border) {
            tooltipDiv.classList.add("showthisOverStory");
        } else {
            tooltipDiv.classList.remove("showthisOverStory");
        }
    }

    this.updateStatGraphNeeded = false;

    this.updateStat = function(stat) {
        const level = getLevel(stat);
        const talent = getTalent(stat);
        const levelPrc = `${getPrcToNextLevel(stat)}%`;
        const talentPrc = `${getPrcToNextTalent(stat)}%`;
        document.getElementById(`stat${stat}LevelBar`).style.width = levelPrc;
        document.getElementById(`stat${stat}TalentBar`).style.width = talentPrc;
        document.getElementById(`stat${stat}Level`).textContent = intToString(level, 1);
        document.getElementById(`stat${stat}Talent`).textContent = intToString(talent, 1);

        if (statShowing === stat || document.getElementById(`stat${stat}LevelExp`).innerHTML === "") {
            document.getElementById(`stat${stat}Level2`).textContent = intToString(level, 1);
            const expOfLevel = getExpOfLevel(level);
            document.getElementById(`stat${stat}LevelExp`).textContent = intToString(stats[stat].exp - expOfLevel, 1);
            document.getElementById(`stat${stat}LevelExpNeeded`).textContent = intToString(`${getExpOfLevel(level + 1) - expOfLevel}`, 1);
            document.getElementById(`stat${stat}LevelProgress`).textContent = intToString(levelPrc, 2);

            document.getElementById(`stat${stat}Talent2`).textContent = intToString(talent, 1);
            const expOfTalent = getExpOfTalent(talent);
            document.getElementById(`stat${stat}TalentExp`).textContent = intToString(stats[stat].talent - expOfTalent, 1);
            document.getElementById(`stat${stat}TalentExpNeeded`).textContent = intToString(`${getExpOfTalent(talent + 1) - expOfTalent}`, 1);
            document.getElementById(`stat${stat}TalentMult`).textContent = intToString(calcTalentMult(talent), 3);
            document.getElementById(`stat${stat}TalentProgress`).textContent = intToString(talentPrc, 2);
            document.getElementById(`stat${stat}TotalMult`).textContent = intToString(getTotalBonusXP(stat), 3);
        }
    };

    this.updateStats = function() {
        for (const stat of statList) {
            this.updateStat(stat);
        }
    };

    this.showSkill = function(skill) {
        skillShowing = skill;
        if (skill !== undefined) this.updateSkill(skill);
    };

    this.updateSkill = function(skill) {
        if (skills[skill].exp === 0) {
            document.getElementById(`skill${skill}Container`).style.display = "none";
            return;
        }
        document.getElementById(`skill${skill}Container`).style.display = "inline-block";
        if (skill === "Combat" || skill === "Pyromancy" || skill === "Restoration") {
            this.updateTeamCombat();
        }

        const levelPrc = getPrcToNextSkillLevel(skill);
        document.getElementById(`skill${skill}Level`).textContent = (getSkillLevel(skill) > 9999) ? toSuffix(getSkillLevel(skill)) : formatNumber(getSkillLevel(skill));
        document.getElementById(`skill${skill}LevelBar`).style.width = `${levelPrc}%`;

        if (skillShowing === skill) {
            const expOfLevel = getExpOfSkillLevel(getSkillLevel(skill));
            document.getElementById(`skill${skill}LevelExp`).textContent = intToString(skills[skill].exp - expOfLevel, 1);
            document.getElementById(`skill${skill}LevelExpNeeded`).textContent = intToString(`${getExpOfSkillLevel(getSkillLevel(skill) + 1) - expOfLevel}`, 1);
            document.getElementById(`skill${skill}LevelProgress`).textContent = intToString(levelPrc, 2);
			if(skill === "Yin"){
				document.getElementById("skillBonusYin").textContent = intToString(getYinYangBonus("Yin"), 4);
			} else if (skill === "Yang"){
				document.getElementById("skillBonusYang").textContent = intToString(getYinYangBonus("Yang"), 4);
			} else if (skill === "Chronomancy") {
                document.getElementById("skillBonusChronomancy").textContent = intToString(getSkillBonus("Chronomancy"), 4);
            } else if (skill === "Mercantilism") {
                document.getElementById("skillBonusMercantilism").textContent = intToString(getSkillBonus("Mercantilism"), 4);
            } else if (skill === "Spatiomancy") {
                document.getElementById("skillBonusSpatiomancy").textContent = getSkillBonus("Spatiomancy").toFixed(3).replace(/(\.\d*?[1-9])0+$/gu, "$1");
            } else if (skill === "Divine") {
                document.getElementById("skillBonusDivine").textContent = intToString(getSkillBonus("Divine"), 4);
            } else if (skill === "Commune") {
                document.getElementById("skillBonusCommune").textContent = getSkillBonus("Commune").toFixed(3).replace(/(\.\d*?[1-9])0+$/gu, "$1");
            } else if (skill === "Wunderkind") {
                document.getElementById("skillBonusWunderkind").textContent = intToString(getSkillBonus("Wunderkind"), 4);
            }else if (skill === "Gluttony") {
                document.getElementById("skillBonusGluttony").textContent = getSkillBonus("Gluttony").toFixed(3).replace(/(\.\d*?[1-9])0+$/gu, "$1");
            } else if (skill === "Thievery") {
                document.getElementById("skillBonusThievery").textContent = intToString(getSkillBonus("Thievery"), 4);
            }
        }
    };

    this.updateSkills = function() {
        for (const skill of skillList) {
            this.updateSkill(skill);
        }
    };
	
	this.showSkillSquirrel = function(skillSquirrel) {
        skillSquirrelShowing = skillSquirrel;
        if (skillSquirrel !== undefined) this.updateSkillSquirrel(skillSquirrel);
    };
	
	this.updateSkillSquirrel = function(skillSquirrel) {
        if (skillsSquirrel[skillSquirrel].exp === 0) {
            document.getElementById(`skillSquirrel${skillSquirrel}Container`).style.display = "none";
            return;
        }
		document.getElementById(`skillSquirrel${skillSquirrel}Container`).style.display = "inline-block";
		
        const levelPrc = getPrcToNextSkillSquirrelLevel(skillSquirrel);
        document.getElementById(`skillSquirrel${skillSquirrel}Level`).textContent = (getSkillSquirrelLevel(skillSquirrel) > 9999) ? toSuffix(getSkillSquirrelLevel(skillSquirrel)) : formatNumber(getSkillSquirrelLevel(skillSquirrel));
        document.getElementById(`skillSquirrel${skillSquirrel}LevelBar`).style.width = `${levelPrc}%`;

        if (skillSquirrelShowing === skillSquirrel) {
            const expOfLevel = getExpOfSkillSquirrelLevel(getSkillSquirrelLevel(skillSquirrel));
            document.getElementById(`skillSquirrel${skillSquirrel}LevelExp`).textContent = intToString(skillsSquirrel[skillSquirrel].exp - expOfLevel, 1);
            document.getElementById(`skillSquirrel${skillSquirrel}LevelExpNeeded`).textContent = intToString(`${getExpOfSkillSquirrelLevel(getSkillSquirrelLevel(skillSquirrel) + 1) - expOfLevel}`, 1);
            document.getElementById(`skillSquirrel${skillSquirrel}LevelProgress`).textContent = intToString(levelPrc, 2);
       }
	   
    };
	
	this.updateSkillsSquirrel = function() {
        for (const skillSquirrel of skillSquirrelList) {
            this.updateSkillSquirrel(skillSquirrel);
        }
    };

    this.updateBuff = function(buff) {
        if (buffs[buff].amt === 0) {
            document.getElementById(`buff${buff}Container`).style.display = "none";
            return;
        }
        document.getElementById(`buff${buff}Container`).style.display = "flex";
        document.getElementById(`buff${buff}Level`).textContent = `${getBuffLevel(buff)}/`;
        if (buff === "Imbuement") {
            this.updateTrainingLimits();
        } else if (buff == "YinYang"){
			document.getElementById("skillBuffYinYangLevel").textContent = getBuffLevel("YinYang");
			document.getElementById("skillBuffYinYangReputation").textContent = resources.reputation;
			document.getElementById("skillBuffYinYangYinReputation").textContent = Math.min(Math.max(getBuffLevel("YinYang"), resources.reputation), 50);
			document.getElementById("skillBuffYinYangYangReputation").textContent = Math.min(Math.max(getBuffLevel("YinYang"), resources.reputation * (-1)), 50);
			document.getElementById("skillBuffYinYang").textContent = intToString(getYinYangBonus("YinYang"), 4);
		}
    };

    this.updateBuffs = function() {
        for (const buff of buffList) {
            this.updateBuff(buff);
        }
    };

    this.updateTime = function() {
		
		let multTicksSpeed = 1;
		if(curTown === SANCTUARY) multTicksSpeed = Math.pow(4, getBuffLevel("SpiritBlessing"));
		
        document.getElementById("timeBar").style.width = `${100 - timer / timeNeeded * 100}%`;
        document.getElementById("timer").textContent = `${intToString((timeNeeded - timer), 1)} | ${formatTime((timeNeeded - timer) / baseManaPerSecond / getActualGameSpeed() / multTicksSpeed)}`;
    };
    this.updateTotalTicks = function() {
        document.getElementById("totalTicks").textContent = `${formatNumber(actions.completedTicks)} | ${formatTime(timeCounter)}`;
        document.getElementById("effectiveTime").textContent = `${formatTime(effectiveTime)}`;
    };
    this.updateResource = function(resource) {
        if (resource !== "gold") document.getElementById(`${resource}Div`).style.display = resources[resource] ? "inline-block" : "none";

		if(!squirrelMode){
			if (resource === "teamMembers") document.getElementById("teamCost").textContent = (resources.teamMembers + 1) * 100;
		}

        if (Number.isFinite(resources[resource])) document.getElementById(resource).textContent = resources[resource];
    };
    this.updateResources = function() {
        for (const resource in resources) this.updateResource(resource);
		if(!squirrelMode) this.updateActionTooltips();
    };
    this.updateActionTooltips = function() {
        document.getElementById("goldInvested").textContent = intToStringRound(goldInvested);
        document.getElementById("bankInterest").textContent = intToStringRound(goldInvested * .001);
        document.getElementById("actionAllowedPockets").textContent = intToStringRound(towns[7].totalPockets);
        document.getElementById("actionAllowedWarehouses").textContent = intToStringRound(towns[7].totalWarehouses);
        document.getElementById("actionAllowedInsurance").textContent = intToStringRound(towns[7].totalInsurance);
        document.getElementById("totalSurveyProgress").textContent = getExploreProgress();
		document.getElementById("mysteriousVoiceNextRequirement").textContent = _text(`actions>mysterious_voice>requirement_${(getBuffLevel("SpiritBlessing")+1)}`)
		document.getElementById("manaSpotBonus").textContent = intToString(1 +getBuffLevel("SpiritBlessing") * 0.02);
		
		
        Array.from(document.getElementsByClassName("surveySkill")).forEach(div => {
            div.textContent = getExploreSkill();
        });
    }
	
    this.updateTeamCombat = function() {
        if (towns[2].unlocked) {
            document.getElementById("skillSCombatContainer").style.display = "inline-block";
            document.getElementById("skillTCombatContainer").style.display = "inline-block";
            document.getElementById("skillSCombatLevel").textContent = intToString(getSelfCombat(), 1);
            document.getElementById("skillTCombatLevel").textContent = intToString(getTeamCombat(), 1);
        } else {
            document.getElementById("skillSCombatContainer").style.display = "none";
            document.getElementById("skillTCombatContainer").style.display = "none";
        }
    };
    this.zoneTints = [
        "rgba(255, 152, 0, 0.2)", //Beginnersville
        "rgba(76, 175, 80, 0.2)", //Forest Path
        "rgba(255, 235, 59, 0.2)", //Merchanton
        "rgba(96, 125, 139, 0.2)", //Mt Olympus
        "rgba(255, 255, 255, 0.2)", //Valhalla
        "rgba(103, 58, 183, 0.2)", //Startington
        "rgba(76, 175, 80, 0.4)", //Jungle Path
        "rgba(255, 235, 59, 0.4)", //Commerceville
        "rgba(103, 58, 183, 0.4)", //Valley of Olympus
		"rgba(145, 100, 35, 0.2)", //Squirrel Sanctuary
		"rgba(145, 100, 35, 0)", //4b
		"rgba(145, 100, 35, 0)", //5b
		"rgba(145, 100, 35, 0)", //6b
		"rgba(145, 100, 35, 0)", //7b
		"rgba(145, 100, 35, 0)", //8b
		"rgba(145, 100, 35, 0)", //9b
		"rgba(145, 100, 35, 0)", //9c
		"rgba(145, 100, 35, 0)", //9d
		"rgba(255, 255, 255, 0.2)", //Chronos' Layer
		
        //"rgba(103, 58, 183, 0.2)"
    ];
    this.updateNextActions = function() {
        let count = 0;
        while (nextActionsDiv.firstChild) {
            if (document.getElementById(`capButton${count}`)) {
                document.getElementById(`capButton${count}`).removeAttribute("onclick");
            }
            // not for journey
            if (document.getElementById(`plusButton${count}`)) {
                document.getElementById(`plusButton${count}`).removeAttribute("onclick");
                document.getElementById(`minusButton${count}`).removeAttribute("onclick");
                document.getElementById(`splitButton${count}`).removeAttribute("onclick");
            }
            document.getElementById(`upButton${count}`).removeAttribute("onclick");
            document.getElementById(`downButton${count}`).removeAttribute("onclick");
            document.getElementById(`removeButton${count}`).removeAttribute("onclick");
			document.getElementById(`favoriteButton${count}`).removeAttribute("onclick");

            const dragAndDropDiv = document.getElementById(`nextActionContainer${count}`);
            dragAndDropDiv.removeAttribute("ondragover");
            dragAndDropDiv.removeAttribute("ondrop");
            dragAndDropDiv.removeAttribute("ondragstart");
            dragAndDropDiv.removeAttribute("ondragend");
            dragAndDropDiv.removeAttribute("ondragenter");
            dragAndDropDiv.removeAttribute("ondragleave");

            while (nextActionsDiv.firstChild.firstChild) {
                if (nextActionsDiv.firstChild.firstChild instanceof HTMLImageElement) {
                    nextActionsDiv.firstChild.firstChild.src = "";
                }
                nextActionsDiv.firstChild.removeChild(nextActionsDiv.firstChild.firstChild);
            }
            count++;
            nextActionsDiv.removeChild(nextActionsDiv.firstChild);
        }

        let totalDivText = "";

        for (let i = 0; i < actions.next.length; i++) {
            const action = actions.next[i];
            const translatedAction = translateClassNames(action.name);
            let capButton = "";
            const townNum = translatedAction.townNum;
            const travelNum = getTravelNum(action.name);
            const collapses = [];
            // eslint-disable-next-line no-loop-func
            actions.next.forEach((a, index) => {
                if (a.collapsed) {
                    const collapse = {};
                    collapse.zone = translateClassNames(a.name).townNum;
                    collapse.index = index;
                    collapses.push(collapse);
                }
            });
            if (hasLimit(action.name)) {
                capButton = `<i id='capButton${i}' onclick='capAmount(${i}, ${townNum})' class='actionIcon far fa-circle'></i>`;
            } else if (isTraining(action.name)) {
                capButton = `<i id='capButton${i}' onclick='capTraining(${i})' class='actionIcon far fa-circle'></i>`;
            }
            let isSingular;
            if (translatedAction.allowed === undefined) {
                isSingular = false;
            } else {
                isSingular = translatedAction.allowed() === 1;
            }
            const actionLoops = action.loops > 9999 ? toSuffix(action.loops) : formatNumber(action.loops);
            const opacity = action.disabled || action.loops === 0 ? "opacity: 0.5" : "";
            let display = "display: flex";
            for (const collapse of collapses) {
                if (townNum === collapse.zone && i < collapse.index) display = "display: none";
            }
            let color;
			if (action.name === "Mysterious Voice" && action.squirrelAction && getLevelSquirrelAction("Mysterious Voice") >= 2){
				color = `linear-gradient(${this.zoneTints[SANCTUARY]} 49%, ${this.zoneTints[CHRONOSLAIR]} 51%)`
			} else if (action.name === "Mysterious Voice") {
				color = `${this.zoneTints[SANCTUARY]}`;
			} else if((travelNum > 0 || travelNum == -5) && action.squirrelAction){
				color = `linear-gradient(${this.zoneTints[townNum]} 49%, ${this.zoneTints[SANCTUARY]} 51%)`;
			} else if (action.name === "Face Judgement") {
                color = "linear-gradient(to bottom, rgb(183, 203, 196) 49%, transparent 51%), linear-gradient(to right, rgba(255, 255, 255, 0.2) 50%, rgba(103, 58, 183, 0.2) 51%)";
            } else if (action.name === "Fall From Grace") {
                color = "linear-gradient(to bottom, rgb(255, 255, 255, 0.2) 49%, rgba(103, 58, 183, 0.2) 51%)";
            } else if (action.name === "Open Rift") {
                color = "linear-gradient(to bottom, rgb(255, 152, 0, 0.2) 49%, rgba(103, 58, 183, 0.2) 51%)";
            } else {
                color = (travelNum > 0 || travelNum == -5) ? `linear-gradient(${this.zoneTints[townNum]} 49%, ${this.zoneTints[townNum + travelNum]} 51%)` : this.zoneTints[townNum];
            }
			let squirrelModeIcon = `<img id='modeIcon${i}' src='img/human.svg' class='modeIcon' onclick='changeMode(${i})'>`;
			if(action.squirrelAction){
				const actionTemplate = Action[action.name.replace(/ /g,'')];
								
				if(actionTemplate.hasOwnProperty('squirrelLevelUp') && actionTemplate.squirrelLevelUp(true)){
					squirrelModeIcon = `<img id='modeIcon${i}' src='${squirrelNewAction}' class='modeIcon' onclick='changeMode(${i})'>`;
				} else if(actionTemplate.hasOwnProperty('squirrelActionEffect') && actionTemplate.squirrelActionEffect(true)) {
					squirrelModeIcon = `<img id='modeIcon${i}' src='img/squirrelLose.svg' class='modeIcon' onclick='changeMode(${i})'>`;
				} else if(actionTemplate.hasOwnProperty('squirrelActionEffect') && actionTemplate.squirrelActionEffect(false, true)) {
					squirrelModeIcon = `<img id='modeIcon${i}' src='img/squirrelSleep.svg' class='modeIcon' onclick='changeMode(${i})'>`;
				} else {
					squirrelModeIcon = `<img id='modeIcon${i}' src='${squirrelIcon}' class='modeIcon' onclick='changeMode(${i})'>`;
				}	
			}			
			let favButton = `<i id='favoriteButton${i}' onclick= 'setFavMode("${action.name}", ${action.squirrelAction})' class = 'actionIcon fa-regular fa-star'></i>`;
			if((action.squirrelAction && favMode[camelize(action.name)] === fav.squirrel) ||
				(!action.squirrelAction && favMode[camelize(action.name)] === fav.human)){
				favButton = `<i id='favoriteButton${i}' onclick= 'setFavMode("${action.name}", ${action.squirrelAction})' class = 'actionIcon fa-solid fa-star'></i>`;
			}
			
			let actionImage = `<img src='img/${camelize(action.name)}.svg' class='smallIcon imageDragFix'>`;
			if(options.ferretMode && action.name === "Pet Squirrel") actionImage = `<img src='img/ferret.png' class='smallIcon imageDragFix'>`;
			
            totalDivText +=(
                `<div
                    id='nextActionContainer${i}'
                    class='nextActionContainer small'
                    ondragover='handleDragOver(event)'
                    ondrop='handleDragDrop(event)'
                    ondragstart='handleDragStart(event)'
                    ondragend='draggedUndecorate(${i})'
                    ondragenter='dragOverDecorate(${i})'
                    ondragleave='dragExitUndecorate(${i})'
                    draggable='true' data-index='${i}'
                    style='background: ${color}; ${opacity}; ${display};'
                >
					
                    <div>${actionImage}
					${squirrelModeIcon} x
                    <div class='bold'>${actionLoops}</div></div>
                    <div style='float:right; margin-top: 1px; margin-right: 3px;'>
                        ${capButton}
                        ${isSingular ? "" : `<i id='plusButton${i}' onclick='addLoop(${i})' class='actionIcon fas fa-plus'></i>`}
                        ${isSingular ? "" : `<i id='minusButton${i}' onclick='removeLoop(${i})' class='actionIcon fas fa-minus'></i>`}
                        ${isSingular ? "" : `<i id='splitButton${i}' onclick='split(${i})' class='actionIcon fas fa-arrows-alt-h'></i>`}						
                        ${travelNum ? `<i id='collapseButton${i}' onclick='collapse(${i})' class='actionIcon fas fa-${action.collapsed ? "expand" : "compress"}-alt'></i>` : ""}
						${favButton}
                        <i id='upButton${i}' onclick='moveUp(${i})' class='actionIcon fas fa-sort-up'></i>
                        <i id='downButton${i}' onclick='moveDown(${i})' class='actionIcon fas fa-sort-down'></i>
                        <i id='skipButton${i}' onclick='disableAction(${i})' class='actionIcon far fa-${action.disabled ? "check" : "times"}-circle'></i>
                        <i id='removeButton${i}' onclick='removeAction(${i})' class='actionIcon fas fa-times'></i>
                    </div>
                </div>`);
        }
		
			
        nextActionsDiv.innerHTML = totalDivText;
    };

    this.updateCurrentActionsDivs = function() {
        let totalDivText = "";

        // definite leak - need to remove listeners and image
        for (let i = 0; i < actions.current.length; i++) {
            const action = actions.current[i];
            const actionLoops = action.loops > 99999 ? toSuffix(action.loops) : formatNumber(action.loops);
            const actionLoopsDone = (action.loops - action.loopsLeft) > 99999 ? toSuffix(action.loops - action.loopsLeft) : formatNumber(action.loops - action.loopsLeft);
			
			let squirrelModeIcon = "<img src='img/human.svg' class='smallIcon imageDragFix' style='margin-left:4px'>";
			if(action.squirrelAction) squirrelModeIcon = `<img src='${squirrelIcon}' class='smallIcon imageDragFix' style='margin-left:4px'>`;
			
			let actionImage = `<img src='img/${camelize(action.name)}.svg' class='smallIcon'>`;
			if(options.ferretMode && action.name === "Pet Squirrel") actionImage = `<img src='img/ferret.png' class='smallIcon'>`;
				
            totalDivText +=
                `<div class='curActionContainer small' onmouseover='view.mouseoverAction(${i}, true)' onmouseleave='view.mouseoverAction(${i}, false)'>
                    <div class='curActionBar' id='action${i}Bar'></div>
                    <div class='actionSelectedIndicator' id='action${i}Selected'></div>
                    ${actionImage}
					${squirrelModeIcon}
                    <div id='action${i}LoopsDone' style='margin-left:3px; border-left: 1px solid #b9b9b9;padding-left: 3px;'>${actionLoopsDone}</div>
                    /<div id='action${i}Loops'>${actionLoops}</div>
                </div>`;
        }

        curActionsDiv.innerHTML = totalDivText;

        totalDivText = "";

        for (let i = 0; i < actions.current.length; i++) {
            const action = actions.current[i];
            totalDivText +=
                `<div id='actionTooltip${i}' style='display:none;padding-left:10px;width:90%'>` +
                    `<div style='text-align:center;width:100%'>${action.label}</div><br><br>` +
                    `<b>${_text("actions>current_action>mana_original")}</b> <div id='action${i}ManaOrig'></div><br>` +
                    `<b>${_text("actions>current_action>mana_used")}</b> <div id='action${i}ManaUsed'></div><br>` +
                    `<b>${_text("actions>current_action>last_mana")}</b> <div id='action${i}LastMana'></div><br>` +
                    `<b>${_text("actions>current_action>mana_remaining")}</b> <div id='action${i}Remaining'></div><br>` +
                    `<b>${_text("actions>current_action>gold_remaining")}</b> <div id='action${i}GoldRemaining'></div><br>` +
                    `<b>${_text("actions>current_action>time_spent")}</b> <div id='action${i}TimeSpent'></div><br><br>` +
                    `<div id='action${i}ExpGain'></div>` +
                    `<div id='action${i}HasFailed' style='display:none'>` +
                        `<b>${_text("actions>current_action>failed_attempts")}</b> <div id='action${i}Failed'></div><br>` +
                        `<b>${_text("actions>current_action>error")}</b> <div id='action${i}Error'></div>` +
                    `</div>` +
                `</div>`;
        }

        document.getElementById("actionTooltipContainer").innerHTML = totalDivText;
        this.mouseoverAction(0, false);
    };
	
    this.updateCurrentActionBar = function(index) {
        const div = document.getElementById(`action${index}Bar`);
        if (!div) {
            return;
        }
        const action = actions.current[index];
        if (!action) {
            return;
        }
        if (action.errorMessage) {
            document.getElementById(`action${index}Failed`).textContent = action.loopsLeft;
            document.getElementById(`action${index}Error`).textContent = action.errorMessage;
            document.getElementById(`action${index}HasFailed`).style.display = "block";
            div.style.width = "100%";
            div.style.backgroundColor = "#ff0000";
            div.style.height = "30%";
            div.style.marginTop = "5px";
            if (action.name === "Heal The Sick") unlockStory("failedHeal");
            if (action.name === "Brew Potions" && resources.reputation >= 0 && resources.herbs >= 10) unlockStory("failedBrewPotions");
            if (action.name === "Brew Potions" && resources.reputation < 0 && resources.herbs >= 10) unlockStory("failedBrewPotionsNegativeRep");
            if (action.name === "Gamble" && resources.reputation < -5) unlockStory("failedGamble");
            if (action.name === "Gamble" && resources.gold < 20 && resources.reputation > -6) unlockStory("failedGambleLowMoney");
            if (action.name === "Gather Team") unlockStory("failedGatherTeam");
            if (action.name === "Craft Armor") unlockStory("failedCraftArmor");
        } else if (action.loopsLeft === 0) {
            div.style.width = "100%";
            div.style.backgroundColor = "#6d6d6d";
        } else {
            div.style.width = `${100 * action.ticks / action.adjustedTicks}%`;
        }

        // only update tooltip if it's open
        if (curActionShowing === index) {
            document.getElementById(`action${index}ManaOrig`).textContent = formatNumber(action.manaCost() * action.loops);
            document.getElementById(`action${index}ManaUsed`).textContent = formatNumber(action.manaUsed);
            document.getElementById(`action${index}LastMana`).textContent = intToString(action.lastMana, 3);
            document.getElementById(`action${index}Remaining`).textContent = formatNumber(action.manaRemaining);
            document.getElementById(`action${index}GoldRemaining`).textContent = formatNumber(action.goldRemaining);
            document.getElementById(`action${index}TimeSpent`).textContent = formatTime(action.timeSpent);

            let statExpGain = "";
            const expGainDiv = document.getElementById(`action${index}ExpGain`);
            while (expGainDiv.firstChild) {
                expGainDiv.removeChild(expGainDiv.firstChild);
            }
            for (const stat of statList) {
                if (action[`statExp${stat}`]) {
                    statExpGain += `<div class='bold'>${_text(`stats>${stat}>short_form`)}:</div> ${intToString(action[`statExp${stat}`], 2)}<br>`;
                }
            }
            expGainDiv.innerHTML = statExpGain;
        }
    };

    this.mouseoverAction = function(index, isShowing) {
        if (isShowing) curActionShowing = index;
        else curActionShowing = undefined;
        const div = document.getElementById(`action${index}Selected`);
        if (div) {
            div.style.opacity = isShowing ? "1" : "0";
            document.getElementById(`actionTooltip${index}`).style.display = isShowing ? "inline-block" : "none";
        }
        nextActionsDiv.style.display = isShowing ? "none" : "inline-block";
        document.getElementById("actionTooltipContainer").style.display = isShowing ? "inline-block" : "none";
        view.updateCurrentActionBar(index);
    };

    this.updateCurrentActionLoops = function(index) {
        const action = actions.current[index];
        document.getElementById(`action${index}LoopsDone`).textContent = (action.loops - action.loopsLeft) > 99999 
            ? toSuffix(action.loops - action.loopsLeft) : formatNumber(action.loops - action.loopsLeft);
        document.getElementById(`action${index}Loops`).textContent = action.loops > 99999 ? toSuffix(action.loops) : formatNumber(action.loops);
    };

    this.updateProgressAction = function(varName, town) {
        const level = town.getLevel(varName);
        const levelPrc = `${town.getPrcToNext(varName)}%`;
        document.getElementById(`prc${varName}`).textContent = level;
        document.getElementById(`expBar${varName}`).style.width = levelPrc;
        document.getElementById(`progress${varName}`).textContent = intToString(levelPrc, 2);
        document.getElementById(`bar${varName}`).style.width = `${level}%`;
    };

    this.updateProgressActions = function() {
        for (const town of towns) {
            for (let i = 0; i < town.progressVars.length; i++) {
                const varName = town.progressVars[i];
                this.updateProgressAction(varName, town);
            }
        }
    };

    this.updateLockedHidden = function() {
        for (const action of totalActionList) {
            const actionDiv = document.getElementById(`container${action.varName}`);
            const infoDiv = document.getElementById(`infoContainer${action.varName}`);
            const storyDiv = document.getElementById(`storyContainer${action.varName}`);
            if (action.allowed && getNumOnList(action.name) >= action.allowed()) {
                addClassToDiv(actionDiv, "capped");
            } else if (action.unlocked()) {
                if (infoDiv) {
                    removeClassFromDiv(infoDiv, "hidden");
                }
                removeClassFromDiv(actionDiv, "locked");
                removeClassFromDiv(actionDiv, "capped");
            } else {
                addClassToDiv(actionDiv, "locked");
                if (infoDiv) {
                    addClassToDiv(infoDiv, "hidden");
                }
            }
            if (action.unlocked() && infoDiv) {
                removeClassFromDiv(infoDiv, "hidden");
            }
            if (action.visible()) {
                removeClassFromDiv(actionDiv, "hidden");
                if (storyDiv !== null) removeClassFromDiv(storyDiv, "hidden");
            } else {
                addClassToDiv(actionDiv, "hidden");
                if (storyDiv !== null) addClassToDiv(storyDiv, "hidden");
            }
            if (storyDiv !== null) {
                if (action.unlocked()) {
                    removeClassFromDiv(storyDiv, "hidden");
                } else {
                    addClassToDiv(storyDiv, "hidden");
                }
            }
        }
        if (totalActionList.filter(action => action.finish.toString().includes("handleSkillExp")).filter(action => action.unlocked()).length > 0) {
            document.getElementById("skillList").style.display = "inline-block";
        } else {
            document.getElementById("skillList").style.display = "none";
        }
		 if (totalActionList.filter(action => action.finish.toString().includes("handleSkillSquirrelExp")).filter(action => action.unlocked()).length > 0) {
            document.getElementById("skillSquirrelList").style.display = "inline-block";
        } else {
            document.getElementById("skillSquirrelList").style.display = "none";
        }
        if (totalActionList.filter(action => action.finish.toString().includes("updateBuff")).filter(action => action.unlocked()).length > 0) {
            document.getElementById("buffList").style.display = "flex";
        } else {
            document.getElementById("buffList").style.display = "none";
        }
    };

    this.updateStories = function(init) {
        // ~1.56ms cost per run. run once every 2000ms on an interval
        for (const action of totalActionList) {
            if (action.storyReqs !== undefined) {
                // greatly reduces/nullifies the cost of checking actions with all stories unlocked, which is nice,
                // since you're likely to have more stories unlocked at end game, which is when performance is worse
                const divName = `storyContainer${action.varName}`;
                if (init || document.getElementById(divName).innerHTML.includes("???")) {
                    let storyTooltipText = "";
                    let lastInBranch = false;
                    const name = action.name.toLowerCase().replace(/ /gu, "_");
                    const storyAmt = _text(`actions>${name}`, "fallback").split("⮀").length - 1;
                    let storiesUnlocked = 0;
                    for (let i = 1; i <= storyAmt; i++) {
                        const storyText = _text(`actions>${name}>story_${i}`, "fallback").split("⮀");
                        if (action.storyReqs(i)) {
                            storyTooltipText += storyText[0] + storyText[1] + "<br>";
                            lastInBranch = false;
                            storiesUnlocked++;
                        } else if (lastInBranch) {
                            storyTooltipText += "<b>???:</b> ???";
                        } else {
                            storyTooltipText += `${storyText[0]} ???`;
                            lastInBranch = true;
                        }
						if(storiesUnlocked !== storyAmt) storyTooltipText += "<br>";
                    }
                    if (document.getElementById(divName).children[2].innerHTML !== storyTooltipText) {
                        document.getElementById(divName).children[2].innerHTML = storyTooltipText;
                        if (!init) showNotification(divName);
                        if (storiesUnlocked === storyAmt) {
                            document.getElementById(divName).classList.add("storyContainerCompleted");
                        } else {
                            document.getElementById(divName).classList.remove("storyContainerCompleted");
                        }
                    }
                }
            }
        }
    };

    this.showTown = function(townNum, arrowDirection) {
						
		//Just as a reminder :
		// console.log("Zone n°4 has " + zoneOrder[4]);
		// console.log("Cursed ocean is in zone n°" + zoneOrder.findIndex(arr => arr.includes(CURSEDOCEAN)));
		// console.log("In zone 4, Mt Olympus is in place n°" + zoneOrder[4].indexOf(MTOLYMPUS));
		
		let townTarget;
		const currentZone = zoneOrder.findIndex(arr => arr.includes(townNum));
		const altZone = (zoneOrder[currentZone].indexOf(townNum) === 0 ? 1 : 0);
								
		switch(arrowDirection){
		
			case arrow.none: townTarget = townNum;
							break;
			case arrow.right: if(zoneOrder[currentZone+1] === undefined) return;
							  townTarget = zoneOrder[currentZone+1][0];
							break;
			case arrow.right_alt: if(zoneOrder[currentZone+1] === undefined || zoneOrder[currentZone+1][1] === undefined) return;
								  townTarget = zoneOrder[currentZone+1][1];
							break;
			case arrow.left: if(zoneOrder[currentZone-1] === undefined) return;
							  townTarget = zoneOrder[currentZone-1][0];
							break;
			case arrow.right_alt: if(zoneOrder[currentZone-1] === undefined || zoneOrder[currentZone-1][1] === undefined) return;
								  townTarget = zoneOrder[currentZone-1][1];
							break;
			case arrow.alt : if(zoneOrder[currentZone][altZone] === undefined) return;
							 townTarget = zoneOrder[currentZone][altZone];
							break;
		}
		if(!towns[townTarget].unlocked()) return;
		
		const newZone = zoneOrder.findIndex(arr => arr.includes(townTarget));
				
		if(zoneOrder[newZone+1] !== undefined && towns[zoneOrder[newZone+1][0]].unlocked()){
			document.getElementById("townViewRight").style.visibility = "visible";
		} else {
			document.getElementById("townViewRight").style.visibility = "hidden";
		}
		
		if(zoneOrder[newZone+1] !== undefined && zoneOrder[newZone+1][1] !== undefined && towns[zoneOrder[newZone+1][1]].unlocked()){
			document.getElementById("townViewRightAlt").style.visibility = "visible";
		} else {
			document.getElementById("townViewRightAlt").style.visibility = "hidden";
		}
		
		if(zoneOrder[newZone-1] !== undefined && towns[zoneOrder[newZone-1][0]].unlocked()){
			document.getElementById("townViewLeft").style.visibility = "visible";
		} else {
			document.getElementById("townViewLeft").style.visibility = "hidden";
		}
		
		if(zoneOrder[newZone-1] !== undefined && zoneOrder[newZone-1][1] !== undefined && towns[zoneOrder[newZone-1][1]].unlocked()){
			document.getElementById("townViewLeftAlt").style.visibility = "visible";
		} else {
			document.getElementById("townViewLeftAlt").style.visibility = "hidden";
		}
		
		if(zoneOrder[newZone][altZone] !== undefined && towns[zoneOrder[newZone][altZone]].unlocked()){
			document.getElementById("townViewAlt").style.visibility = "visible";
		} else {
			document.getElementById("townViewAlt").style.visibility = "hidden";
		}
				
		for (let i = 0; i < actionOptionsTown.length; i++) {
            actionOptionsTown[i].style.display = "none";
            actionStoriesTown[i].style.display = "none";
            townInfos[i].style.display = "none";
        }
			
		if (actionStoriesShowing) actionStoriesTown[townTarget].style.display = "block";
		else actionOptionsTown[townTarget].style.display = "block";
		
		townInfos[townTarget].style.display = "block";
        document.getElementById("townName").textContent = _text(`towns>town${townTarget}>name`);
        document.getElementById("townDesc").textContent = _text(`towns>town${townTarget}>desc`);
        townShowing = townTarget;
						
    };

    this.showActions = function(stories) {
        for (let i = 0; i < actionOptionsTown.length; i++) {
            actionOptionsTown[i].style.display = "none";
            actionStoriesTown[i].style.display = "none";
        }

        if (stories) {
            document.getElementById("actionsViewLeft").style.visibility = "visible";
            document.getElementById("actionsViewRight").style.visibility = "hidden";
            actionStoriesTown[townShowing].style.display = "block";
        } else {
            document.getElementById("actionsViewLeft").style.visibility = "hidden";
            document.getElementById("actionsViewRight").style.visibility = "visible";
            actionOptionsTown[townShowing].style.display = "block";
        }

        document.getElementById("actionsTitle").textContent = _text(`actions>title${(stories) ? "_stories" : ""}`);
        document.getElementById("squirrelModeTitle").textContent = _text(`actions>squirrel_mode_name`);
        actionStoriesShowing = stories;
    };

    this.updateRegular = function(varName, index) {
        const town = towns[index];
        document.getElementById(`total${varName}`).textContent = town[`total${varName}`];
        document.getElementById(`checked${varName}`).textContent = town[`checked${varName}`];
        document.getElementById(`unchecked${varName}`).textContent = town[`total${varName}`] - town[`checked${varName}`];
        document.getElementById(`goodTemp${varName}`).textContent = town[`goodTemp${varName}`];
        document.getElementById(`good${varName}`).textContent = town[`good${varName}`];
    };

    this.updateAddAmount = function(num) {
        for (let i = 0; i < 6; i++) {
            const elem = document.getElementById(`amount${num}`);
            if (elem) {
                addClassToDiv(elem, "unused");
            }
        }
        if (num > 0) removeClassFromDiv(document.getElementById(`amount${num}`), "unused");
    };

    this.updateLoadout = function(num) {
        for (let i = 0; i < 16; i++) {
            const elem = document.getElementById(`load${i}`);
            if (elem) {
                addClassToDiv(elem, "unused");
            }
        }
        const elem = document.getElementById(`load${num}`);
        if (elem) {
            removeClassFromDiv(document.getElementById(`load${num}`), "unused");
        }
    };

    this.updateLoadoutNames = function() {
        for (let i = 0; i < loadoutnames.length; i++) {
            document.getElementById(`load${i + 1}`).textContent = loadoutnames[i];
        }
    };

    this.createTownActions = function() {
        if (actionOptionsTown[0].firstChild) return;
        for (const prop in Action) {
            const action = Action[prop];
            this.createTownAction(action);
            if (action.type === "limited") this.createTownInfo(action);
            if (action.type === "progress") this.createActionProgress(action);
            if (action.type === "multipart") this.createMultiPartPBar(action);
        }
    };

    this.createActionProgress = function(action) {
        const totalDivText =
        `<div class='townStatContainer showthat'>
            <div class='bold townLabel'>${action.labelDone} </div> <div id='prc${action.varName}'>5</div>%
            <div class='thinActionProgressBarUpper'><div id='expBar${action.varName}' class='statBar townExpBar'></div></div>
            <div class='thinActionProgressBarLower'><div id='bar${action.varName}' class='statBar townBar'></div></div>

            <div class='showthis'>
                ${_text("actions>tooltip>higher_done_percent_benefic")}<br>
                <div class='bold'>${_text("actions>tooltip>progress_label")}</div> <div id='progress${action.varName}'></div>%
            </div>
        </div>`;
        const progressDiv = document.createElement("div");
        progressDiv.id = `infoContainer${action.varName}`;
        progressDiv.style.display = "block";
		progressDiv.style.height = "38px";
        progressDiv.innerHTML = totalDivText;
        townInfos[action.townNum].appendChild(progressDiv);
    };

    this.createTownAction = function(action) {
        let actionStats = "";
        let actionSkills = "";
        const statKeyNames = Object.keys(action.stats);
        for (let i = 0; i < 10; i++) {
            for (const stat of statKeyNames) {
                if (statList[i] === stat) {
                    const statLabel = _text(`stats>${stat}>short_form`);
                    actionStats += `<div class='bold'>${statLabel}:</div> ${action.stats[stat] * 100}%<br>`;
                }
            }
        }
        if (action.skills !== undefined) {
            const skillKeyNames = Object.keys(action.skills); 
            const l = skillList.length;
            for (let i = 0; i < l; i++) {
                for (const skill of skillKeyNames) {
                    if (skillList[i] === skill) {
                        const skillLabel = `${_text(`skills>${getXMLName(skill)}>label`)} ${_text("stats>tooltip>exp")}`;
                        actionSkills += `<div class='bold'>${skillLabel}:</div><span id='expGain${action.varName}${skill}'></span><br>`;
                    }
                }
            }
        }
		
        let extraImage = "";
        const extraImagePositions = ["margin-top:17px;margin-left:5px;", "margin-top:17px;margin-left:-55px;", "margin-top:0px;margin-left:-55px;"];
        if (action.affectedBy) {
            for (let i = 0; i < action.affectedBy.length; i++) {
                extraImage += `<img src='img/${camelize(action.affectedBy[i])}.svg' class='smallIcon' draggable='false' style='position:absolute;${extraImagePositions[i]}'>`;
            }
        }
		
		let favModeImage = ""
		if(favMode[camelize(action.name)] === fav.human){
			favModeImage = "img/human.svg";
		} else if(favMode[camelize(action.name)] === fav.squirrel){
			favModeImage = squirrelIcon;
		}
		
		if(favModeImage === ""){
			extraImage += `<img id= "favMode${action.name}" src='' class='smallIcon' draggable='false' style='position:absolute;margin-top:0px;margin-left:5px;visibility: hidden;'>`
		} else {
			extraImage += `<img id= "favMode${action.name}" src='${favModeImage}' class='smallIcon' draggable='false' style='position:absolute;margin-top:0px;margin-left:5px;visibility: visible;'>`
		}
		
		let actionImage = `<img src='img/${camelize(action.name)}.svg' class='superLargeIcon' draggable='false'>${extraImage}`;
		if(options.ferretMode && action.name === "Pet Squirrel") actionImage = `<img src='img/ferret.png' class='superLargeIcon' draggable='false'>${extraImage}`;

        const isTravel = getTravelNum(action.name) > 0;
        const divClass = isTravel ? "travelContainer showthat" : "actionContainer showthat";
        const totalDivText =
            `<div
                id='container${action.varName}'
                class='${divClass}'
                draggable='true'
                ondragover='handleDragOver(event)'
                ondragstart='handleDirectActionDragStart(event, "${action.name}", ${action.townNum}, "${action.varName}", false)'
                ondragend='handleDirectActionDragEnd("${action.varName}")'
                onclick='addActionToList("${action.name}", ${action.townNum})'
				onmouseover='view.updateAction("${action.varName}")'
				onmouseout='view.updateAction(undefined)'
            >
                ${action.label}<br>
                <div style='position:relative'>
					${actionImage}
                </div>
                <div class='showthis' draggable='false'>
					<span id="actionTooltipMode${action.varName}">
                    ${action.tooltip}<span id='goldCost${action.varName}'></span>
                    ${(action.goldCost === undefined) ? "" : action.tooltip2}
					</span>
                    ${actionSkills}
                    ${actionStats}
                    <div class='bold'>${_text("actions>tooltip>mana_cost")}:</div> <div id='manaCost${action.varName}'>${formatNumber(action.manaCost())}</div><br>
                    <div class='bold'>${_text("actions>tooltip>exp_multiplier")}:</div> ${action.expMult * 100}%<br>
                </div>
            </div>`;
		
        const actionsDiv = document.createElement("div");
        actionsDiv.innerHTML = totalDivText;
        if (isTravel) actionsDiv.style.width = "100%";
		
        actionOptionsTown[action.townNum].appendChild(actionsDiv);

        if (action.storyReqs !== undefined) {
            let storyTooltipText = "";
            let lastInBranch = false;
            const storyAmt = _text(`actions>${action.name.toLowerCase().replace(/ /gu, "_")}`, "fallback").split("⮀").length - 1;
            for (let i = 1; i <= storyAmt; i++) {
                if (_text(`actions>${action.name.toLowerCase().replace(/ /gu, "_")}>story_${i}`) === undefined) console.log(`actions>${action.name.toLowerCase().replace(/ /gu, "_")}>story_${i}`);
                const storyText = _text(`actions>${action.name.toLowerCase().replace(/ /gu, "_")}>story_${i}`, "fallback").split("⮀");
                if (action.storyReqs(i)) {
                    storyTooltipText += storyText[0] + storyText[1] + "<br>";
                    lastInBranch = false;
                } else if (lastInBranch) {
                    storyTooltipText += "<b>???:</b> ???";
                } else {
                    storyTooltipText += `${storyText[0]} ???`;
                    lastInBranch = true;
                }
                storyTooltipText += "<br>";
            }
    	
            const storyDivText =
                `<div id='storyContainer${action.varName}' class='storyContainer showthat' draggable='false' onmouseover='hideNotification("storyContainer${action.varName}"), view.updateActionStory("${action.varName}")'>${action.label}
                    <br>
                    <div style='position:relative'>
                        <img src='img/${camelize(action.name)}.svg' class='superLargeIcon' draggable='false'>
                        <div id='storyContainer${action.varName}Notification' class='notification storyNotification'></div>
                    </div>
                    <div class='showthisstory' draggable='false'>
                        ${storyTooltipText}
                    </div>
                </div>`;
    
            const storyDiv = document.createElement("div");
            storyDiv.innerHTML = storyDivText;
            actionStoriesTown[action.townNum].appendChild(storyDiv);
			
        }
		
    };
	
	this.updateSquirrelMode = function(){
				
		for (const prop in Action) {
            const action = Action[prop];
			let newActionTooltip = "";
			const divName = `storyContainer${action.varName}`;
			
			if(squirrelMode){

				const tooltipLevel = squirrelLevel[camelize(action.varName)]
				if(tooltipLevel === undefined || tooltipLevel === 0){	
					newActionTooltip =  _text("actions>squirrel_default"); 
				} else {
					newActionTooltip =  _text("actions>"+getXMLName(action.name)+">squirrel_"+tooltipLevel); 
				}
					
				if(action.storyReqs !== undefined){
					
					let newStoryTooltip = "";
					
					storeTextStories[action.varName] = document.getElementById(divName).children[2].innerHTML;
					storeCompletedStories[action.varName] = document.getElementById(divName).classList.value.includes("storyContainerCompleted");
					
					document.getElementById(divName).classList.remove("storyContainerCompleted");
					
					if(tooltipLevel === undefined || tooltipLevel === 0){	
						newStoryTooltip =  "<b>???</b>"; 
					} else {
						for(let i= 1; i <= tooltipLevel; i++){
							newStoryTooltip += ("<b>Effect n°"+i+" : </b>");
							if(i !== tooltipLevel) newStoryTooltip += 	(( _text("actions>"+getXMLName(action.name)+">squirrel_"+i)+"<br>").replace("<hr class='divider'>", "<br>")).replace("<hr class='divider'>", "<br>");
							else newStoryTooltip += 					(( _text("actions>"+getXMLName(action.name)+">squirrel_"+i)+"<br>").replace("<hr class='divider'>", "<br>")).replace("<hr class='divider'>", "");
							if(!(_text("actions>"+getXMLName(action.name)+">squirrel_"+i).includes(">="))) document.getElementById(divName).classList.add("storyContainerCompleted");
						}
					}			

                    document.getElementById(divName).children[2].innerHTML = newStoryTooltip;
					
				}

					
			} else {	
				newActionTooltip = action.tooltip+`<span id='goldCost`+action.varName+`'></span>`+((action.goldCost === undefined) ? "" : action.tooltip2)	

				if(action.storyReqs !== undefined){
					document.getElementById(divName).children[2].innerHTML = storeTextStories[action.varName];
					
					if (storeCompletedStories[action.varName]) {
                            document.getElementById(divName).classList.add("storyContainerCompleted");
                        } else {
                            document.getElementById(divName).classList.remove("storyContainerCompleted");
                        }
				}					
				
			}
						
			document.getElementById("actionTooltipMode"+action.varName).innerHTML = newActionTooltip;
			this.adjustManaCost(action.name, squirrelMode);
			this.updateTrainingLimits();
			
        }
		this.updateResources();
		this.adjustGoldCosts();
		
	};
	
	this.updateSquirrelTooltip = function(action) {
		
		let newActionTooltip = "";
		const divName = `storyContainer${action.varName}`;
		
		const tooltipLevel = squirrelLevel[camelize(action.varName)]
		if(tooltipLevel === undefined || tooltipLevel === 0){	
			newActionTooltip =  _text("actions>squirrel_default"); 
		} else {
			newActionTooltip =  _text("actions>"+getXMLName(action.name)+">squirrel_"+tooltipLevel); 
		}
		
		document.getElementById("actionTooltipMode"+action.varName).innerHTML = newActionTooltip;
		
		if(action.storyReqs !== undefined){
					
			let newStoryTooltip = "";
						
			document.getElementById(divName).classList.remove("storyContainerCompleted");
			
			if(tooltipLevel === undefined || tooltipLevel === 0){	
				newStoryTooltip =  "<b>???</b>"; 
			} else {
				for(let i= 1; i <= tooltipLevel; i++){
					newStoryTooltip += ("<b>Effect n°"+i+" : </b>");
					newStoryTooltip += ( _text("actions>"+getXMLName(action.name)+">squirrel_"+i)+"<br>");
					if(i !== tooltipLevel) newStoryTooltip += "<br>";
					if(!(_text("actions>"+getXMLName(action.name)+">squirrel_"+i).includes(">="))) document.getElementById(divName).classList.add("storyContainerCompleted");
				}
			}			

			document.getElementById(divName).children[2].innerHTML = newStoryTooltip;
			
		}
		
	};

	this.updateAction = function(action) {
        if (action === undefined) return
		let container = document.getElementById(`container${action}`);
		this.adjustTooltipPosition(container.querySelector("div.showthis"));        
    }
	
	this.updateActionStory = function(action) {
        if (action === undefined) return		
		let container = document.getElementById(`storyContainer${action}`)
		this.adjustStoryTooltipPosition(container.querySelector("div.showthisstory"));
        
    }

    this.adjustManaCost = function(actionName, squirrelTooltip) {
        const action = translateClassNames(actionName);
        document.getElementById(`manaCost${action.varName}`).textContent = formatNumber(action.manaCost(squirrelTooltip));
    };

    this.adjustGoldCost = function(varName, amount) {
		if(squirrelMode) return;
        document.getElementById(`goldCost${varName}`).textContent = formatNumber(amount);
    };
    this.adjustGoldCosts = function() {
        for (const action of actionsWithGoldCost) {
            this.adjustGoldCost(action.varName, action.goldCost());
        }
    };
    this.adjustExpGain = function(action) {
        for (const skill in action.skills) {
            if (Number.isInteger(action.skills[skill])) document.getElementById(`expGain${action.varName}${skill}`).textContent = ` ${action.skills[skill].toFixed(0)}`;
            else document.getElementById(`expGain${action.varName}${skill}`).textContent = ` ${action.skills[skill]().toFixed(0)}`;
        }
    };
    this.adjustExpGains = function() {
        for (const action of totalActionList) {
            if (action.skills) this.adjustExpGain(action);
        }
    };

    this.createTownInfo = function(action) {
        const totalInfoText =
            `<div class='townInfoContainer showthat'>
                <div class='bold townLabel'>${action.labelDone}</div>
                <div id='goodTemp${action.varName}'>0</div> <i class='fa fa-arrow-left'></i>
                <div id='good${action.varName}'>0</div> <i class='fa fa-arrow-left'></i>
                <div id='unchecked${action.varName}'>0</div>
                <input type='checkbox' id='searchToggler${action.varName}' style='margin-left:10px;'>
                <label for='searchToggler${action.varName}'> Lootable first</label>
                <div class='showthis'>${action.infoText()}</div>
            </div><br>`;

        const infoDiv = document.createElement("div");
        infoDiv.id = `infoContainer${action.varName}`;
        infoDiv.style.display = "block";
        infoDiv.innerHTML = totalInfoText;
        townInfos[action.townNum].appendChild(infoDiv);
    };

    this.createMultiPartPBar = function(action) {
        let pbars = "";
        const width = `style='width:calc(${91 / action.segments}% - 4px)'`;
        const varName = action.varName;
        for (let i = 0; i < action.segments; i++) {
            pbars += `<div class='thickProgressBar showthat' ${width}>
                        <div id='expBar${i}${varName}' class='segmentBar'></div>
                        <div class='showthis' id='tooltip${i}${varName}'>
                            <div id='segmentName${i}${varName}'></div><br>
                            <div class='bold'>Main Stat</div> <div id='mainStat${i}${varName}'></div><br>
                            <div class='bold'>Progress</div> <div id='progress${i}${varName}'></div> / <div id='progressNeeded${i}${varName}'></div>
                        </div>
                    </div>`;
        }
        const completedTooltip = action.completedTooltip ? action.completedTooltip() : "";
        let mouseOver = "";
        if (varName === "SDungeon") mouseOver = "onmouseover='view.showDungeon(0)' onmouseout='view.showDungeon(undefined)'";
        else if (varName === "LDungeon") mouseOver = "onmouseover='view.showDungeon(1)' onmouseout='view.showDungeon(undefined)'";
        else if (varName === "TheSpire") mouseOver = "onmouseover='view.showDungeon(2)' onmouseout='view.showDungeon(undefined)'";
        const totalDivText =
            `<div class='townStatContainer' style='text-align:center' id='infoContainer${varName}'>
                <div class='bold townLabel' style='float:left' id='multiPartName${varName}'></div>
                <div class='completedInfo showthat' ${mouseOver}>
                    <div class='bold'>${action.labelDone}</div>
                    <div id='completed${varName}'></div>
                    ${completedTooltip === "" ? "" : `<div class='showthis' id='completedContainer${varName}'>
                        ${completedTooltip}
                    </div>`}
                </div>
                <br>
                ${pbars}
            </div>`;

        const progressDiv = document.createElement("div");
        progressDiv.style.display = "block";
        progressDiv.innerHTML = totalDivText;
        townInfos[action.townNum].appendChild(progressDiv);
    };

    this.updateMultiPartActions = function() {
        for (const action of totalActionList) {
            if (action.type === "multipart") {
                this.updateMultiPart(action);
                this.updateMultiPartSegments(action);
            }
        }
    };
    
    this.updateMultiPartSegments = function(action) {
        let segment = 0;
        let curProgress = towns[action.townNum][action.varName];
        // update previous segments
        let loopCost = action.loopCost(segment);
        while (curProgress >= loopCost && segment < action.segments) {
            document.getElementById(`expBar${segment}${action.varName}`).style.width = "0px";
            const roundedLoopCost = intToStringRound(loopCost);
            if (document.getElementById(`progress${segment}${action.varName}`).textContent !== roundedLoopCost) {
                document.getElementById(`progress${segment}${action.varName}`).textContent = roundedLoopCost;
                document.getElementById(`progressNeeded${segment}${action.varName}`).textContent = roundedLoopCost;
            }

            curProgress -= loopCost;
            segment++;
            loopCost = action.loopCost(segment);
        }

        // update current segments
        if (document.getElementById(`progress${segment}${action.varName}`)) {
            document.getElementById(`expBar${segment}${action.varName}`).style.width = `${100 - 100 * curProgress / loopCost}%`;
            document.getElementById(`progress${segment}${action.varName}`).textContent = intToStringRound(curProgress);
            document.getElementById(`progressNeeded${segment}${action.varName}`).textContent = intToStringRound(loopCost);
        }

        // update later segments
        for (let i = segment + 1; i < action.segments; i++) {
            document.getElementById(`expBar${i}${action.varName}`).style.width = "100%";
            if (document.getElementById(`progress${i}${action.varName}`).textContent !== "0") {
                document.getElementById(`progress${i}${action.varName}`).textContent = "0";
            }
            document.getElementById(`progressNeeded${i}${action.varName}`).textContent = intToStringRound(action.loopCost(i));
        }
    };

    this.showDungeon = function(index) {
        dungeonShowing = index;
        if (index !== undefined) this.updateSoulstoneChance(index);
    };

    this.updateSoulstoneChance = function(index) {
        const dungeon = dungeons[index];
        for (let i = 0; i < dungeon.length; i++) {
            const level = dungeon[i];
            document.getElementById(`soulstoneChance${index}_${i}`).textContent = intToString(level.ssChance * 100, 4);
            document.getElementById(`soulstonePrevious${index}_${i}`).textContent = level.lastStat;
            document.getElementById(`soulstoneCompleted${index}_${i}`).textContent = formatNumber(level.completed);
        }
    };

    this.updateTrials = function() {
        for(let i = 0; i < trials.length; i++)
        {
            this.updateTrialInfo(i,0);
        }
    };

    this.updateTrialInfo = function(trialNum, curFloor) {
        const trial = trials[trialNum];
            document.getElementById(`trial${trialNum}HighestFloor`).textContent = trial.highestFloor + 1;
            if (curFloor >= trial.length) {
                document.getElementById(`trial${trialNum}CurFloor`).textContent = "";
                document.getElementById(`trial${trialNum}CurFloorCompleted`).textContent = "";
            }
            else {
                document.getElementById(`trial${trialNum}CurFloor`).textContent = "" + (curFloor + 1);
                document.getElementById(`trial${trialNum}CurFloorCompleted`).textContent = trial[curFloor].completed;
            }
            if (curFloor > 0) {
                document.getElementById(`trial${trialNum}LastFloor`).textContent = curFloor;
                document.getElementById(`trial${trialNum}LastFloorCompleted`).textContent = trial[curFloor - 1].completed;
            }
    };

    this.updateSoulstones = function() {
        for (const stat of statList) {
            if (stats[stat].soulstone) {
                document.getElementById(`ss${stat}Container`).style.display = "inline-block";
                document.getElementById(`ss${stat}`).textContent = intToString(stats[stat].soulstone, 1);
                document.getElementById(`stat${stat}SSBonus`).textContent = intToString(stats[stat].soulstone ? calcSoulstoneMult(stats[stat].soulstone) : 0);
                document.getElementById(`stat${stat}ss`).textContent = intToString(stats[stat].soulstone, 1);
            } else {
                document.getElementById(`ss${stat}Container`).style.display = "none";
                document.getElementById(`stat${stat}ss`).textContent = "";
            }
        }
    };

    this.updateMultiPart = function(action) {
        const town = towns[action.townNum];
        document.getElementById(`multiPartName${action.varName}`).textContent = action.getPartName();
        document.getElementById(`completed${action.varName}`).textContent = ` ${formatNumber(town[`total${action.varName}`])}`;
        for (let i = 0; i < action.segments; i++) {
            const expBar = document.getElementById(`expBar${i}${action.varName}`);
            if (!expBar) {
                continue;
            }
            const mainStat = action.loopStats[(town[`${action.varName}LoopCounter`] + i) % action.loopStats.length];
            document.getElementById(`mainStat${i}${action.varName}`).textContent = _text(`stats>${mainStat}>short_form`);
            addStatColors(expBar, mainStat);
            document.getElementById(`segmentName${i}${action.varName}`).textContent = action.getSegmentName(town[`${action.varName}LoopCounter`] + i);
        }
    };

    this.updateTrainingLimits = function() {
        for (let i = 0; i < statList.length; i++) {
            const trainingDiv = document.getElementById(`trainingLimit${statList[i]}`);
            if (trainingDiv) {
                trainingDiv.textContent = trainingLimits;
            }
        }
        if (getBuffLevel("Imbuement") > 0 || getBuffLevel("Imbuement3") > 0) document.getElementById("maxTraining").style.display = "";
    };

    // when you mouseover Story
    this.updateStory = function(num) {
        document.getElementById("newStory").style.display = "none";
        if (num <= 0) {
            num = 0;
            document.getElementById("storyLeft").style.visibility = "hidden";
        } else {
            document.getElementById("storyLeft").style.visibility = "visible";
        }

        if (num >= storyMax) {
            num = storyMax;
            document.getElementById("storyRight").style.visibility = "hidden";
        } else {
            document.getElementById("storyRight").style.visibility = "visible";
        }
        for (let i = 0; i < 10; i++) {
            const storyDiv = document.getElementById(`story${i}`);
            if (storyDiv) {
                storyDiv.style.display = "none";
            }
        }
        storyShowing = num;
        document.getElementById("storyPage").textContent = storyShowing + 1;
        document.getElementById(`story${num}`).style.display = "inline-block";
    };

    this.changeStatView = function() {
        const statContainer = document.getElementById("statContainer");
        if (document.getElementById("regularStats").checked) {
            document.getElementById("radarChart").style.display = "none";
			statContainer.style.display = "inline-block";
            statContainer.style.position = "relative";
            for (const node of statContainer.childNodes) {
                removeClassFromDiv(node, "statRadarContainer");
                addClassToDiv(node, "statRegularContainer");
                node.children[0].style.display = "inline-block";
            }
            document.getElementById("statsColumn").style.width = "360px";
        } else {
            document.getElementById("radarChart").style.display = "inline-block";
			statContainer.style.display = "none";
            statContainer.style.position = "absolute";
            for (const node of statContainer.childNodes) {
                addClassToDiv(node, "statRadarContainer");
                removeClassFromDiv(node, "statRegularContainer");
                node.children[0].style.display = "none";
            }
            document.getElementById("statsColumn").style.width = "410px";
            statGraph.update();
        }
    };

    this.changeTheme = function(init) {
        if (init) document.getElementById("themeInput").value = options.theme;
        options.theme = document.getElementById("themeInput").value;
        document.getElementById("theBody").className = `t-${options.theme}`;
    };
	
	
	this.createTravelMenu = function() {
		let travelMenu = document.getElementById("travelMenu");
		travelMenu.innerHTML = "";
		
		zoneOrder.forEach((zones) => {
			if(townsUnlocked.includes(zones[0])){
				travelMenu.innerHTML += `<div id='travelButton`+zones[0]+`' class='button showthat control' onClick='view.showTown(`+zones[0]+`, arrow.none)'>`+(_text(`towns>town${zones[0]}>name`))+`</div>`;
			}
			if(zones[1] !== undefined && townsUnlocked.includes(zones[1])){
				travelMenu.innerHTML += `<div id='travelButton`+zones[1]+`' class='button showthat control' onClick='view.showTown(`+zones[1]+`, arrow.none)'>`+(_text(`towns>town${zones[1]}>name`))+`</div><br>`;
			} else if(townsUnlocked.includes(zones[0])){	
				travelMenu.innerHTML += `<br>`;
			}
		});
		
    }
	
	this.updateTravelMenu = function() {
		view.createTravelMenu();
	}
	
	this.updateBuffCaps = function(upgradeSpiritBlessing) {
		
				
		for (const buff of buffList) {
			
			if(buff === "ImbueSoulstones" && upgradeSpiritBlessing){
				
				const ImbudeSoulstonesCap = Math.max(0, getBuffLevel("SpiritBlessing")-2)*10;
				
				buffHardCaps.ImbueSoulstones = ImbudeSoulstonesCap;
				buffCaps.ImbueSoulstones = ImbudeSoulstonesCap;
				
			} else {
				
				let buffCapValue = Math.max(document.getElementById(`buff${buff}Cap`).value, getBuffLevel(buff));
				buffCapValue = Math.min(buffCapValue, buffHardCaps[buff]);
				
				buffCaps[buff] = buffCapValue;
			}
			
			document.getElementById(`buff${buff}Cap`).value = buffCaps[buff];	

		}
		
	}
	
	this.updateStartingMana = function() {
		
		timeNeededInitial = 5 * baseManaPerSecond + 50 * getBuffLevel("ImbueSoulstones");
		document.getElementById("buffImbueSoulstonesStartingMana").textContent = timeNeededInitial;
	}
	
	this.updateFavModeShown = function(actionName) {
		
		let favModeImage = "";
		if(favMode[camelize(actionName)] === fav.human){
			favModeImage = "img/human.svg";
		} else if(favMode[camelize(actionName)] === fav.squirrel){
			favModeImage = squirrelIcon;
		}
		
		let favVisible = "hidden";
		if(favModeImage !== ""){
			favVisible = "visible";
		}
				
		document.getElementById(`favMode${actionName}`).src = favModeImage;
		document.getElementById(`favMode${actionName}`).style.visibility = favVisible;
		
	}
}

function unlockGlobalStory(num) {
    if (num > storyMax) {
        document.getElementById("newStory").style.display = "inline-block";
        storyMax = num;
    }
}

function unlockStory(name) {
    if (!storyReqs[name]) storyReqs[name] = true;
}

const curActionsDiv = document.getElementById("curActionsList");
const nextActionsDiv = document.getElementById("nextActionsList");
const actionOptionsTown = [];
const actionStoriesTown = [];
const townInfos = [];
for (let i = 0; i <= 10; i++) {
    actionOptionsTown[i] = document.getElementById(`actionOptionsTown${i}`);
    actionStoriesTown[i] = document.getElementById(`actionStoriesTown${i}`);
    townInfos[i] = document.getElementById(`townInfo${i}`);
}

function addStatColors(theDiv, stat) {
    if (stat === "Str") {
        theDiv.style.backgroundColor = "#d70037";
    } else if (stat === "Dex") {
        theDiv.style.backgroundColor = "#9fd430";
    } else if (stat === "Con") {
        theDiv.style.backgroundColor = "#b06f37";
    } else if (stat === "Per") {
        theDiv.style.backgroundColor = "#4ce2e9";
    } else if (stat === "Int") {
        theDiv.style.backgroundColor = "#2640b2";
    } else if (stat === "Cha") {
        theDiv.style.backgroundColor = "#F48FB1";
    } else if (stat === "Spd") {
        theDiv.style.backgroundColor = "#f6e300";
    } else if (stat === "Luck") {
        theDiv.style.backgroundColor = "#3feb53";
    } else if (stat === "Soul") {
        theDiv.style.backgroundColor = "#AB47BC";
    }
}

function dragOverDecorate(i) {
    if (document.getElementById(`nextActionContainer${i}`)) document.getElementById(`nextActionContainer${i}`).classList.add("draggedOverAction");
}

function dragExitUndecorate(i) {
    if (document.getElementById(`nextActionContainer${i}`)) document.getElementById(`nextActionContainer${i}`).classList.remove("draggedOverAction");
}

function draggedDecorate(i) {
    if (document.getElementById(`nextActionContainer${i}`)) document.getElementById(`nextActionContainer${i}`).classList.add("draggedAction");
}

function draggedUndecorate(i) {
    if (document.getElementById(`nextActionContainer${i}`)) document.getElementById(`nextActionContainer${i}`).classList.remove("draggedAction");
    showActionIcons();
}

function adjustActionListSize(amt) {
    if (document.getElementById("expandableList").style.height === "" && amt > 0) {
        document.getElementById("expandableList").style.height = `${500 + amt}px`;
        curActionsDiv.style.maxHeight = `${457 + amt}px`;
        nextActionsDiv.style.maxHeight = `${457 + amt}px`;
    } else if (document.getElementById("expandableList").style.height === "" && amt === -100) {
        document.getElementById("expandableList").style.height = "500px";
        curActionsDiv.style.maxHeight = "457px";
        nextActionsDiv.style.maxHeight = "457px";
    } else {
        document.getElementById("expandableList").style.height = `${Math.min(Math.max(parseInt(document.getElementById("expandableList").style.height) + amt, 500), 2000)}px`;
        curActionsDiv.style.maxHeight = `${Math.min(Math.max(parseInt(curActionsDiv.style.maxHeight) + amt, 457), 1957)}px`;
        nextActionsDiv.style.maxHeight = `${Math.min(Math.max(parseInt(nextActionsDiv.style.maxHeight) + amt, 457), 1957)}px`;
    }
    setScreenSize();
    saveUISettings();
}

function setScreenSize() {
    screenSize = document.body.scrollHeight;
}

//Attempts at getting divs to stay on screen, but can't figure it out still
function clampDivs() {
    let tooltips = Array.from(document.getElementsByClassName("showthis"));
    let test = document.getElementById("radarStats");
    console.log(screenSize);
    tooltips.forEach(tooltip => {
        var offsets = cumulativeOffset(tooltip);
        if (offsets.top != 0) console.log("Top: " + offsets.top + ". Height: " + tooltip.clientHeight + ". Total: " + (offsets.top + tooltip.clientHeight) + ". Screensize: " + screenSize);
        if (offsets.top < 0) console.log("Offscreen - top");
        if (offsets.top + tooltip.clientHeight > screenSize) tooltip.style.top = -100 + 'px';
    });
}

function cumulativeOffset(element) {
    var top = 0, bottom = 0;
    do {
        top += element.offsetTop  || 0;
        bottom += element.offsetBottom || 0;
        element = element.offsetParent;
    } while(element);

    return {
        top: top,
        bottom: bottom
    };
}
