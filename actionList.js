"use strict";

function withoutSpaces(name) {
    return name.replace(/ /gu, "");
}

function translateClassNames(name) {
    // construct a new action object with appropriate prototype
    const nameWithoutSpaces = withoutSpaces(name);
    if (nameWithoutSpaces in Action) {
        return Object.create(Action[nameWithoutSpaces]);
    }
    console.log(`error trying to create ${name}`);
    return false;
}

const limitedActions = [
    "SurveyZ0",
    "SurveyZ1",
    "SurveyZ2",
    "SurveyZ3",
    "SurveyZ4",
    "SurveyZ5",
    "SurveyZ6",
    "SurveyZ7",
    "SurveyZ8",
	"Absorb Mana",
    "Smash Pots",
    "Pick Locks",
    "Short Quest",
    "Long Quest",
    "Gather Herbs",
    "Wild Mana",
    "Hunt",
    "Gamble",
    "Mana Geyser",
    "Mine Soulstones",
    "Take Artifacts",
    "Accept Donations",
    "Mana Well",
    "Destroy Pylons"
];
const trainingActions = [
    "Train Strength",
    "Sit By Waterfall",
    "Read Books",
    "Bird Watching",
    "Oracle",
    "Charm School"
];
function hasLimit(name) {
    return limitedActions.includes(name);
}
function getTravelNum(name) {
    if (name === "Face Judgement" && resources.reputation <= 50) return 2;
    if (name === "Face Judgement" && resources.reputation >= 50) return 1;
    if (name === "Start Journey" || name === "Continue On" || name === "Start Trek" || name === "Fall From Grace" || name === "Journey Forth" || name === "Escape" || name === "Leave City" || name === "Guru") return 1;
    if (name === "Hitch Ride") return 2;
    if (name === "Underworld") return 5;
    if (name === "Open Portal") return -5;
	if (name === "Mysterious Voice") return 1;
	if (name === "Break Loop") return 1;
    return 0;
}
function isTraining(name) {
    return trainingActions.includes(name);
}

function getXMLName(name) {
    return name.toLowerCase().replace(/ /gu, "_");
}

// there are 4 types of actions
// 1: normal actions. normal actions have no additional UI (haggle, train strength)
// 2: progress actions. progress actions have a progress bar and use 100, 200, 300, etc. leveling system (wander, meet people)
// 3: limited actions. limited actions have town info for their limit, and a set of town vars for their "data"
// 4: multipart actions. multipart actions have multiple distinct parts to get through before repeating. they also get a bonus depending on how often you complete them

// type names are "normal", "progress", "limited", and "multipart".
// define one of these in the action, and they will create any additional UI elements that are needed

// exp mults are default 100%, 150% for skill training actions, 200% for actions that cost a resource, 300% for actions that cost 2 resources, and 500% for actions that cost soulstones
// todo: ^^ currently some actions are too high, but I am saving these balance changes for the z5/z6 update

// actions are all sorted below by town in order

function Action(name, extras) {
    this.name = name;
    // many actions have to override this (in extras) for save compatibility, because the
    // varName is often used in parts of the game state
    this.varName = withoutSpaces(name);
    Object.assign(this, extras);
}

/* eslint-disable no-invalid-this */
// not all actions have tooltip2 or labelDone, but among actions that do, the XML format is
// always the same; these are loaded lazily once (and then they become own properties of the
// specific Action object)
defineLazyGetter(Action.prototype, "tooltip", function() {
    return _txt(`actions>${getXMLName(this.name)}>tooltip`);
});
defineLazyGetter(Action.prototype, "tooltip2", function() {
    return _txt(`actions>${getXMLName(this.name)}>tooltip2`);
});
defineLazyGetter(Action.prototype, "label", function() {
    return _txt(`actions>${getXMLName(this.name)}>label`);
});
defineLazyGetter(Action.prototype, "labelDone", function() {
    return _txt(`actions>${getXMLName(this.name)}>label_done`);
});

// all actions to date with info text have the same info text, so presently this is
// centralized here (function will not be called by the game code if info text is not
// applicable)
Action.prototype.infoText = function() {
    return `${_txt(`actions>${getXMLName(this.name)}>info_text1`)}
            <i class='fa fa-arrow-left'></i>
            ${_txt(`actions>${getXMLName(this.name)}>info_text2`)}
            <i class='fa fa-arrow-left'></i>
            ${_txt(`actions>${getXMLName(this.name)}>info_text3`)}
            <br><span class='bold'>${`${_txt("actions>tooltip>total_found")}: `}</span><div id='total${this.varName}'></div>
            <br><span class='bold'>${`${_txt("actions>tooltip>total_checked")}: `}</span><div id='checked${this.varName}'></div>`;
};

// same as Action, but contains shared code to load segment names for multipart actions.
// (constructor takes number of segments as a second argument)
function MultipartAction(name, extras) {
    Action.call(this, name, extras);
    this.segments = (extras.varName === "Fight") ? 3 : extras.loopStats.length;
}
MultipartAction.prototype = Object.create(Action.prototype);
MultipartAction.prototype.constructor = MultipartAction;
// lazily calculate segment names when explicitly requested (to give chance for localization
// code to be loaded first)
defineLazyGetter(MultipartAction.prototype, "segmentNames", function() {
    return Array.from(
        _txtsObj(`actions>${getXMLName(this.name)}>segment_names>name`)
    ).map(elt => elt.textContent);
});
MultipartAction.prototype.getSegmentName = function(segment) {
    return this.segmentNames[segment % this.segmentNames.length];
};
/* eslint-enable no-invalid-this */

// same as MultipartAction, but includes shared code to generate dungeon completion tooltip
// as well as specifying 7 segments (constructor takes dungeon ID number as a second
// argument)
function DungeonAction(name, dungeonNum, extras) {
    MultipartAction.call(this, name, extras);
    this.dungeonNum = dungeonNum;
}
DungeonAction.prototype = Object.create(MultipartAction.prototype);
DungeonAction.prototype.constructor = DungeonAction;
DungeonAction.prototype.completedTooltip = function() {
    let ssDivContainer = "";
    if (this.dungeonNum < 3) {
        for (let i = 0; i < dungeons[this.dungeonNum].length; i++) {
            ssDivContainer += `Floor ${i + 1} |
                                <div class='bold'>${_txt(`actions>${getXMLName(this.name)}>chance_label`)} </div> <div id='soulstoneChance${this.dungeonNum}_${i}'></div>% - 
                                <div class='bold'>${_txt(`actions>${getXMLName(this.name)}>last_stat_label`)} </div> <div id='soulstonePrevious${this.dungeonNum}_${i}'>NA</div> - 
                                <div class='bold'>${_txt(`actions>${getXMLName(this.name)}>label_done`)}</div> <div id='soulstoneCompleted${this.dungeonNum}_${i}'></div><br>`;
        }
    }
    return _txt(`actions>${getXMLName(this.name)}>completed_tooltip`) + ssDivContainer;
};
DungeonAction.prototype.getPartName = function() {
    const floor = Math.floor((towns[this.townNum][`${this.varName}LoopCounter`] + 0.0001) / this.segments + 1);
    return `${_txt(`actions>${getXMLName(this.name)}>label_part`)} ${floor <= dungeons[this.dungeonNum].length ? numberToWords(floor) : _txt(`actions>${getXMLName(this.name)}>label_complete`)}`;
};

function TrialAction(name, trialNum, extras) {
    MultipartAction.call(this, name, extras);
    this.trialNum = trialNum;
}
TrialAction.prototype = Object.create(MultipartAction.prototype);
TrialAction.prototype.constructor = TrialAction;
TrialAction.prototype.completedTooltip = function() {
    return this.name + ` Highest Floor: <div id='trial${this.trialNum}HighestFloor'>0</div><br>
    Current Floor: <div id='trial${this.trialNum}CurFloor'>0</div> - Completed <div id='trial${this.trialNum}CurFloorCompleted'>x</div> times<br>
    Last Floor: <div id='trial${this.trialNum}LastFloor'>N/A</div> - Completed <div id='trial${this.trialNum}LastFloorCompleted'>N/A</div> times<br>`;
}
TrialAction.prototype.getPartName = function() {
    const floor = Math.floor((towns[this.townNum][`${this.varName}LoopCounter`] + 0.0001) / this.segments + 1);
    return `${_txt(`actions>${getXMLName(this.name)}>label_part`)} ${floor <= trials[this.trialNum].length ? numberToWords(floor) : _txt(`actions>${getXMLName(this.name)}>label_complete`)}`;
};
TrialAction.prototype.currentFloor = function() {
    return Math.floor(towns[this.townNum][`${this.varName}LoopCounter`] / this.segments + 0.0000001);
}
TrialAction.prototype.loopCost = function(segment) {
    return precision3(Math.pow(this.floorScaling, Math.floor((towns[this.townNum][`${this.varName}LoopCounter`] + segment) / this.segments + 0.0000001)) * this.baseScaling);
}
TrialAction.prototype.tickProgress = function(offset) {
    return this.baseProgress() *
        (1 + getLevel(this.loopStats[(towns[this.townNum][`${this.varName}LoopCounter`] + offset) % this.loopStats.length]) / 100) *
        Math.sqrt(1 + trials[this.trialNum][this.currentFloor()].completed / 200);
}
TrialAction.prototype.loopsFinished = function() {
    const finishedFloor = this.currentFloor() - 1;
    //console.log("Finished floor: " + finishedFloor + " Current Floor: " + this.currentFloor());
    trials[this.trialNum][finishedFloor].completed++;
    if (finishedFloor > trials[this.trialNum].highestFloor || trials[this.trialNum].highestFloor === undefined) trials[this.trialNum].highestFloor = finishedFloor;
    view.updateTrialInfo(this.trialNum, this.currentFloor());
    this.floorReward();
}

//====================================================================================================
//Survery Actions (All Zones)
//====================================================================================================
function SurveyAction(townNum) {
    var obj = {
        type: "progress",
        expMult: 1,
        stats: {
            Per: 0.4,
            Spd: 0.3,
            Con: 0.2,
            Luck: 0.2
        },
        allowed() {
            return 500 - getOtherSurveysOnList(this.varName);
        },
        manaCost() {
            return 10000 * (this.townNum + 1);
        },
        visible() {
            return getExploreProgress() > 0;
        },
        unlocked() {
            return getExploreProgress() > 0;
        },
        finish() {
            towns[this.townNum].finishProgress(this.varName, getExploreSkill());
        }
    }
    obj.townNum = townNum;
    return obj; 
}

Action.SurveyZ0 = new Action("SurveyZ0", SurveyAction(0));
Action.SurveyZ1 = new Action("SurveyZ1", SurveyAction(1));
Action.SurveyZ2 = new Action("SurveyZ2", SurveyAction(2));
Action.SurveyZ3 = new Action("SurveyZ3", SurveyAction(3));
Action.SurveyZ4 = new Action("SurveyZ4", SurveyAction(4));
Action.SurveyZ5 = new Action("SurveyZ5", SurveyAction(5));
Action.SurveyZ6 = new Action("SurveyZ6", SurveyAction(6));
Action.SurveyZ7 = new Action("SurveyZ7", SurveyAction(7));
Action.SurveyZ8 = new Action("SurveyZ8", SurveyAction(8));

function RuinsAction(townNum) {
    var obj = {
        type: "progress",
        expMult: 1,
        townNum: 1,
        stats: {
            Per: 0.4,
            Spd: 0.3,
            Con: 0.2,
            Luck: 0.2
        },
        manaCost() {
            return 100000;
        },
        affectedBy: ["SurveyZ1"],
        visible() {
            return towns[this.townNum].getLevel("Survey") >= 100;
        },
        unlocked() {
            return towns[this.townNum].getLevel("Survey") >= 100;
        },
        finish() {
            towns[this.townNum].finishProgress(this.varName, 1);
            adjustRocks(this.townNum);
        }
    }
    obj.townNum = townNum;
    return obj; 
}

Action.RuinsZ1 = new Action("RuinsZ1", RuinsAction(1));
Action.RuinsZ3 = new Action("RuinsZ3", RuinsAction(3));
Action.RuinsZ5 = new Action("RuinsZ5", RuinsAction(5));
Action.RuinsZ6 = new Action("RuinsZ6", RuinsAction(6));

function adjustRocks(townNum) {
    let town = towns[townNum];
    let baseStones = town.getLevel("RuinsZ" + townNum) * 2500;
    let usedStones = stonesUsed[townNum];
    town[`totalStonesZ${townNum}`] = baseStones;
    town[`goodStonesZ${townNum}`] = Math.floor(town[`checkedStonesZ${townNum}`] / 1000) - usedStones;
    town[`goodTempStonesZ${townNum}`] = Math.floor(town[`checkedStonesZ${townNum}`] / 1000) - usedStones;
}
function adjustAllRocks() {
    adjustRocks(1);
    adjustRocks(3);
    adjustRocks(5);
    adjustRocks(6);
}

function HaulAction(townNum) {
    var obj = {
        type: "limited",
        expMult: 1,
        townNum: 1,
        varName: "StonesZ" + townNum,
        stats: {
            Str: 0.4,
            Con: 0.6,
        },
        affectedBy: ["SurveyZ1"],
        canStart() {
            return !resources.stone && stonesUsed[this.townNum] < 250;
        },
        manaCost() {
            return 50000;
        },
        visible() {
            return towns[this.townNum].getLevel("RuinsZ" + townNum ) > 0;
        },
        unlocked() {
            return towns[this.townNum].getLevel("RuinsZ" + townNum) > 0;
        },
        finish() {
            stoneLoc = this.townNum;
            towns[this.townNum].finishRegular(this.varName, 1000, () => {
                addResource("stone", true);
            });
        }
    }
    obj.townNum = townNum;
    return obj; 
}

Action.HaulZ1 = new Action("HaulZ1", HaulAction(1));
Action.HaulZ3 = new Action("HaulZ3", HaulAction(3));
Action.HaulZ5 = new Action("HaulZ5", HaulAction(5));
Action.HaulZ6 = new Action("HaulZ6", HaulAction(6));

//====================================================================================================
//Zone 0 - Squirrel Sanctuary
//====================================================================================================

Action.LookAround = new Action("Look Around", {
    type: "progress",
    expMult: 1,
    townNum: 9,
	varName: "LookAround",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return true
        }
        return false;
    },
    stats: {
        Per: 0.6,
        Con: 0.1,
        Spd: 0.3,
    },
	affectedBy: ["Take Glasses"],
    manaCost() {
        return 30000 * (Math.pow(2, towns[SANCTUARY].getLevel(this.varName))) / (Math.pow(6, getBuffLevel("SpiritBlessing")));
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.glasses;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
		
		towns[SANCTUARY].finishProgress(this.varName, 100);
		view.adjustManaCost("Look Around");

    },
	squirrelLevelUp(onlyGetState) 
	{
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Look Around")){
				
			case 0: shouldLevelUp = true;			
				break;
				
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Look Around");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Look Around")){
						
				case 1: break;
										
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

function adjustManaSpots() {
    let town = towns[SANCTUARY];
    let baseManaSpot = town.getLevel("LookAround") * 10;
    town.totalManaSpots = baseManaSpot;
}

Action.AbsorbMana = new Action("Absorb Mana", {
    type: "limited",
    expMult: 1,
    townNum: 9,
	varName: "ManaSpots",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return true
        }
        return false;
    },
    stats: {
        Spd: 0.3,
        Con: 0.1,
		Soul: 0.6
    },
    manaCost() {
        return 10000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return getBuffLevel("SpiritBlessing") >= 1;
    },
    unlocked() {
        return getBuffLevel("SpiritBlessing") >= 1;
    },
	goldCost() {
		const manaBase = 100000;
		const exponent = 1 + (getBuffLevel("SpiritBlessing") * 0.02);
		const manaSpotsAbsorbed = towns[SANCTUARY].goodManaSpots - towns[SANCTUARY].goodTempManaSpots;
						
        return Math.floor(manaBase * Math.pow(exponent, manaSpotsAbsorbed));
    },
    finish() {
		
		const manaGain = this.goldCost();
		towns[SANCTUARY].finishRegular(this.varName, 10, () => {
			addMana(manaGain);	
			return manaGain;
		});
		view.adjustGoldCost("ManaSpots", this.goldCost());
			
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Absorb Mana")){
				
			case 0: shouldLevelUp = true;
				break;
					
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Absorb Mana");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Absorb Mana")){
						
				case 1: break;
										
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});


Action.ImbueSquirrel = new Action("Imbue Squirrel", {
    type: "normal",
    expMult: 1,
    townNum: 9,
	varName: "ImbueSquirrel",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return true
        }
        return false;
    },
    stats: {
        Spd: 0.2,
        Con: 0.3,
		Soul: 0.5
    },
	skillsSquirrel: {
        Magic() {
			const squirrelMod = ((this.squirrelAction && getLevelSquirrelAction("Imbue Squirrel") >= 1) ? 1 : 0);
			return Math.pow(4, getBuffLevel("SpiritBlessing") - squirrelMod);
		}
    },
    manaCost(squirrelTooltip) {
		const squirrelMod = (((this.squirrelAction || squirrelTooltip) && getLevelSquirrelAction("Imbue Squirrel") >= 1) ? 1 : 0);
        return 3500 * Math.pow(3, getBuffLevel("SpiritBlessing")  - squirrelMod);
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return getBuffLevel("SpiritBlessing") >= 2;
    },
    unlocked() {
        return getBuffLevel("SpiritBlessing") >= 2;
    },
	goldCost() {
        return Math.pow(4, getBuffLevel("SpiritBlessing"));
    },
    finish() {
		
		handleSkillSquirrelExp(this.skillsSquirrel);
		
    },
	squirrelLevelUp(onlyGetState) 
	{
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Imbue Squirrel")){
				
			case 0: shouldLevelUp = true;
				break;
					
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Imbue Squirrel");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Imbue Squirrel")){
						
			case 1: actionEffect = () => {
						handleSkillSquirrelExp(this.skillsSquirrel);
						view.adjustManaCost("Imbue Squirrel", squirrelMode);
					};
				break;
									
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.ImbueSoulstones = new Action("Imbue Soulstones", {
    type: "normal",
    expMult: 1,
    townNum: 9,
	varName: "ImbueSoulstones",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return true
        }
        return false;
    },
    stats: {
        Dex: 0.3,
        Int: 0.3,
		Soul: 0.4
    },
    manaCost() {
        return 100000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && this.getMinimumSoulstones();
    },
	getMinimumSoulstones(){
				
		for (const stat of statList) {
			if(stats[stat].soulstone < this.goldCost()) return false;
		}
		
		return true;
	},
	// Gold cost here represent the minimum numbers of soulstones needed.
	goldCost() { 
	
		let soulstonesNeeded = 0;
		
		for(let i = 0; i <= getBuffLevel("ImbueSoulstones"); i++){
			
			soulstonesNeeded += (Math.floor(i/10) + 1);
		}
	
        return soulstonesNeeded;
    },
    visible() {
        return getBuffLevel("SpiritBlessing") >= 3;
    },
    unlocked() {
        return getBuffLevel("SpiritBlessing") >= 3;
    },
    finish() {
		
		addBuffAmt("ImbueSoulstones", 1);
		view.updateStartingMana();
		view.adjustGoldCost(this.varName, this.goldCost());
		
    },
	squirrelLevelUp(onlyGetState) 
	{
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Imbue Soulstones")){
				
			case 0: shouldLevelUp = true;
				break;
					
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Imbue Soulstones");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Imbue Soulstones")){
						
			case 1: break;
									
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.BalanceSoulstones = new Action("Balance Soulstones", {
    type: "normal",
    expMult: 1,
    townNum: 9,
	varName: "BalanceSoulstones",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return true
        }
        return false;
    },
    stats: {
        Dex: 0.3,
        Con: 0.2,
		Per: 0.2,
		Soul: 0.3
    },
    manaCost() {
        return 100000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
	allowed() {
		return Math.pow(3, getBuffLevel("SpiritBlessing") - 4);
	},
	// Gold cost here represent the number of times you can do this action.
	goldCost() { 
       return this.allowed();
    },
    visible() {
        return getBuffLevel("SpiritBlessing") >= 4;
    },
    unlocked() {
        return getBuffLevel("SpiritBlessing") >= 4;
    },
    finish() {
		
		let statWithLessSoulstones = "Dex";
		let statWithMostSoulstones = "Dex";
		
		for (const stat of statList) {
			if(stats[stat].soulstone > stats[statWithMostSoulstones].soulstone) statWithMostSoulstones = stat;
			if(stats[stat].soulstone < stats[statWithLessSoulstones].soulstone) statWithLessSoulstones = stat;
		}
		
		stats[statWithMostSoulstones].soulstone --;
		stats[statWithLessSoulstones].soulstone ++;
		
		view.updateSoulstones();
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Balance Soulstones")){
				
			case 0: shouldLevelUp = true;
				break;
					
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Balance Soulstones");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Balance Soulstones")){
						
			case 1: break;
									
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.MysteriousVoice = new Action("Mysterious Voice", {
    type: "normal",
    expMult: 1,
    townNum: 9,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return true
        }
        return false;
    },
    stats: {
        Per: 0.5,
        Cha: 0.3,
		Soul: 0.2
    },
    manaCost() {
        return 10000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return true;
    },
    unlocked() {
        return towns[SANCTUARY].getLevel("LookAround") >= 1;
    },
    finish() {
		
		switch(getBuffLevel("SpiritBlessing")){
			case 0: addBuffAmt("SpiritBlessing", 1);
				break;
			case 1: break;
			case 2: if(resources.stolenGoods >= 10) addBuffAmt("SpiritBlessing", 1);
				break;
			case 3: if(resources.herbs >= 100) addBuffAmt("SpiritBlessing", 1);
				break;
			case 4: break;
		}
		view.updateActionTooltips();
		view.adjustManaCost("Look Around");
		view.adjustManaCost("Imbue Squirrel");
		view.adjustGoldCost("ImbueSquirrel", Action.ImbueSquirrel.goldCost());
		view.updateBuffCaps(true);
		view.adjustGoldCost("BalanceSoulstones", Action.BalanceSoulstones.goldCost());
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Mysterious Voice")){
				
				case 0: shouldLevelUp = true;
					break;
					
				case 1: if(getSkillSquirrelLevel("Magic") >= getSkillLevel("Magic")) shouldLevelUp = true;
					break;
					
			}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Mysterious Voice");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Mysterious Voice")){
						
			case 1: actionEffect = () => {
						if(getBuffLevel("SpiritBlessing") == 1) {
							addBuffAmt("SpiritBlessing", 1);
							view.updateActionTooltips();
							view.adjustManaCost("Look Around");
							view.adjustManaCost("Imbue Squirrel");
							view.adjustGoldCost("ImbueSquirrel", Action.ImbueSquirrel.goldCost());
						}
					};
					if(getBuffLevel("SpiritBlessing") !== 1) nothingHappens;
					break;
			
			case 2:	 actionEffect = () => {
						if(getBuffLevel("SpiritBlessing") == 1) {
							addBuffAmt("SpiritBlessing", 1);
							view.updateActionTooltips();
							view.adjustManaCost("Look Around");
							view.adjustManaCost("Imbue Squirrel");
							view.adjustGoldCost("ImbueSquirrel", Action.ImbueSquirrel.goldCost());
						}
						// Set the mana to 1000.
						timer = timeNeeded - 1001;
						unlockTown(CHRONOSLAIR);
					};
					loseSquirrel = true;
					break;
										
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});


//====================================================================================================
//Zone 1 - Beginnersville
//====================================================================================================
Action.Wander = new Action("Wander", {
    type: "progress",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 20;
            case 2:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 40;
            case 3:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 60;
            case 4:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 80;
            case 5:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Per: 0.2,
        Con: 0.2,
        Cha: 0.2,
        Spd: 0.3,
        Luck: 0.1
    },
    affectedBy: ["Take Glasses"],
    manaCost() {
        return 500;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
		
		towns[BEGINNERSVILLE].finishProgress(this.varName, 200 * (resources.glasses ? 4 : 1));
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Wander")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 5) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Trust") >= 20) shouldLevelUp = true;
				break;
				
			case 3: if(getSkillSquirrelLevel("Magic") >= 20) shouldLevelUp = true;
				break;
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Wander");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Wander")){
						
			case 1: loseSquirrel = true;
					break;
					
			case 2: break;
			
			case 3: actionEffect = () => {
						adjustPots();
						view.updateRegular("Pots", BEGINNERSVILLE);
					};
					nothingHappens = true;
					break;
			
			case 4: actionEffect = () => {
						adjustPots();
						view.updateRegular("Pots", BEGINNERSVILLE);
					};
					nothingHappens = true;
					break;
			
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

function adjustPots() {
    let town = towns[BEGINNERSVILLE];
    let basePots = town.getLevel("Wander") * 5 + (getLevelSquirrelAction("Wander") >= 3 ? 100 : 0) + (getLevelSquirrelAction("Wander") >= 4 ? 100 : 0);
    town.totalPots = Math.floor(basePots + basePots * getSurveyBonus(town));
}
function adjustLocks() {
    let town = towns[BEGINNERSVILLE];
    let baseLocks = town.getLevel("Wander");
    town.totalLocks = Math.floor(baseLocks * getSkillMod("Spatiomancy", 100, 300, .5) + baseLocks * getSurveyBonus(town));
}

Action.SmashPots = new Action("Smash Pots", {
    type: "limited",
    expMult: 1,
    townNum: 0,
    varName: "Pots",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[BEGINNERSVILLE][`good${this.varName}`] >= 50;
        }
        return false;
    },
    stats: {
        Str: 0.2,
        Per: 0.2,
        Spd: 0.6
    },
    manaCost(squirrelTooltip) {
		let squirrelManaMult = (((this.squirrelAction || squirrelTooltip) && getLevelSquirrelAction("Smash Pots") >= 3) ? 0.8 : 1);
		if(squirrelManaMult === 0.8 && getLevelSquirrelAction("Smash Pots") >= 4) squirrelManaMult = 0.65;
        return Math.ceil(100 * squirrelManaMult);
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    // note this name is misleading: it is used for mana and gold gain.
    goldCost() {
        return 200;
    },
    finish() {
        	
		towns[BEGINNERSVILLE].finishRegular(this.varName, 10, () => {
			const manaGain = this.goldCost();
			addMana(manaGain);
			return manaGain;
		});
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Smash Pots")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 10) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Trust") >= 15) shouldLevelUp = true;
				break;
				
			case 3: if(getSkillSquirrelLevel("Combat") >= 20) shouldLevelUp = true;
				break;
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Smash Pots");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Smash Pots")){
						
				case 1: break;
						
				case 2: break;
				
				case 3: actionEffect = () => {
							view.adjustManaCost("Smash Pots", squirrelMode);
							towns[BEGINNERSVILLE].finishRegular(this.varName, 10, () => {
								const manaGain = this.goldCost();
								addMana(manaGain);
								return manaGain;
							});
						};
						break;
						
				case 4:  actionEffect = () => {
							view.adjustManaCost("Smash Pots", squirrelMode);
							towns[BEGINNERSVILLE].finishRegular(this.varName, 10, () => {
								const manaGain = this.goldCost();
								addMana(manaGain);
								return manaGain;
							});
						};
						break;
				
			}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
	
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.PetSquirrel = new Action("Pet Squirrel", {
    type: "normal",
    expMult: 1,
    townNum: 0,
	storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return getSkillSquirrelLevel("Trust") >= 1;
				
			case 2:
				return getSkillSquirrelLevel("Trust") >= 50;
        }
        return false;
    },
    stats: {
        Cha: 0.6,
        Dex: 0.3,
        Soul: 0.1
    },
	skillsSquirrel: {
		Trust : 100
	},
    manaCost(squirrelTooltip) {
		if((this.squirrelAction || squirrelTooltip) && getLevelSquirrelAction("Pet Squirrel") >= 3) return 2500;
        return 100 + getSkillSquirrelLevel("Trust") * 100;
    },
	canStart() {
        if(this.squirrelAction){
			if(getLevelSquirrelAction("Pet Squirrel") >= 3) return (resources.squirrel && resources.reputation >= 2)
			return resources.squirrel;
		}
		if(getLevelSquirrelAction("Pet Squirrel") >= 2 && !resources.squirrel ) return false;
		if(getLevelSquirrelAction("Pet Squirrel") < 2 && !resources.squirrel && squirrelAlreadyPickedUp) return false;
		return true;
    },
    visible() {
        return true;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Wander") >= 5;
    },
	
    finish() {	
	
		addResource("squirrel", true);
		handleSkillSquirrelExp(this.skillsSquirrel);
		view.adjustManaCost("Pet Squirrel", squirrelMode);
		squirrelAlreadyPickedUp = true;
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Pet Squirrel")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 5) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Trust") >= 20) shouldLevelUp = true;
				break;
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Pet Squirrel");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Pet Squirrel")){
						
				case 1: break;
						
				case 2: //get the squirrel with you from the start of every loop : managed somewhere else.
						break;
				
				case 3: actionEffect = () => {
							handleSkillSquirrelExp(this.skillsSquirrel);
							handleSkillSquirrelExp(this.skillsSquirrel);
							view.adjustManaCost("Pet Squirrel", squirrelMode);
						};
						break;
				
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
	
});

Action.PickLocks = new Action("Pick Locks", {
    type: "limited",
    varName: "Locks",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[BEGINNERSVILLE][`checked${this.varName}`] >= 1;
            case 2:
                return towns[BEGINNERSVILLE][`checked${this.varName}`] >= 50;
            case 3:
                return towns[BEGINNERSVILLE][`good${this.varName}`] >= 10;
        }
        return false;
    },
    stats: {
        Dex: 0.5,
        Per: 0.3,
        Spd: 0.1,
        Luck: 0.1
    },
    manaCost() {
        return 800;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Wander") >= 3;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Wander") >= 20;
    },
	stolenGoodsGain(){
		return 1;
	},
	goldCost() {
        const goldCostBase = 10;
		//const goldCostBase = Math.floor(base * getSkillMod("Practical",0,200,1) + base * getSkillBonus("Thievery") - base);
		const manaCost = Math.floor(100 * getSkillBonus("Mercantilism")) * goldCostBase;
        return manaCost;
    },
	
    finish() {
		
		towns[BEGINNERSVILLE].finishRegular(this.varName, 10, () => {
			const goodsGain = this.stolenGoodsGain();
			addResource("stolenGoods", goodsGain);
			return goodsGain;
		});
        
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Pick Locks")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 7) shouldLevelUp = true;
				break;
				
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Pick Locks");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Pick Locks")){
						
			case 1: loseSquirrel = true;
				break;
					
			case 2: actionEffect = () => {
						towns[BEGINNERSVILLE].finishRegular(this.varName, 10, () => {
							const manaGain = this.stolenGoodsGain() * this.goldCost();
							addMana(manaGain);
							return 0;
						});
					};
					break;
							
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.TakeGlasses = new Action("Take Glasses", {
    type: "normal",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.glassesTaken;
        }
        return false;
    },
    stats: {
        Per: 0.7,
        Luck: 0.3
    },
    cost() {
        addResource("stolenGoods", -1);
    },
    manaCost() {
        return 100;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.stolenGoods >= 1;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Wander") >= 3 && getExploreProgress() < 100;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Wander") >= 20;
    },
    finish() {
		
		addResource("glasses", true);
		unlockStory("glassesTaken");
        
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Take Glasses")){
				
			case 0: shouldLevelUp = true;
				break;
									
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Take Glasses");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Take Glasses")){
						
			case 1: break;
												
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.FoundGlasses = new Action("Found Glasses", {
    type: "normal",
    expMult: 0,
    townNum: 0,
    stats: {
    },
    affectedBy: ["SurveyZ1"],
    allowed() {
        return 1;
    },
    canStart() {
        return false;
    },
    manaCost() {
        return 0;
    },
	canStart() {
        if(this.squirrelAction) return resources.squirrel;
		return true;
    },
    visible() {
        return getExploreProgress() >= 100;
    },
    unlocked() {
        return false;
    },
    finish() {
        addResource("glasses", true);
        unlockStory("glassesBought");
    }
});

Action.BuyManaZ1 = new Action("Buy Mana Z1", {
    type: "normal",
    expMult: 1,
    townNum: 0,
	storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.manaBoughtZ1;
        }
        return false;
    },
    stats: {
        Cha: 0.7,
        Int: 0.2,
        Luck: 0.1
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    manaCost() {
        return 200;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Wander") >= 3;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Wander") >= 20;
    },
    goldCost() {
        return Math.floor(100 * getSkillBonus("Mercantilism"));
    },
	stolenGoodsValue(){
		let base = 10;
        return 10 + (base * getSkillBonus("Thievery") - base);
	},
    finish() {
		
		addResource("gold", resources.stolenGoods * this.stolenGoodsValue());
		addMana(resources.gold * this.goldCost());
		resetResource("stolenGoods");
		resetResource("gold");
		unlockStory("manaBoughtZ1");
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Buy Mana Z1")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 8) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Trust") >= 15) shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Buy Mana Z1");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Buy Mana Z1")){
						
			case 1: actionEffect = () => {
						addResource("gold", resources.stolenGoods * this.stolenGoodsValue());
						addMana(resources.gold * this.goldCost());
						resetResource("stolenGoods");
						resetResource("gold");
						unlockStory("manaBoughtZ1");
					};
					break;
					
			case 2: actionEffect = () => {
						addResource("gold", resources.stolenGoods * this.stolenGoodsValue());
						addMana(resources.gold * this.goldCost());
						resetResource("stolenGoods");
						resetResource("gold");
						unlockStory("manaBoughtZ1");
						addMana(100);
					};
					loseSquirrel = true;		
				break;
			
			case 3: actionEffect = () => {
						addResource("gold", resources.stolenGoods * this.stolenGoodsValue());
						addMana(resources.gold * this.goldCost());
						resetResource("stolenGoods");
						resetResource("gold");
						unlockStory("manaBoughtZ1");
						addMana(1500);
					};
					loseSquirrel = true;
				break;
							
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.MeetPeople = new Action("Meet People", {
    type: "progress",
    expMult: 1,
    townNum: 0,
    varName: "Met",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 1;
            case 2:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 20;
            case 3:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 40;
            case 4:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 60;
            case 5:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 80;
            case 6:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Int: 0.1,
        Cha: 0.8,
        Soul: 0.1
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    manaCost() {
        return 1600;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Wander") >= 10;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Wander") >= 22;
    },
    finish() {
        
		towns[BEGINNERSVILLE].finishProgress(this.varName, 150);
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Meet People")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 6) shouldLevelUp = true;
				break;
									
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Meet People");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Meet People")){
						
			case 1: break;
					
			case 2: break;	
							
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});
function adjustSQuests() {
    let town = towns[BEGINNERSVILLE];
    let baseSQuests = town.getLevel("Met");
    town.totalSQuests = Math.floor(baseSQuests * getSkillMod("Spatiomancy", 200, 400, .5) + baseSQuests * getSurveyBonus(town) + (getLevelSquirrelAction("Throw Party") >= 2 ? 20 : 0));
}

Action.TrainStrength = new Action("Train Strength", {
    type: "normal",
    expMult: 4,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.strengthTrained;
            case 2:
                return getTalent("Str") >= 100;
            case 3:
                return getTalent("Str") >= 1000;
        }
        return false;
    },
    stats: {
        Str: 0.8,
        Con: 0.2
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    allowed() {
        return trainingLimits;
    },
    manaCost() {
        return 4000;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Met") >= 1;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Met") >= 5;
    },
    finish() {
		unlockStory("strengthTrained");
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Train Strength")){
				
				case 0: shouldLevelUp = true;
					break;					
			}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Train Strength");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Train Strength")){
						
				case 1: break;				
			}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.ShortQuest = new Action("Short Quest", {
    type: "limited",
    expMult: 1,
    townNum: 0,
    varName: "SQuests",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[BEGINNERSVILLE][`checked${this.varName}`] >= 1;
            case 2:
                // 20 small quests in a loop
                return storyReqs.maxSQuestsInALoop;
        }
        return false;
    },
    stats: {
        Str: 0.2,
        Dex: 0.1,
        Cha: 0.3,
        Spd: 0.2,
        Luck: 0.1,
        Soul: 0.1
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    manaCost() {
        return 1200;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Met") >= 1;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Met") >= 5;
    },
    goldCost() {
        return 20;
    },
    finish() {
        
		towns[BEGINNERSVILLE].finishRegular(this.varName, 5, () => {
			const goldGain = this.goldCost();
			addResource("gold", goldGain);
			return goldGain;
		});
		if (towns[BEGINNERSVILLE][`good${this.varName}`] >= 20 && towns[BEGINNERSVILLE][`goodTemp${this.varName}`] <= towns[BEGINNERSVILLE][`good${this.varName}`] - 20) unlockStory("maxSQuestsInALoop");
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Short Quest")){
				
			case 0: shouldLevelUp = true;
				break;		

			case 1: if(getSkillSquirrelLevel("Trust") >= 11) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Trust") >= 22) shouldLevelUp = true;
				break;
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Short Quest");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Short Quest")){
						
			case 1: break;		

			case 2: actionEffect = () => {
						towns[BEGINNERSVILLE].finishRegular(this.varName, 5, () => {
							const goldGain = this.goldCost();
							addResource("gold", goldGain);
							return goldGain;
						});
						if (towns[BEGINNERSVILLE][`good${this.varName}`] >= 20 && towns[BEGINNERSVILLE][`goodTemp${this.varName}`] <= towns[BEGINNERSVILLE][`good${this.varName}`] - 20) unlockStory("maxSQuestsInALoop");
					};
					break;
				
			case 3: actionEffect = () => {
						towns[BEGINNERSVILLE].finishRegular(this.varName, 5, () => {
							const goldGain = this.goldCost() * 1.1;
							addResource("gold", goldGain);
							return goldGain;
						});
						if (towns[BEGINNERSVILLE][`good${this.varName}`] >= 20 && towns[BEGINNERSVILLE][`goodTemp${this.varName}`] <= towns[BEGINNERSVILLE][`good${this.varName}`] - 20) unlockStory("maxSQuestsInALoop");
					};
					break;
		}
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.Investigate = new Action("Investigate", {
    type: "progress",
    expMult: 1,
    townNum: 0,
    varName: "Secrets",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 20;
            case 2:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 40;
            case 3:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 60;
            case 4:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 80;
            case 5:
                return towns[BEGINNERSVILLE].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Per: 0.3,
        Cha: 0.4,
        Spd: 0.2,
        Luck: 0.1
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Met") >= 5;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Met") >= 25;
    },
	stolenGoodsMultiplication() {
		const bonusMulti = ((getLevelSquirrelAction("Investigate") >= 2 && this.squirrelAction) ? 0.25 : 0.2);
		return 1 + resources.stolenGoods * bonusMulti;
	},
    finish() {
       
		towns[BEGINNERSVILLE].finishProgress(this.varName, 300 * this.stolenGoodsMultiplication());
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Investigate")){
				
			case 0: shouldLevelUp = true;
				break;		

			case 1: if(getSkillSquirrelLevel("Trust") >= 17) shouldLevelUp = true;
				

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Investigate");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Investigate")){
						
			case 1: break;		

			case 2: actionEffect = () => {
						towns[BEGINNERSVILLE].finishProgress(this.varName, 400 * this.stolenGoodsMultiplication());
					};
					break;
				
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});
function adjustLQuests() {
    let town = towns[BEGINNERSVILLE];
    let baseLQuests = town.getLevel("Secrets") / 2;
    town.totalLQuests = Math.floor(baseLQuests * getSkillMod("Spatiomancy", 300, 500, .5) + baseLQuests * getSurveyBonus(town) + + (getLevelSquirrelAction("Throw Party") >= 2 ? 10 : 0));
}

Action.LongQuest = new Action("Long Quest", {
    type: "limited",
    expMult: 1,
    townNum: 0,
    varName: "LQuests",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[BEGINNERSVILLE][`checked${this.varName}`] >= 1;
            case 2:
                // 10 long quests in a loop
                return storyReqs.maxLQuestsInALoop;
        }
        return false;
    },
    stats: {
        Str: 0.2,
        Int: 0.2,
        Con: 0.4,
        Spd: 0.2
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    manaCost() {
        return 3000;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Secrets") >= 1;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Secrets") >= 10;
    },
    goldCost() {
        return 30;
    },
    finish() {
		
		 towns[BEGINNERSVILLE].finishRegular(this.varName, 5, () => {
			addResource("reputation", 1);
			const goldGain = this.goldCost();
			addResource("gold", goldGain);
			return goldGain;
		});
		if (towns[BEGINNERSVILLE][`good${this.varName}`] >= 10 && towns[BEGINNERSVILLE][`goodTemp${this.varName}`] <= towns[BEGINNERSVILLE][`good${this.varName}`] - 10) unlockStory("maxLQuestsInALoop");
       
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Long Quest")){
			
			case 0: shouldLevelUp = true;
				break;		

			case 1: if(getSkillSquirrelLevel("Trust") >= 22) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Trust") >= 26) shouldLevelUp = true;
				break;

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Long Quest");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Long Quest")){
						
			case 1: break;		

			case 2:  actionEffect = () => {
						towns[BEGINNERSVILLE].finishRegular(this.varName, 5, () => {
							const goldGain = this.goldCost() * 1.1;
							addResource("gold", goldGain);
							return goldGain;
						});
						if (towns[BEGINNERSVILLE][`good${this.varName}`] >= 10 && towns[BEGINNERSVILLE][`goodTemp${this.varName}`] <= towns[BEGINNERSVILLE][`good${this.varName}`] - 10) unlockStory("maxLQuestsInALoop");
					};
					break;
				
			case 3: actionEffect = () => {
						towns[BEGINNERSVILLE].finishRegular(this.varName, 5, () => {
							addResource("reputation", 1);
							const goldGain = this.goldCost() * 1.2;
							addResource("gold", goldGain);
							return goldGain;
						});
						if (towns[BEGINNERSVILLE][`good${this.varName}`] >= 10 && towns[BEGINNERSVILLE][`goodTemp${this.varName}`] <= towns[BEGINNERSVILLE][`good${this.varName}`] - 10) unlockStory("maxLQuestsInALoop");
					};
					break;
				
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.ThrowParty = new Action("Throw Party", {
    type: "normal",
    expMult: 2,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.partyThrown;
        }
        return false;
    },
    stats: {
        Cha: 0.8,
        Soul: 0.2
    },
    manaCost() {
        return 3200;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.reputation >= 2;
    },
    cost() {
        addResource("reputation", -2);
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Secrets") >= 20;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Secrets") >= 30;
    },
    finish() {
		
		towns[BEGINNERSVILLE].finishProgress("Met", 2100);
		unlockStory("partyThrown");
        
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Throw Party")){
				
			case 0: shouldLevelUp = true;
				break;		

			case 1: if(getSkillSquirrelLevel("Trust") >= 27) shouldLevelUp = true;
				break;
				

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Throw Party");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Throw Party")){
						
			case 1: actionEffect = () => {
						towns[BEGINNERSVILLE].finishProgress("Met", 2700);
						unlockStory("partyThrown");
					};
					break;		

			case 2: actionEffect = () => {
						adjustSQuests();
						adjustLQuests();
						towns[BEGINNERSVILLE].finishProgress("Met", 2700);
						view.updateRegular("SQuests", BEGINNERSVILLE);
						view.updateRegular("LQuests", BEGINNERSVILLE);
					};
					break;
				
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.WarriorLessons = new Action("Warrior Lessons", {
    type: "normal",
    expMult: 1.5,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return getSkillLevel("Combat") >= 1;
            case 2:
                return getSkillLevel("Combat") >= 100;
            case 3:
                return getSkillLevel("Combat") >= 200;
            case 4:
                return getSkillLevel("Combat") >= 250;
        }
        return false;
    },
    stats: {
        Str: 0.5,
        Dex: 0.3,
        Con: 0.2
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.reputation >= 2;
    },
    skills: {
        Combat: 100
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Secrets") >= 10;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Secrets") >= 20;
    },
    finish() {
		
		handleSkillExp(this.skills);
        
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Warrior Lessons")){
				
			case 0: shouldLevelUp = true;
				break;		

			case 1: if(getSkillSquirrelLevel("Trust") >= 24) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Combat") >= 30) shouldLevelUp = true;
				break;

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Warrior Lessons");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Warrior Lessons")){
						
			case 1:  break;		

			case 2: actionEffect = () => {
						handleSkillExp(this.skills);
						handleSkillExp(this.skills);
						handleSkillExp(this.skills);
					};
					loseSquirrel = true;
					break;
				
			case 3: actionEffect = () => {
						for(let i = 0; i < 10; i++){
							handleSkillExp(this.skills);
						}
					};
					loseSquirrel = true;
					break;
				
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.MageLessons = new Action("Mage Lessons", {
    type: "normal",
    expMult: 1.5,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return getSkillLevel("Magic") >= 1;
            case 2:
                return getSkillLevel("Magic") >= 100;
            case 3:
                return getSkillLevel("Magic") >= 200;
            case 4:
                return getSkillLevel("Magic") >= 250;
            case 5:
                return getSkillLevel("Alchemy") >= 10;
            case 6:
                return getSkillLevel("Alchemy") >= 50;
            case 7:
                return getSkillLevel("Alchemy") >= 100;
        }
        return false;
    },
    stats: {
        Per: 0.3,
        Int: 0.5,
        Con: 0.2
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.reputation >= 2;
    },
    skills: {
        Magic: 100
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Secrets") >= 10;
    },
    unlocked() {
        return towns[BEGINNERSVILLE].getLevel("Secrets") >= 20;
    },
    finish() {
		handleSkillExp(this.skills);
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Mage Lessons")){
				
			case 0: shouldLevelUp = true;
				break;		

			case 1: if(getSkillSquirrelLevel("Trust") >= 24) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Magic") >= 30) shouldLevelUp = true;
				break;
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Mage Lessons");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Mage Lessons")){
						
			case 1:  break;		

			case 2: actionEffect = () => {
						handleSkillExp(this.skills);
						handleSkillExp(this.skills);
						handleSkillExp(this.skills);
					};
					loseSquirrel = true;
				break;
				
			case 3: actionEffect = () => {
						for(let i = 0; i < 10; i++){
							handleSkillExp(this.skills);
						}
					};
					loseSquirrel = true;
				break;
				
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.HealTheSick = new MultipartAction("Heal The Sick", {
    type: "multipart",
    expMult: 1,
    townNum: 0,
    varName: "Heal",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[BEGINNERSVILLE].totalHeal >= 1;
            case 2:
                // 10 patients healed in a loop
                return storyReqs.heal10PatientsInALoop;
            case 3:
                // fail reputation req
                return storyReqs.failedHeal;
        }
        return false;
    },
    stats: {
        Per: 0.2,
        Int: 0.2,
        Cha: 0.2,
        Soul: 0.4
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel) && alreadyHealed === false;
		return squirrelRequirements && resources.reputation >= 1;
    },
    skills: {
        Magic: 50
    },
    loopStats: ["Per", "Int", "Cha"],
    manaCost() {
        return 5000;
    },
    loopCost(segment) {
        return fibonacci(2 + Math.floor((towns[BEGINNERSVILLE].HealLoopCounter + segment) / this.segments + 0.0000001)) * 10000;
    },
    tickProgress(offset) {
		if(this.squirrelAction){
			let squirrelMult = 0;
			if(getLevelSquirrelAction("Heal The Sick") == 2){
				squirrelMult = 1;
			} else if (getLevelSquirrelAction("Heal The Sick") >= 3){
				squirrelMult = 2;
			}
			
			return squirrelMult * this.loopCost(offset) * 3 / this.manaCost();			
			
		}
        return getSkillLevel("Magic") * Math.max(getSkillLevel("Restoration") / 50, 1) * (1 + getLevel(this.loopStats[(towns[BEGINNERSVILLE].HealLoopCounter + offset) % this.loopStats.length]) / 100) * Math.sqrt(1 + towns[BEGINNERSVILLE].totalHeal / 100);
    },
    loopsFinished() {
        addResource("reputation", 3);
		handleSkillExp(this.skills);
		if(this.squirrelAction){
			handleSkillExp(this.skills);
			handleSkillExp(this.skills);
		}
    },
    getPartName() {
        return `${_txt(`actions>${getXMLName(this.name)}>label_part`)} ${numberToWords(Math.floor((towns[BEGINNERSVILLE].HealLoopCounter + 0.0001) / this.segments + 1))}`;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Secrets") >= 20;
    },
    unlocked() {
        return getSkillLevel("Magic") >= 12;
    },
    finish() {
		
		if (towns[BEGINNERSVILLE].HealLoopCounter / 3 + 1 >= 10) unlockStory("heal10PatientsInALoop");
        
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Heal The Sick")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Magic") >= 12) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Magic") >= 50) shouldLevelUp = true;
				break;

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Heal The Sick");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Heal The Sick")){
						
			case 1:  break;
			
			case 2: actionEffect = () => {
						alreadyHealed = true;
					};
					break;
			
			case 3: actionEffect = () => {
						alreadyHealed = true;
					};
					break;
					
		}
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.FightMonsters = new MultipartAction("Fight Monsters", {
    type: "multipart",
    expMult: 1,
    townNum: 0,
    varName: "Fight",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[BEGINNERSVILLE].totalFight >= 1;
            case 2:
                return towns[BEGINNERSVILLE].totalFight >= 100;
            case 3:
                return towns[BEGINNERSVILLE].totalFight >= 500;
            case 4:
                return towns[BEGINNERSVILLE].totalFight >= 1000;
            case 5:
                return towns[BEGINNERSVILLE].totalFight >= 5000;
            case 6:
                return towns[BEGINNERSVILLE].totalFight >= 10000;
            case 7:
                return towns[BEGINNERSVILLE].totalFight >= 20000;
        }
        return false;
    },
    stats: {
        Str: 0.3,
        Spd: 0.3,
        Con: 0.3,
        Luck: 0.1
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel) && alreadyFought === false;
		return squirrelRequirements && resources.reputation >= 2;
    },
    skills: {
        Combat: 50
    },
    loopStats: ["Spd", "Spd", "Spd", "Str", "Str", "Str", "Con", "Con", "Con"],
    manaCost() {
        return 4000;
    },
    loopCost(segment) {
        return fibonacci(Math.floor((towns[BEGINNERSVILLE].FightLoopCounter + segment) - towns[BEGINNERSVILLE].FightLoopCounter / 3 + 0.0000001)) * 20000;
    },
    tickProgress(offset) {
		
		if(this.squirrelAction){
			let squirrelMult = 0;
			if(getLevelSquirrelAction("Fight Monsters") == 2){
				squirrelMult = 1;
			} else if (getLevelSquirrelAction("Fight Monsters") >= 3){
				squirrelMult = 2;
			}
			
			return squirrelMult * this.loopCost(offset) * 3 / this.manaCost();			
			
		}
		
        return getSelfCombat() * (1 + getLevel(this.loopStats[(towns[BEGINNERSVILLE].FightLoopCounter + offset) % this.loopStats.length]) / 100) * Math.sqrt(1 + towns[BEGINNERSVILLE].totalFight / 100);
    },
    loopsFinished() {
        // empty
    },
    segmentFinished() {
        addResource("gold", 20);
		handleSkillExp(this.skills);
    },
    getPartName() {
        const monster = Math.floor(towns[BEGINNERSVILLE].FightLoopCounter / 3 + 0.0000001);
        if (monster >= this.segmentNames.length) return this.altSegmentNames[monster % 3];
        return this.segmentNames[monster];
    },
    getSegmentName(segment) {
        return `${this.segmentModifiers[segment % 3]} ${this.getPartName()}`;
    },
    visible() {
        return towns[BEGINNERSVILLE].getLevel("Secrets") >= 20;
    },
    unlocked() {
        return getSkillLevel("Combat") >= 10;
    },
    finish() {
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Fight Monsters")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Combat") >= 10) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Combat") >= 50) shouldLevelUp = true;
				break;

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Fight Monsters");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Fight Monsters")){
						
			case 1: loseSquirrel = true;
				break;
				
			case 2: actionEffect = () => {
						alreadyFought = true;
					};
					break;
			
			case 3: actionEffect = () => {
						alreadyFought = true;
					};
					break;
				
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});
// lazily loaded to allow localization code to load first
defineLazyGetter(Action.FightMonsters, "altSegmentNames",
    () => Array.from(_txtsObj("actions>fight_monsters>segment_alt_names>name")).map(elt => elt.textContent)
);
defineLazyGetter(Action.FightMonsters, "segmentModifiers",
    () => Array.from(_txtsObj("actions>fight_monsters>segment_modifiers>segment_modifier")).map(elt => elt.textContent)
);

Action.MagicFighter = new MultipartAction("Magic Fighter", {
    type: "multipart",
    expMult: 5,
    townNum: 0,
    varName: "MagFgt",
	storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.foughtMagicFighter;
        }
        return false;
    },
    stats: {
		Dex: 0.1,
        Str: 0.1,
        Con: 0.1,
		Spd: 0.1,
		Per: 0.1,
		Cha: 0.1,
		Int: 0.1,
        Luck: 0.1,
		Soul: 0.2,
    },
	skills: {
        Combat: 50,
		Magic: 50
    },
	allowed() {
        return 1;
    },
    loopStats: ["Soul", "Int", "Per", "Dex", "Con", "Spd", "Cha", "Luck", "Str"],
    manaCost() {
        return 6000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		const curPowerLevel = Math.floor((towns[BEGINNERSVILLE].MagFgtLoopCounter) / 9 + 0.0000001);
		
		return squirrelRequirements && resources.reputation >= 2 && curPowerLevel < 4;
    },
    loopCost(segment) {
        return precision3((Math.floor(Math.pow(4, towns[BEGINNERSVILLE].MagFgtLoopCounter/this.segments)+ 0.0000001)) * 200000);
		
    },
    tickProgress(offset) {
		if(this.squirrelAction) return 0;
        return (getSelfCombat() + getSkillLevel("Magic")) * Math.sqrt(1 + towns[BEGINNERSVILLE].totalMagFgt / 100) * (1 + getLevel(this.loopStats[(towns[BEGINNERSVILLE].MagFgtLoopCounter + offset) % this.loopStats.length]) / 100) ; 
		
    },
    loopsFinished() {
		handleSkillExp(this.skills);
    },
    segmentFinished() {
		handleSkillExp(this.skills);
    },
    getPartName() {
		const powerLevel = Math.floor((towns[BEGINNERSVILLE].MagFgtLoopCounter) / 9 + 0.0000001);
		return `${_txt(`actions>${getXMLName(this.name)}>part_names>name_`+`${powerLevel+1}`)}`;

    },
	getSegmentName(segment) {
		return this.segmentNames[segment%9];
	},
    visible() {
        return (getSkillLevel("Combat") + getSkillLevel("Magic")) >= 10;
    },
    unlocked() {
        return (getSkillLevel("Combat") + getSkillLevel("Magic")) >= 25;
    },
    finish() {
		unlockStory("foughtMagicFighter");
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Magic Fighter")){
				
			case 0: shouldLevelUp = true;
				break;		

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Magic Fighter");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Magic Fighter")){
					
			case 1: break;
				
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.SmallDungeon = new DungeonAction("Small Dungeon", 0, {
    type: "multipart",
    expMult: 1,
    townNum: 0,
    varName: "SDungeon",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.smallDungeonAttempted;
            case 2:
                return towns[BEGINNERSVILLE][`total${this.varName}`] >= 1000;
            case 3:
                return towns[BEGINNERSVILLE][`total${this.varName}`] >= 5000;
            case 4:
                return towns[BEGINNERSVILLE][`total${this.varName}`] >= 10000;
            case 5:
                return storyReqs.clearSDungeon;
        }
        return false;
    },
    stats: {
        Str: 0.1,
        Dex: 0.4,
        Con: 0.3,
        Cha: 0.1,
        Luck: 0.1
    },
    skills: {
        Combat: 100,
        Magic: 100
    },
    loopStats: ["Dex", "Con", "Dex", "Cha", "Dex", "Str", "Luck"],
    manaCost() {
        return 4000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || (resources.squirrel && alreadySDungeon === false));
		const curFloor = Math.floor((towns[this.townNum].SDungeonLoopCounter) / this.segments + 0.0000001);
		
		return squirrelRequirements && resources.reputation >= 2 && curFloor < dungeons[this.dungeonNum].length;
    },
    loopCost(segment) {
        return precision3(Math.pow(2.5, Math.floor((towns[this.townNum].SDungeonLoopCounter + segment) / this.segments + 0.0000001)) * 30000);
    },
    tickProgress(offset) {
		
		if(this.squirrelAction){
			let squirrelMult = 0;
			if(getLevelSquirrelAction("Small Dungeon") == 2){
				squirrelMult = 0.5;
			} else if (getLevelSquirrelAction("Small Dungeon") >= 3){
				squirrelMult = 1;
			}
			
			return squirrelMult * this.loopCost(offset) * 7 / this.manaCost();			
			
		}
		
        const floor = Math.floor((towns[this.townNum].SDungeonLoopCounter) / this.segments + 0.0000001);
        return (getSelfCombat() + getSkillLevel("Magic")) *
            (1 + getLevel(this.loopStats[(towns[this.townNum].SDungeonLoopCounter + offset) % this.loopStats.length]) / 100) *
            Math.sqrt(1 + dungeons[this.dungeonNum][floor].completed / 200);
    },
    loopsFinished() {
        const curFloor = Math.floor((towns[this.townNum].SDungeonLoopCounter) / this.segments + 0.0000001 - 1);
        const success = finishDungeon(this.dungeonNum, curFloor);
        if (success === true && storyMax <= 1) {
            unlockGlobalStory(1);
        } else if (success === false && storyMax <= 2) {
            unlockGlobalStory(2);
        }
		handleSkillExp(this.skills);
    },
    visible() {
        return (getSkillLevel("Combat") + getSkillLevel("Magic")) >= 15;
    },
    unlocked() {
        return (getSkillLevel("Combat") + getSkillLevel("Magic")) >= 35;
    },
    finish() {
        
		unlockStory("smallDungeonAttempted");
		if (towns[BEGINNERSVILLE].SDungeonLoopCounter >= 42) unlockStory("clearSDungeon");
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Small Dungeon")){
				
			case 0: shouldLevelUp = true;
				break;

			case 1: if((getSkillSquirrelLevel("Combat") + getSkillSquirrelLevel("Magic")) >= 35) shouldLevelUp = true;
				break;
				
			case 2: if((getSkillSquirrelLevel("Combat") + getSkillSquirrelLevel("Magic")) >= 100) shouldLevelUp = true;
				break;

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Small Dungeon");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Small Dungeon")){
						
			case 1: break;
			
			case 2: actionEffect = () => {
						alreadySDungeon = true;
						unlockStory("smallDungeonAttempted");
						if (towns[BEGINNERSVILLE].SDungeonLoopCounter >= 42) unlockStory("clearSDungeon");
					};
					break;
			
			case 3: actionEffect = () => {
						alreadySDungeon = true;
						unlockStory("smallDungeonAttempted");
						if (towns[BEGINNERSVILLE].SDungeonLoopCounter >= 42) unlockStory("clearSDungeon");
					};
					break;
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});
function finishDungeon(dungeonNum, floorNum) {
    const floor = dungeons[dungeonNum][floorNum];
    if (!floor) {
        return false;
    }
    floor.completed++;
    const rand = Math.random();
    if (rand <= floor.ssChance) {
        const statToAdd = statList[Math.floor(Math.random() * statList.length)];
        floor.lastStat = statToAdd;
        stats[statToAdd].soulstone = stats[statToAdd].soulstone ? (stats[statToAdd].soulstone + Math.floor(Math.pow(10, dungeonNum) * getSkillBonus("Divine"))) : 1;
        floor.ssChance *= 0.98;
        view.updateSoulstones();
        return true;
    }
    return false;
}

Action.BuySupplies = new Action("Buy Supplies", {
    type: "normal",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.suppliesBought;
            case 2:
                return storyReqs.suppliesBoughtWithoutHaggling;
        }
        return false;
    },
    stats: {
        Cha: 0.8,
        Luck: 0.1,
        Soul: 0.1
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 400;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.gold >= towns[BEGINNERSVILLE].suppliesCost;
    },
    cost() {
        addResource("gold", -towns[BEGINNERSVILLE].suppliesCost);
    },
	goldCost() {
		if(towns[BEGINNERSVILLE].suppliesCost === undefined) return 450;
        return towns[BEGINNERSVILLE].suppliesCost;
    },
    visible() {
        return (getSkillLevel("Combat") + getSkillLevel("Magic")) >= 15;
    },
    unlocked() {
        return (getSkillLevel("Combat") + getSkillLevel("Magic")) >= 35;
    },
    finish() {
        
		addResource("supplies", true);
		if (towns[BEGINNERSVILLE].suppliesCost === 450) unlockStory("suppliesBoughtWithoutHaggling");
		unlockStory("suppliesBought");
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Buy Supplies")){
				
			case 0: shouldLevelUp = true;
				break;		

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Buy Supplies");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Buy Supplies")){
						
			case 1: actionEffect = () => {
						addResource("gold", towns[BEGINNERSVILLE].suppliesCost);
					};
					nothingHappens = true;
					break;
				
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.Haggle = new Action("Haggle", {
    type: "normal",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.haggle;
            case 2:
                return storyReqs.haggle15TimesInALoop;
            case 3:
                return storyReqs.haggle16TimesInALoop;
        }
        return false;
    },
    stats: {
        Cha: 0.8,
        Luck: 0.1,
        Soul: 0.1
    },
    manaCost() {
        return 200;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.reputation >= 1; 
    },
    cost() {
        addResource("reputation", -1);
    },
    visible() {
        return (getSkillLevel("Combat") + getSkillLevel("Magic")) >= 15;
    },
    unlocked() {
        return (getSkillLevel("Combat") + getSkillLevel("Magic")) >= 35;
    },
    finish() {
		
		if (towns[BEGINNERSVILLE].suppliesCost === 30) unlockStory("haggle15TimesInALoop");
		else if (towns[BEGINNERSVILLE].suppliesCost === 0) unlockStory("haggle16TimesInALoop");
		towns[BEGINNERSVILLE].suppliesCost -= 30;
		if (towns[BEGINNERSVILLE].suppliesCost < 0) {
			towns[BEGINNERSVILLE].suppliesCost = 0;
		}
		view.adjustGoldCost("BuySupplies", towns[BEGINNERSVILLE].suppliesCost);
		unlockStory("haggle");
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Haggle")){
				
			case 0: shouldLevelUp = true;
				break;	
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 30) shouldLevelUp = true;
				break;	

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Haggle");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Haggle")){
						
			case 1: break;
			
			case 2: actionEffect = () => {
						towns[BEGINNERSVILLE].suppliesCost -= 30;
						if (towns[BEGINNERSVILLE].suppliesCost < 0) {
							towns[BEGINNERSVILLE].suppliesCost = 0;
						}
						view.adjustGoldCost("BuySupplies", towns[BEGINNERSVILLE].suppliesCost);
						squirrelHaggle = true;
						addResource("reputation", 1);
					};
					break;
				
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.StartJourney = new Action("Start Journey", {
    type: "normal",
    expMult: 2,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return townsUnlocked.includes(1);
        }
        return false;
    },
    stats: {
        Con: 0.4,
        Per: 0.3,
        Spd: 0.3
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 2000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.supplies;
    },
    cost() {
        addResource("supplies", false);
    },
    visible() {
        return (getSkillLevel("Combat") + getSkillLevel("Magic")) >= 15;
    },
    unlocked() {
        return (getSkillLevel("Combat") + getSkillLevel("Magic")) >= 35;
    },
    finish() {
		unlockTown(FORESTPATH);
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Start Journey")){
				
			case 0: shouldLevelUp = true;
				break;	
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 28) shouldLevelUp = true;
				break;	

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Start Journey");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Start Journey")){
						
				case 1: break;
				
				case 2: actionEffect = () => {
							unlockTown(SANCTUARY);
						};
						break;
					
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.HitchRide = new Action("Hitch Ride", {
    type: "normal",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return townsUnlocked.includes(1);
        }
        return false;
    },
    stats: {
        Cha: 1,
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 1;
    },
    canStart() {
        return true;
    },
    visible() {
        return getExploreProgress() >= 25;
    },
    unlocked() {
        return getExploreProgress() >= 25;
    },
    finish() {
        unlockTown(2);
    },
});

Action.OpenRift = new Action("Open Rift", {
    type: "normal",
    expMult: 1,
    townNum: 0,
    stats: {
        Int: 0.2,
        Luck: 0.1,
        Soul: 0.7
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 100000;
    },
    visible() {
        return towns[STARTINGTOWN].getLevel("Meander") >= 1;
    },
    unlocked() {
        return getSkillLevel("Spatiomancy") >= 100;
    },
    finish() {
        handleSkillExp(this.skills);
        addResource("supplies", false);
        unlockTown(5);
    },
});

//====================================================================================================
//Zone 2 - Forest Path
//====================================================================================================
Action.ExploreForest = new Action("Explore Forest", {
    type: "progress",
    expMult: 1,
    townNum: 1,
    varName: "Forest",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[FORESTPATH].getLevel(this.varName) >= 1;
            case 2:
                return towns[FORESTPATH].getLevel(this.varName) >= 10;
            case 3:
                return towns[FORESTPATH].getLevel(this.varName) >= 20;
            case 4:
                return towns[FORESTPATH].getLevel(this.varName) >= 40;
            case 5:
                return towns[FORESTPATH].getLevel(this.varName) >= 50;
            case 6:
                return towns[FORESTPATH].getLevel(this.varName) >= 60;
            case 7:
                return towns[FORESTPATH].getLevel(this.varName) >= 80;
            case 8:
                return towns[FORESTPATH].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Per: 0.4,
        Con: 0.2,
        Spd: 0.2,
        Luck: 0.2
    },
    affectedBy: ["Take Glasses"],
    manaCost() {
        return 800;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
		
		towns[FORESTPATH].finishProgress(this.varName, 100 * (resources.glasses ? 4 : 1));
        
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Explore Forest")){
				
			case 0: shouldLevelUp = true;
				break;	
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 32) shouldLevelUp = true;
				break;	
				
			case 2: if(getSkillSquirrelLevel("Trust") >= 36) shouldLevelUp = true;
				break;

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Explore Forest");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Explore Forest")){
						
			case 1: loseSquirrel = true;
				break;
			
			case 2: actionEffect = () => {
						adjustHerbs();
						view.updateRegular("Herbs", FORESTPATH);
					};
					nothingHappens = true;
					break;
			
			case 3: actionEffect = () => {
						adjustWildMana();
						view.updateRegular("WildMana", FORESTPATH);
					};
					nothingHappens = true;
					break;
				
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});
function adjustWildMana() {
    let town = towns[FORESTPATH];
    let baseWildMana = town.getLevel("Forest") * 5 + town.getLevel("Feed") * 5 + (getLevelSquirrelAction("Explore Forest") >= 3 ? 100 : 0) + (getLevelSquirrelAction("Feed Animals") >= 2 ? 100 : 0);
    town.totalWildMana = Math.floor(baseWildMana + 0.001);
}
function adjustHunt() {
    let town = towns[FORESTPATH];
    let baseHunt = town.getLevel("Forest") * 1 + town.getLevel("Feed") * 1;
    town.totalHunt = baseHunt;
}
function adjustHerbs() {
    let town = towns[FORESTPATH];
    let baseHerbs = town.getLevel("Forest") * 5 + town.getLevel("Shortcut") * 3 + town.getLevel("Feed") * 9 + town.getLevel("DarkForest") * 3 + (getLevelSquirrelAction("Explore Forest") >= 2 ? 200 : 0) + (getLevelSquirrelAction("Feed Animals") >= 3 ? 200 : 0);
    town.totalHerbs = Math.floor(baseHerbs + 0.001);
}

Action.WildMana = new Action("Wild Mana", {
    type: "limited",
    expMult: 1,
    townNum: 1,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[FORESTPATH][`checked${this.varName}`] >= 1;
        }
        return false;
    },
    stats: {
        Con: 0.2,
        Int: 0.6,
        Soul: 0.2
    },
    manaCost(squirrelTooltip) {
		const squirrelMult = (((this.squirrelAction || squirrelTooltip) && getLevelSquirrelAction("Wild Mana") >= 3) ? 0.85 : 1);
        return 300 * squirrelMult;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return true;
    },
    unlocked() {
		return true;
    },
    goldCost() {
        return 500;
    },
    finish() {
		
		towns[FORESTPATH].finishRegular(this.varName, 10, () => {
			const manaGain = this.goldCost();
			addMana(manaGain);
			return manaGain;
		});
		

    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Wild Mana")){
				
			case 0: shouldLevelUp = true;
				break;	
				
			case 1: if(getSkillSquirrelLevel("Magic") >= 15) shouldLevelUp = true;
				break;	
				
			case 2: if(getSkillSquirrelLevel("Combat") >= 25) shouldLevelUp = true;
				break;

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Wild Mana");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Wild Mana")){
						
			case 1: actionEffect = () => {
						towns[FORESTPATH].finishRegular(this.varName, 10, () => {
							const manaGain = this.goldCost();
							addMana(manaGain);
							return manaGain;
						});
					};
					break;
				
			case 2: actionEffect = () => {
						towns[FORESTPATH].finishRegular(this.varName, 10, () => {
							const manaGain = this.goldCost()+100;
							addMana(manaGain);
							return manaGain;
						});
					};
					break;
			
			case 3: actionEffect = () => {
						towns[FORESTPATH].finishRegular(this.varName, 10, () => {
							const manaGain = this.goldCost()+100;
							addMana(manaGain);
							return manaGain;
						});
						view.adjustManaCost("Wild Mana", squirrelMode);
					};
					break;
					
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.GatherHerbs = new Action("Gather Herbs", {
    type: "limited",
    expMult: 1,
    townNum: 1,
    varName: "Herbs",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[FORESTPATH][`checked${this.varName}`] >= 1;
        }
        return false;
    },
    stats: {
        Str: 0.4,
        Dex: 0.3,
        Int: 0.3
    },
    manaCost() {
        return Math.ceil(400 * (1 - towns[FORESTPATH].getLevel("Hermit") * 0.005));
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return towns[FORESTPATH].getLevel("Forest") >= 2;
    },
    unlocked() {
        return towns[FORESTPATH].getLevel("Forest") >= 10;
    },
    finish() {
		
		 towns[FORESTPATH].finishRegular(this.varName, 10, () => {
			addResource("herbs", 1);
			return 1;
		});
       
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Gather Herbs")){
				
			case 0: shouldLevelUp = true;
				break;	
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 34) shouldLevelUp = true;
				break;	
				
			case 2: if(getSkillSquirrelLevel("Magic") >= 35) shouldLevelUp = true;
				break;

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Gather Herbs");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Gather Herbs")){
						
			case 1:	break;
				
			case 2: actionEffect = () => {
						towns[FORESTPATH].finishRegular(this.varName, 10, () => {
							const manaGain = 200;
							addMana(manaGain);
							return manaGain;
						});
					};
					break;
			
			case 3: actionEffect = () => {
						towns[FORESTPATH].finishRegular(this.varName, 10, () => {
							const manaGain = 250;
							addMana(manaGain);
							return manaGain;
						});
					};
					break;
					
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.Hunt = new Action("Hunt", {
    type: "limited",
    expMult: 1,
    townNum: 1,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[FORESTPATH][`checked${this.varName}`] >= 1;
            case 2:
                return towns[FORESTPATH][`good${this.varName}`] >= 10;
            case 3:
                return towns[FORESTPATH][`good${this.varName}`] >= 20;
        }
        return false;
    },
    stats: {
        Dex: 0.2,
        Con: 0.2,
        Per: 0.2,
        Spd: 0.4
    },
    manaCost(squirrelTooltip) {
		const squirrelMult = (((this.squirrelAction || squirrelTooltip) && getLevelSquirrelAction("Hunt") >= 2) ? 0.8 : 1);
        return 1600 * squirrelMult;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return towns[FORESTPATH].getLevel("Feed") >= 20;
    },
    unlocked() {
        return towns[FORESTPATH].getLevel("Feed") >= 40;
    },
    finish() {
		
		towns[FORESTPATH].finishRegular(this.varName, 10, () => {
			addResource("hide", 1);
			return 1;
		});
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Hunt")){
				
			case 0: shouldLevelUp = true;
				break;	
				
			case 1: if(getSkillSquirrelLevel("Combat") >= 50) shouldLevelUp = true;
				break;	
				

		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Hunt");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Hunt")){
						
			case 1:	loseSquirrel = true;
					break;
				
			case 2: actionEffect = () => {
						towns[FORESTPATH].finishRegular(this.varName, 10, () => {
							addResource("hide", 1);
							return 1;
						});
						view.adjustManaCost("Hunt", squirrelMode);
					};
					break;
					
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.SitByWaterfall = new Action("Sit By Waterfall", {
    type: "normal",
    expMult: 4,
    townNum: 1,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.satByWaterfall;
        }
        return false;
    },
    stats: {
        Con: 0.2,
        Soul: 0.8
    },
    allowed() {
        return trainingLimits;
    },
    manaCost() {
        return 4000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
		return towns[FORESTPATH].getLevel("Forest") >= 30;
    },
    unlocked() {
        return towns[FORESTPATH].getLevel("Forest") >= 70;
    },
    finish() {
		
		unlockStory("satByWaterfall");
     
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Sit By Waterfall")){
			
			case 0: shouldLevelUp = true;
				break;	
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Sit By Waterfall");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Sit By Waterfall")){
						
			case 1:	loseSquirrel = true;
					break;								
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.OldShortcut = new Action("Old Shortcut", {
    type: "progress",
    expMult: 1,
    townNum: 1,
    varName: "Shortcut",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[FORESTPATH].getLevel(this.varName) >= 1;
            case 2:
                return towns[FORESTPATH].getLevel(this.varName) >= 10;
            case 3:
                return towns[FORESTPATH].getLevel(this.varName) >= 20;
            case 4:
                return towns[FORESTPATH].getLevel(this.varName) >= 40;
            case 5:
                return towns[FORESTPATH].getLevel(this.varName) >= 60;
            case 6:
                return towns[FORESTPATH].getLevel(this.varName) >= 80;
            case 7:
                return towns[FORESTPATH].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Per: 0.3,
        Con: 0.4,
        Spd: 0.2,
        Luck: 0.1
    },
    manaCost() {
        return 1600;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return true;
    },
    unlocked() {
        return towns[FORESTPATH].getLevel("Forest") >= 20;
    },
    finish() {
		
		towns[FORESTPATH].finishProgress(this.varName, 100 * (1 + towns[FORESTPATH].getLevel("Hermit") / 33.3333333));
		view.adjustManaCost("Continue On");
		view.adjustManaCost("Talk To Hermit");
        
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Old Shortcut")){
				
			case 0: shouldLevelUp = true;
				break;

			case 1: if(getSkillSquirrelLevel("Magic") >= 5) shouldLevelUp = true;
				break;
			
			case 2: if(getSkillSquirrelLevel("Magic") >= 25) shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Old Shortcut");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Old Shortcut")){
						
			case 1:	loseSquirrel = true;
					break;

			case 2:	actionEffect = () => {
						towns[FORESTPATH].finishProgress(this.varName, 100 * (1 + towns[FORESTPATH].getLevel("Hermit") / 25));
						view.adjustManaCost("Continue On");
						view.adjustManaCost("Talk To Hermit");
					};
					break;
					
			case 3:	actionEffect = () => {
						towns[FORESTPATH].finishProgress(this.varName, 100 * (1 + towns[FORESTPATH].getLevel("Hermit") / 20));
						view.adjustManaCost("Continue On");
						view.adjustManaCost("Talk To Hermit");
					};
					break;
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.TalkToHermit = new Action("Talk To Hermit", {
    type: "progress",
    expMult: 1,
    townNum: 1,
    varName: "Hermit",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[FORESTPATH].getLevel(this.varName) >= 1;
            case 2:
                return towns[FORESTPATH].getLevel(this.varName) >= 10;
            case 3:
                return towns[FORESTPATH].getLevel(this.varName) >= 20;
            case 4:
                return towns[FORESTPATH].getLevel(this.varName) >= 40;
            case 5:
                return towns[FORESTPATH].getLevel(this.varName) >= 60;
            case 6:
                return towns[FORESTPATH].getLevel(this.varName) >= 80;
            case 7:
                return towns[FORESTPATH].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Con: 0.5,
        Cha: 0.3,
        Soul: 0.2
    },
    manaCost() {
        return 2400;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return true;
    },
    unlocked() {
        return towns[FORESTPATH].getLevel("Shortcut") >= 20 && getSkillLevel("Magic") >= 40;
    },
    finish() {
		
		towns[FORESTPATH].finishProgress(this.varName, 50 * (1 + towns[FORESTPATH].getLevel("Shortcut") / 33.3333333));
		view.adjustManaCost("Old Shortcut");
		view.adjustManaCost("Practice Yang");
		view.adjustManaCost("Learn Alchemy");
		view.adjustManaCost("Gather Herbs");
        
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Talk To Hermit")){
				
			case 0: shouldLevelUp = true;
				break;

			case 1: if(getSkillSquirrelLevel("Combat") >= 8) shouldLevelUp = true;
				break;
			
			case 2: if(getSkillSquirrelLevel("Combat") >= 30) shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Talk To Hermit");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Talk To Hermit")){
						
			case 1:	loseSquirrel = true;
					break;

			case 2:	actionEffect = () => {
						towns[FORESTPATH].finishProgress(this.varName, 50 * (1 + towns[FORESTPATH].getLevel("Shortcut") / 25));
						view.adjustManaCost("Old Shortcut");
						view.adjustManaCost("Practice Yang");
						view.adjustManaCost("Learn Alchemy");
						view.adjustManaCost("Gather Herbs");
					};
					break;
					
			case 3:	actionEffect = () => {
						towns[FORESTPATH].finishProgress(this.varName, 50 * (1 + towns[FORESTPATH].getLevel("Shortcut") / 20));
						view.adjustManaCost("Old Shortcut");
						view.adjustManaCost("Practice Yang");
						view.adjustManaCost("Learn Alchemy");
						view.adjustManaCost("Gather Herbs");
					};
					break;
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.PracticeYang = new Action("Practice Yang", {
    type: "normal",
    expMult: 1.5,
    townNum: 1,
	storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return 1;
        }
        return false;
    },
    stats: {
        Int: 0.6,
		Soul: 0.3,
		Per: 0.1
    },
	skills: {
        Yang() {
			const additionalExp = (resources.reputation >= 0 ? resources.reputation * 25 : 0);
            return 100 + additionalExp;
        }
    },
    manaCost() {
        return Math.ceil(8000 * (1 - towns[FORESTPATH].getLevel("Hermit") * 0.005));
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return towns[FORESTPATH].getLevel("Hermit") >= 1;
    },
    unlocked() {
        return towns[FORESTPATH].getLevel("Hermit") >= 20 && getSkillLevel("Magic") >= 50;
    },
    finish() {
		
		handleSkillExp(this.skills);
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Practice Yang")){
				
			case 0: shouldLevelUp = true;
				break;

			case 1: if(getSkillSquirrelLevel("Trust") >= 38) shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Practice Yang");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Practice Yang")){
						
			case 1:	break;

			case 2:	actionEffect = () => {
						addResource("reputation", 4);
					};
					loseSquirrel = true;
					break;

		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.LearnAlchemy = new Action("Learn Alchemy", {
    type: "normal",
    expMult: 1.5,
    townNum: 1,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return skills.Alchemy.exp >= 50;
            case 2:
                return getSkillLevel("Alchemy") >= 25;
            case 3:
                return getSkillLevel("Alchemy") >= 50;
        }
        return false;
    },
    stats: {
        Con: 0.3,
        Per: 0.1,
        Int: 0.6
    },
    skills: {
        Alchemy() {
			let brewingLevel = getSkillLevel("Brewing");
			let brewingMultiplier = 0;
			
			for(let levelsNeededForBoost = 1; brewingLevel > 0; levelsNeededForBoost++) {
				for (let i = 0; i < 10 && brewingLevel > 0; i++){
				
					brewingMultiplier += 1;
					brewingLevel -= levelsNeededForBoost;
				
				}
			}
			
			return 100 + brewingMultiplier * 10;
		}
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.herbs >= 10;
    },
    cost() {
        addResource("herbs", -10);
    },
    manaCost() {
        return Math.ceil(9600 * (1 - towns[FORESTPATH].getLevel("Hermit") * 0.005));
    },
    visible() {
        return towns[FORESTPATH].getLevel("Hermit") >= 15;
    },
    unlocked() {
        return towns[FORESTPATH].getLevel("Hermit") >= 40 && getSkillLevel("Magic") >= 60;
    },
    finish() {
		
		handleSkillExp(this.skills);
		view.adjustExpGain(Action.LearnBrewing);
		view.adjustExpGain(Action.ConcoctPotions);
    
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Learn Alchemy")){
				
			case 0: shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Learn Alchemy");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Learn Alchemy")){
						
			case 1:	break;

		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.DistillPotions = new MultipartAction("Distill Potions", {
    type: "multipart",
    expMult: 1.5,
    townNum: 1,
	varName: "Distill",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.potionBrewed;
            case 2:
                return storyReqs.failedBrewPotions;
            case 3:
                return storyReqs.failedBrewPotionsNegativeRep;
        }
        return false;
    },
    stats: {
        Dex: 0.3,
        Int: 0.6,
        Luck: 0.1,
    },
	skills: {
        Alchemy() {
			let brewingLevel = getSkillLevel("Brewing");
			let brewingMultiplier = 0;
			
			for(let levelsNeededForBoost = 1; brewingLevel > 0; levelsNeededForBoost++) {
				for (let i = 0; i < 10 && brewingLevel > 0; i++){
				
					brewingMultiplier += 1;
					brewingLevel -= levelsNeededForBoost;
				
				}
			}
			
			return 100 + brewingMultiplier * 10;
		}
    },
	loopStats: ["Int", "Dex", "Luck"],
    manaCost() {
        return 8000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.herbs >= 10 && resources.reputation >= 10;
    },
    loopCost(segment) {
		const numberLoops = towns[FORESTPATH].DistillLoopCounter / 3;
        return Math.floor(Math.pow(1.4, numberLoops)+ 0.0000001) * 40000;
    },
    tickProgress(offset) {
		if(this.squirrelAction) return 0;
        return (getSkillLevel("Alchemy") + getSkillLevel("Brewing")/2) * (1 + getLevel(this.loopStats[(towns[FORESTPATH].DistillLoopCounter + offset) % this.loopStats.length]) / 100) * Math.sqrt(1 + towns[FORESTPATH].totalDistill / 100);
    },
    loopsFinished() {
		addResource("herbs", -10);
        addResource("potions", 1);
		handleSkillExp(this.skills);
		view.adjustExpGain(Action.LearnBrewing);
		view.adjustExpGain(Action.ConcoctPotions);
    },
    getPartName() {
        return `${_txt(`actions>${getXMLName(this.name)}>label_part`)} ${numberToWords(Math.floor((towns[FORESTPATH].DistillLoopCounter + 0.0001) / this.segments + 1))}`;
    }, 
    visible() {
        return getSkillLevel("Alchemy") >= 1;
    },
    unlocked() {
        return getSkillLevel("Alchemy") >= 10;
    },
    finish() {
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Distill Potions")){
				
				case 0: shouldLevelUp = true;
					break;
									
			}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Distill Potions");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Distill Potions")){
						
			case 1:	break;

		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.TrainSquirrel = new Action("Train Squirrel", {
    type: "normal",
    expMult: 1,
    townNum: 1,
	varName: "TrainSquirrel",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return 1;
        }
        return false;
    },
    stats: {
        Str: 0.5,
        Dex: 0.2,
        Con: 0.3
    },
    skillsSquirrel: {
        Combat() {
			return getSelfCombat() * 4;
		}
    },
    manaCost() {
        return 2500;
    },
	canStart() {
		return resources.squirrel;
    },
    visible() {
        return towns[FORESTPATH].getLevel("Forest") >= 10;
    },
    unlocked() {
        return towns[FORESTPATH].getLevel("Forest") >= 30;
    },
	goldCost() {
        return getSelfCombat() * 4;
    },
    finish() {
		
		handleSkillSquirrelExp(this.skillsSquirrel);
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Train Squirrel")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Combat") >= 5) shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Train Squirrel");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Train Squirrel")){
						
			case 1:	loseSquirrel = true;
				break;
			
			case 2: actionEffect = () => {
						handleSkillSquirrelExp({Combat() {return getSkillSquirrelLevel("Combat") * 10;}});
					};
					loseSquirrel = true;
				break;
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.FeedAnimals = new Action("Feed Animals", {
    type: "progress",
    expMult: 1,
    townNum: 1,
	varName: "Feed",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return 1;
        }
        return false;
    },
    stats: {
        Cha: 0.4,
		Luck: 0.2,
		Con: 0.1,
		Soul: 0.1
    },	
    manaCost() {
        return 1000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.herbs >= 10;
    },
	cost() {
        addResource("herbs", -10);
    },
    visible() {
		return towns[FORESTPATH].getLevel("Forest") >= 20;
    },
    unlocked() {
		return towns[FORESTPATH].getLevel("Forest") >= 40;
    },
    finish() {
		
		towns[FORESTPATH].finishProgress(this.varName, 100 * (1 + resources.herbs * 0.02));
   
		if(getLevelSquirrelAction("Pet Squirrel") === 0) levelUpSquirrelAction("Pet Squirrel");
		if(getLevelSquirrelAction("Pet Squirrel") === 1) levelUpSquirrelAction("Pet Squirrel");

	   
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Feed Animals")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Combat") >= 18) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Combat") >= 30) shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Feed Animals");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Feed Animals")){
						
			case 1:	loseSquirrel = true;
				break;
			
			case 2: actionEffect = () => {
						adjustWildMana();
						view.updateRegular("WildMana", FORESTPATH);
					};
					loseSquirrel = true;
					nothingHappens = true;
				break;
				
			case 3: actionEffect = () => {
						adjustHerbs();
						view.updateRegular("Herbs", FORESTPATH);
					};
					loseSquirrel = true;
					nothingHappens = true;
				break;
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.PotFairy = new Action("Pot Fairy", {
    type: "normal",
    expMult: 1,
    townNum: 1,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return 1;
        }
        return false;
    },
    stats: {
        Cha: 0.4,
		Soul: 0.3,
		Luck : 0.1,
		Per : 0.2
    },
    manaCost() {
        return 2000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
	allowed() {
		return 1;
	},
    visible() {
		return towns[FORESTPATH].getLevel("Feed") >= 1;
    },
    unlocked() {
		return towns[FORESTPATH].getLevel("Feed") >= 10;
    },
    finish() {	

		if(towns[BEGINNERSVILLE].goodTempPots == towns[BEGINNERSVILLE].goodPots){
			const multPots = towns[BEGINNERSVILLE].goodPots/10;
			addResource("reputation", multPots);
			addMana(multPots * 2000);
		} else {
			if(resources.reputation >= 0) {
				const reputToRemove = resources.reputation * (-2);
				addResource("reputation", reputToRemove);
			}
		}
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Pot Fairy")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Magic") >= 20) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Magic") >= 40) shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Pot Fairy");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Pot Fairy")){
						
			case 1:	break;
			
			case 2: actionEffect = () => {
						if(towns[BEGINNERSVILLE].goodTempPots == towns[BEGINNERSVILLE].goodPots){
							const multPots = towns[BEGINNERSVILLE].goodPots/10;
							addResource("reputation", multPots);
							addMana(multPots * 2000);
							
							const herbsToGather = Math.min(100, towns[FORESTPATH].goodTempHerbs);
							addResource("herbs", herbsToGather);
							towns[FORESTPATH].goodTempHerbs -= herbsToGather;
							view.updateRegular("Herbs", FORESTPATH);
							
						} else {
							if(resources.reputation >= 0) {
								const reputToRemove = resources.reputation * (-2);
								addResource("reputation", reputToRemove);
							}
						}
					};
					break;
				
			case 3: actionEffect = () => {
						if(towns[BEGINNERSVILLE].goodTempPots == towns[BEGINNERSVILLE].goodPots){
							const multPots = towns[BEGINNERSVILLE].goodPots/10;
							addResource("reputation", multPots);
							addMana(multPots * 2000);
							
							addResource("herbs", towns[FORESTPATH].goodTempHerbs);
							towns[FORESTPATH].goodTempHerbs  = 0;	
							view.updateRegular("Herbs", FORESTPATH);
							
						} else {
							if(resources.reputation >= 0) {
								const reputToRemove = resources.reputation * (-2);
								addResource("reputation", reputToRemove);
							}
						}
					};
					break;
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.BurnForest = new MultipartAction("Burn Forest", {
    type: "multipart",
    expMult: 1,
    townNum: 1,
	varName: "Burn",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return 1;
        }
        return false;
    },
    stats: {
        Luck: 0.5,
		Dex : 0.3,
		Spd : 0.1,
		Con : 0.1
    },
	loopStats: ["Luck", "Dex"],
    manaCost() {
        return 5000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.herbs >= 10 && resources.reputation < 0;
    },
    loopCost(segment) {
        return 75000;
    },
    tickProgress(offset) {
		const squirrelHelp = ((this.squirrelAction && getLevelSquirrelAction("Burn Forest") >= 1) ? 10 : 0);
        return (resources.herbs + squirrelHelp) *  Math.sqrt((1 + getLevel(this.loopStats[(towns[FORESTPATH].BurnLoopCounter + offset) % this.loopStats.length]) / 1000));
    },
    loopsFinished() {
		addMana(3500);
        addResource("darkEssences", Math.floor(towns[FORESTPATH].getLevel("DarkForest")/10 + 0.000001));
		addResource("herbs", -10);
		if(towns[FORESTPATH].BurnLoopCounter%4 === 0) addResource("reputation", -1);
    },
    getPartName() {
        return `${_txt(`actions>${getXMLName(this.name)}>label_part`)} ${numberToWords(Math.floor((towns[FORESTPATH].BurnLoopCounter + 0.0001) / this.segments + 1))}`;
    },  
    visible() {
		return towns[FORESTPATH].getLevel("Feed") >= 5;
    },
    unlocked() {
		return towns[FORESTPATH].getLevel("Feed") >= 20;
    },
    finish() {
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Burn Forest")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 40) shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Burn Forest");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Burn Forest")){
						
			case 1:	actionEffect = () => {/*Has an effect*/};
					loseSquirrel = true;
				break;
			
			case 2:actionEffect = () => {/*Has an effect*/};
					break;

		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.BirdWatching = new Action("Bird Watching", {
    type: "normal",
    expMult: 4,
    townNum: 1,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.birdsWatched;
        }
        return false;
    },
    stats: {
        Per: 0.8,
        Int: 0.2
    },
    affectedBy: ["Take Glasses"],
    allowed() {
        return trainingLimits;
    },
    manaCost() {
        return 4000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.glasses;
    },
    visible() {
        return towns[FORESTPATH].getLevel("Feed") >= 30;
    },
    unlocked() {
        return towns[FORESTPATH].getLevel("Feed") >= 70;
    },
    finish() {
		
		 unlockStory("birdsWatched");
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Bird Watching")){
				
			case 0: shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Bird Watching");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Bird Watching")){
						
			case 1:	actionEffect = () => {
						unlockStory("birdsWatched")
					};
					nothingHappens = true;
					break;
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.DarkForest = new Action("Dark Forest", {
    type: "progress",
    expMult: 1,
    townNum: 1,
	varName: "DarkForest",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return 1;
        }
        return false;
    },
    stats: {
        Con: 0.4,
		Spd: 0.2,
		Per: 0.2,
		Soul: 0.1,
		Luck: 0.1
		
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.reputation < 0;
    },
    manaCost() {
        return 2000;
    },
    visible() {
		return towns[FORESTPATH].getLevel("Feed") >= 10;
    },
    unlocked() {
		return towns[FORESTPATH].getLevel("Feed") >= 30;
    },
    finish() {
		
		towns[FORESTPATH].finishProgress(this.varName, 100 * (1 + towns[FORESTPATH].getLevel("Witch") / 33.33333333));
		view.adjustManaCost("Continue On");
		view.adjustManaCost("Talk To Witch");
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Dark Forest")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Combat") >= 12) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Combat") >= 35) shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Dark Forest");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Dark Forest")){
						
			case 1:	loseSquirrel = true;
				break;
			
			case 2: actionEffect = () => {
						towns[FORESTPATH].finishProgress(this.varName, 100 * (1 + towns[FORESTPATH].getLevel("Witch") / 25));
						view.adjustManaCost("Continue On");
						view.adjustManaCost("Talk To Witch");
					};
					break;
				
			case 3: actionEffect = () => {
						towns[FORESTPATH].finishProgress(this.varName, 100 * (1 + towns[FORESTPATH].getLevel("Witch") / 20));
						view.adjustManaCost("Continue On");
						view.adjustManaCost("Talk To Witch");
					};
					break;
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.TalkToWitch = new Action("Talk To Witch", {
    type: "progress",
    expMult: 1,
    townNum: 1,
    varName: "Witch",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[FORESTPATH].getLevel(this.varName) >= 1;
            case 2:
                return towns[FORESTPATH].getLevel(this.varName) >= 10;
            case 3:
                return towns[FORESTPATH].getLevel(this.varName) >= 20;
            case 4:
                return towns[FORESTPATH].getLevel(this.varName) >= 40;
            case 5:
                return towns[FORESTPATH].getLevel(this.varName) >= 50;
            case 6:
                return towns[FORESTPATH].getLevel(this.varName) >= 60;
            case 7:
                return towns[FORESTPATH].getLevel(this.varName) >= 80;
            case 8:
                return towns[FORESTPATH].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Cha: 0.3,
        Int: 0.2,
        Soul: 0.5
    },
    manaCost() {
        return 3000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.reputation < 0;
    },
    visible() {
        return towns[FORESTPATH].getLevel("DarkForest") >= 1;
    },
    unlocked() {
        return towns[FORESTPATH].getLevel("DarkForest") >= 20 && getSkillLevel("Magic") >= 50;
    },
    finish() {
		
		towns[FORESTPATH].finishProgress(this.varName, 50 * (1 + towns[FORESTPATH].getLevel("DarkForest") / 33.33333333));
		view.adjustManaCost("Dark Forest");
		view.adjustManaCost("Practice Yin");
		view.adjustManaCost("Learn Brewing");
        
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Talk To Witch")){
			
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Magic") >= 8) shouldLevelUp = true;
				break;
				
			case 2: if(getSkillSquirrelLevel("Magic") >= 30) shouldLevelUp = true;
				break;
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Talk To Witch");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Talk To Witch")){
						
			case 1:	loseSquirrel = true;
				break;
			
			case 2: actionEffect = () => {
						towns[FORESTPATH].finishProgress(this.varName, 50 * (1 + towns[FORESTPATH].getLevel("DarkForest") / 25));
						view.adjustManaCost("Dark Forest");
						view.adjustManaCost("Practice Yin");
						view.adjustManaCost("Learn Brewing");
					};
					break;
				
			case 3: actionEffect = () => {
						towns[FORESTPATH].finishProgress(this.varName, 50 * (1 + towns[FORESTPATH].getLevel("DarkForest") / 20));
						view.adjustManaCost("Dark Forest");
						view.adjustManaCost("Practice Yin");
						view.adjustManaCost("Learn Brewing");
					};
					break;
		}
		
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.PracticeYin = new Action("Practice Yin", {
    type: "normal",
    expMult: 1.5,
    townNum: 1,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return 1;
        }
        return false;
    },
    stats: {
        Int: 0.3,
		Soul: 0.6,
		Per: 0.1
    },
    skills: {
         Yin() {
            const additionalExp = (resources.reputation <= 0 ? resources.reputation * (-25) : 0);
            return 100 + additionalExp;
        }
    },
    manaCost() {
        return Math.ceil(10000 * (1 - towns[FORESTPATH].getLevel("Witch") * 0.005));
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
		return towns[FORESTPATH].getLevel("Witch") >= 1;
    },
    unlocked() {
		return towns[FORESTPATH].getLevel("Witch") >= 20 && getSkillLevel("Magic") >= 60;
    },
    finish() {
		
		handleSkillExp(this.skills);
		
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Practice Yin")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Trust") >= 40) shouldLevelUp = true;
				break;
				
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Practice Yin");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Practice Yin")){
						
			case 1:	break;
			
			case 2: actionEffect = () => {
						addResource("reputation", -4);
					};
					loseSquirrel = true;
				break;
				
		}
	
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.LearnBrewing = new Action("Learn Brewing", {
    type: "normal",
    expMult: 1.5,
    townNum: 1,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return 1;
        }
        return false;
    },
    stats: {
        Con: 0.1,
		Str: 0.1,
        Per: 0.2,
        Soul: 0.6
    },
	skills: {
		Brewing() {
			let alchemyLevel = getSkillLevel("Alchemy");
			let alchemyMultiplier = 0;
			
			for(let levelsNeededForBoost = 1; alchemyLevel > 0; levelsNeededForBoost++) {
				for (let i = 0; i < 10 && alchemyLevel > 0; i++){
				
					alchemyMultiplier += 1;
					alchemyLevel -= levelsNeededForBoost;
				
				}
			}
			
			return 100 + alchemyMultiplier * 10;
		}
	},
    manaCost() {
        return Math.ceil(12000 * (1 - towns[FORESTPATH].getLevel("Witch") * 0.005));
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements &&  resources.darkEssences >= 10;
    },
    visible() {
		return towns[FORESTPATH].getLevel("Witch") >= 15;
	},
    unlocked() {
		return towns[FORESTPATH].getLevel("Witch") >= 40 && getSkillLevel("Magic") >= 70;
    },
    finish() {
		
		handleSkillExp(this.skills);
		addResource("darkEssences", -10);
		view.adjustExpGain(Action.LearnAlchemy);
		view.adjustExpGain(Action.DistillPotions);
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Learn Brewing")){
				
			case 0: shouldLevelUp = true;
				break;				
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Learn Brewing");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		
		switch(getLevelSquirrelAction("Learn Brewing")){
						
			case 1:	break;
				
		}
	
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

Action.ConcoctPotions = new MultipartAction("Concoct Potions", {
    type: "multipart",
    expMult: 1.5,
    townNum: 1,
	varName: "Concoct",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return 1;
        }
        return false;
    },
    stats: {
        Str: 0.3,
        Soul: 0.6,
        Per: 0.1,
    },
	skills: {
		Brewing() {
			let alchemyLevel = getSkillLevel("Alchemy");
			let alchemyMultiplier = 0;
			
			for(let levelsNeededForBoost = 1; alchemyLevel > 0; levelsNeededForBoost++) {
				for (let i = 0; i < 10 && alchemyLevel > 0; i++){
				
					alchemyMultiplier += 1;
					alchemyLevel -= levelsNeededForBoost;
				
				}
			}
			
			return 100 + alchemyMultiplier * 10;
		}
	},
	loopStats: ["Soul", "Per", "Str"],
    manaCost() {
        return 10000;
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements && resources.darkEssences >= 10 && resources.reputation <= -10;
    },
    loopCost(segment) {
		const numberLoops = towns[FORESTPATH].ConcoctLoopCounter / 3;
        return Math.floor(Math.pow(1.4, numberLoops)+ 0.0000001) * 50000;
    },
    tickProgress(offset) {
		if(this.squirrelAction) return 0;
        return (getSkillLevel("Brewing") + getSkillLevel("Alchemy")/2) * (1 + getLevel(this.loopStats[(towns[FORESTPATH].ConcoctLoopCounter + offset) % this.loopStats.length]) / 100) * Math.sqrt(1 + towns[FORESTPATH].totalConcoct / 100);
    },
    loopsFinished() {
		addResource("darkEssences", -10);
        addResource("darkPotions", 1);
		handleSkillExp(this.skills);
		view.adjustExpGain(Action.LearnAlchemy);
		view.adjustExpGain(Action.DistillPotions);
    },	
    getPartName() {
        return `${_txt(`actions>${getXMLName(this.name)}>label_part`)} ${numberToWords(Math.floor((towns[FORESTPATH].ConcoctLoopCounter + 0.0001) / this.segments + 1))}`;
    }, 
    visible() {
        return getSkillLevel("Brewing") >= 1;
    },
    unlocked() {
        return getSkillLevel("Brewing") >= 10;
    },
    finish() {
			
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Concoct Potions")){
				
				case 0: shouldLevelUp = true;
					break;				
									
			}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Concoct Potions");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Concoct Potions")){
						
			case 1:	break;
				
		}
	
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

function checkSoulstoneSac(amount) {
    let sum = 0;
    for (const stat in stats) 
        sum += stats[stat].soulstone;
    return sum >= amount ? true : false;
}

function sacrificeSoulstones(amount) {
    while (amount > 0)
    {
        let highestSoulstoneStat = "";
        let highestSoulstone = -1;
        for (const stat in stats) {
            if (stats[stat].soulstone > highestSoulstone) {
                highestSoulstoneStat = stat;
                highestSoulstone = stats[stat].soulstone;
            }
        }
        //console.log("Subtracting " + Math.ceil(amount/9) + " soulstones from " + highestSoulstoneStat + ". Old total: " + stats[highestSoulstoneStat].soulstone + ". New Total: " + (stats[highestSoulstoneStat].soulstone - Math.ceil(amount/9)));
        stats[highestSoulstoneStat].soulstone -= Math.ceil(amount/9);
        amount -= Math.ceil(amount/9);
    }
}

Action.ContinueOn = new Action("Continue On", {
    type: "normal",
    expMult: 2,
    townNum: 1,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return townsUnlocked.includes(2);
        }
        return false;
    },
    stats: {
        Con: 0.4,
        Per: 0.2,
        Spd: 0.4
    },
    allowed() {
        return getNumOnList("Open Portal") > 0 ? 2 : 1;
    },
    manaCost() {
		let shortcutReduce = towns[FORESTPATH].getLevel("Shortcut");
		if(shortcutReduce <= 50){
			shortcutReduce *= 600;
		} else {
			shortcutReduce = 600 * 50 + (shortcutReduce - 50) * 60;
		}
		
		let darkForestReduce = towns[FORESTPATH].getLevel("DarkForest");
		if(darkForestReduce <= 50){
			darkForestReduce *= 600;
		} else {
			darkForestReduce = 600 * 50 + (darkForestReduce - 50) * 60;
		}
		
        return Math.ceil(70000 - shortcutReduce - darkForestReduce);
    },
	canStart() {
		const squirrelRequirements = (!this.squirrelAction || resources.squirrel);
		return squirrelRequirements;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
		
		unlockTown(MERCHANTON);
    },
	squirrelLevelUp(onlyGetState) {
		let shouldLevelUp = false;
		
		switch(getLevelSquirrelAction("Continue On")){
				
			case 0: shouldLevelUp = true;
				break;
				
			case 1: if(getSkillSquirrelLevel("Magic") >= 10) shouldLevelUp = true;
				break;
				
								
		}
		
		if(onlyGetState){
			if(shouldLevelUp) return true;
			return false;
		}
		
		if(shouldLevelUp) levelUpSquirrelAction("Continue On");
		
	},
	squirrelActionEffect(onlyGetLoseSquirrel, onlyGetEmptySquirrel) {
		
		let actionEffect = () => {};
		let loseSquirrel = false;
		let nothingHappens = false;
		
		switch(getLevelSquirrelAction("Continue On")){
						
			case 1:	break;
			
			case 2: actionEffect = () => {
						unlockTown(SANCTUARY);
					};
					break;
		}
	
		if(onlyGetLoseSquirrel){
			if(loseSquirrel) return true;
			return false;
		}
		
		if(onlyGetEmptySquirrel){
			if(String(actionEffect) === "() => {}" || nothingHappens === true) return true;
			return false;
		}
		
		if(loseSquirrel) addResource("squirrel", false);
		
		actionEffect();
	}
});

//====================================================================================================
//Zone 3 - Merchanton
//====================================================================================================
Action.ExploreCity = new Action("Explore City", {
    type: "progress",
    expMult: 1,
    townNum: 2,
    varName: "City",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MERCHANTON].getLevel(this.varName) >= 1;
            case 2:
                return towns[MERCHANTON].getLevel(this.varName) >= 10;
            case 3:
                return towns[MERCHANTON].getLevel(this.varName) >= 20;
            case 4:
                return towns[MERCHANTON].getLevel(this.varName) >= 40;
            case 5:
                return towns[MERCHANTON].getLevel(this.varName) >= 50;
            case 6:
                return towns[MERCHANTON].getLevel(this.varName) >= 60;
            case 7:
                return towns[MERCHANTON].getLevel(this.varName) >= 80;
            case 8:
                return towns[MERCHANTON].getLevel(this.varName) >= 90;
            case 9:
                return towns[MERCHANTON].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Con: 0.1,
        Per: 0.3,
        Cha: 0.2,
        Spd: 0.3,
        Luck: 0.1
    },
    affectedBy: ["Take Glasses"],
    manaCost() {
        return 750;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
        towns[MERCHANTON].finishProgress(this.varName, 100 * (resources.glasses ? 2 : 1));
    },
});
function adjustSuckers() {
    let town = towns[MERCHANTON];
    let baseGamble = town.getLevel("City") * 3;
    town.totalGamble = Math.floor(baseGamble * getSkillMod("Spatiomancy", 600, 800, .5) + baseGamble * getSurveyBonus(town));
}

Action.Gamble = new Action("Gamble", {
    type: "limited",
    expMult: 2,
    townNum: 2,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MERCHANTON][`checked${this.varName}`] >= 1;
            case 2:
                return towns[MERCHANTON][`good${this.varName}`] >= 1;
            case 3:
                return towns[MERCHANTON][`good${this.varName}`] >= 30;
            case 4:
                return storyReqs.failedGamble;
            case 5:
                return storyReqs.failedGambleLowMoney;
        }
        return false;
    },
    stats: {
        Cha: 0.2,
        Luck: 0.8
    },
    canStart() {
        return resources.gold >= 20 && resources.reputation >= -5;
    },
    cost() {
        addResource("gold", -20);
        addResource("reputation", -1);
    },
    manaCost() {
        return 1000;
    },
    visible() {
        return true;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("City") >= 10;
    },
    finish() {
        towns[MERCHANTON].finishRegular(this.varName, 10, () => {
            let goldGain = Math.floor(60 * getSkillBonus("Thievery"));
            addResource("gold", goldGain);
            return 60;
        });
    },
});

Action.GetDrunk = new Action("Get Drunk", {
    type: "progress",
    expMult: 3,
    townNum: 2,
    varName: "Drunk",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MERCHANTON].getLevel(this.varName) >= 1;
            case 2:
                return towns[MERCHANTON].getLevel(this.varName) >= 10;
            case 3:
                return towns[MERCHANTON].getLevel(this.varName) >= 20;
            case 4:
                return towns[MERCHANTON].getLevel(this.varName) >= 30;
            case 5:
                return towns[MERCHANTON].getLevel(this.varName) >= 40;
            case 6:
                return towns[MERCHANTON].getLevel(this.varName) >= 60;
            case 7:
                return towns[MERCHANTON].getLevel(this.varName) >= 80;
            case 8:
                return towns[MERCHANTON].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Str: 0.1,
        Cha: 0.5,
        Con: 0.2,
        Soul: 0.2
    },
    canStart() {
        return resources.reputation >= -3;
    },
    cost() {
        addResource("reputation", -1);
    },
    manaCost() {
        return 1000;
    },
    visible() {
        return true;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("City") >= 20;
    },
    finish() {
        towns[MERCHANTON].finishProgress(this.varName, 100);
    },
});

Action.BuyManaZ3 = new Action("Buy Mana Z3", {
    type: "normal",
    expMult: 1,
    townNum: 2,
    stats: {
        Cha: 0.7,
        Int: 0.2,
        Luck: 0.1
    },
    manaCost() {
        return 100;
    },
    canStart() {
        return !portalUsed;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    goldCost() {
        return Math.floor(50 * getSkillBonus("Mercantilism"));
    },
    finish() {
        addMana(resources.gold * this.goldCost());
        resetResource("gold");
    },
});

Action.SellPotions = new Action("Sell Potions", {
    type: "normal",
    expMult: 1,
    townNum: 2,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.potionSold;
            case 2:
                return storyReqs.sell20PotionsInALoop;
            case 3:
                return storyReqs.sellPotionFor100Gold;
        }
        return false;
    },
    stats: {
        Cha: 0.7,
        Int: 0.2,
        Luck: 0.1
    },
    manaCost() {
        return 1000;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
        if (resources.potions >= 20) unlockStory("sell20PotionsInALoop");
        addResource("gold", resources.potions * getSkillLevel("Alchemy"));
        resetResource("potions");
        unlockStory("potionSold");
        if (getSkillLevel("Alchemy") >= 100) unlockStory("sellPotionFor100Gold");
    },
});

// the guild actions are somewhat unique in that they override the default segment naming
// with their own segment names, and so do not use the segmentNames inherited from
// MultipartAction
Action.AdventureGuild = new MultipartAction("Adventure Guild", {
    type: "multipart",
    expMult: 1,
    townNum: 2,
    varName: "AdvGuild",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.advGuildTestsTaken;
            case 2:
                return storyReqs.advGuildRankEReached;
            case 3:
                return storyReqs.advGuildRankDReached;
            case 4:
                return storyReqs.advGuildRankCReached;
            case 5:
                return storyReqs.advGuildRankBReached;
            case 6:
                return storyReqs.advGuildRankAReached;
            case 7:
                return storyReqs.advGuildRankSReached;
            case 8:
                return storyReqs.advGuildRankUReached;
            case 9:
                return storyReqs.advGuildRankGodlikeReached;
        }
        return false;
    },
    stats: {
        Str: 0.4,
        Dex: 0.3,
        Con: 0.3
    },
    loopStats: ["Str", "Dex", "Con"],
    manaCost() {
        return 3000;
    },
    allowed() {
        return 1;
    },
    canStart() {
        return guild === "";
    },
    loopCost(segment) {
        return precision3(Math.pow(1.2, towns[MERCHANTON][`${this.varName}LoopCounter`] + segment)) * 5e6;
    },
    tickProgress(offset) {
        return (getSkillLevel("Magic") / 2 +
                getSelfCombat("Combat")) *
                (1 + getLevel(this.loopStats[(towns[MERCHANTON][`${this.varName}LoopCounter`] + offset) % this.loopStats.length]) / 100) *
                Math.sqrt(1 + towns[MERCHANTON][`total${this.varName}`] / 1000);
    },
    loopsFinished() {
        if (curAdvGuildSegment >= 0) unlockStory("advGuildRankEReached");
        if (curAdvGuildSegment >= 3) unlockStory("advGuildRankDReached");
        if (curAdvGuildSegment >= 6) unlockStory("advGuildRankCReached");
        if (curAdvGuildSegment >= 9) unlockStory("advGuildRankBReached");
        if (curAdvGuildSegment >= 12) unlockStory("advGuildRankAReached");
        if (curAdvGuildSegment >= 15) unlockStory("advGuildRankSReached");
        if (curAdvGuildSegment >= 27) unlockStory("advGuildRankUReached");
        if (curAdvGuildSegment >= 39) unlockStory("advGuildRankGodlikeReached");
    },
    segmentFinished() {
        curAdvGuildSegment++;
        addMana(200);
    },
    getPartName() {
        return `Rank ${getAdvGuildRank().name}`;
    },
    getSegmentName(segment) {
        return `Rank ${getAdvGuildRank(segment % 3).name}`;
    },
    visible() {
        return towns[MERCHANTON].getLevel("Drunk") >= 5;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("Drunk") >= 20;
    },
    finish() {
        guild = "Adventure";
        unlockStory("advGuildTestsTaken");
    },
});
function getAdvGuildRank(offset) {
    let name = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS", "SSSS", "U", "UU", "UUU", "UUUU"][Math.floor(curAdvGuildSegment / 3 + 0.00001)];

    const segment = (offset === undefined ? 0 : offset - (curAdvGuildSegment % 3)) + curAdvGuildSegment;
    let bonus = precision3(1 + segment / 20 + Math.pow(segment, 2) / 300);
    if (name) {
        if (offset === undefined) {
            name += ["-", "", "+"][curAdvGuildSegment % 3];
        } else {
            name += ["-", "", "+"][offset % 3];
        }
    } else {
        name = "Godlike";
        bonus = 10;
    }
    name += `, Mult x${bonus}`;
    return { name, bonus };
}

Action.GatherTeam = new Action("Gather Team", {
    type: "normal",
    expMult: 3,
    townNum: 2,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.teammateGathered;
            case 2:
                return storyReqs.fullParty;
            case 3:
                return storyReqs.failedGatherTeam;
        }
        return false;
    },
    stats: {
        Per: 0.2,
        Cha: 0.5,
        Int: 0.2,
        Luck: 0.1
    },
    affectedBy: ["Adventure Guild"],
    allowed() {
        return 5;
    },
    canStart() {
        return guild === "Adventure" && resources.gold >= (resources.teamMembers + 1) * 100;
    },
    cost() {
        // cost comes after finish
        addResource("gold", -(resources.teamMembers) * 100);
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return towns[MERCHANTON].getLevel("Drunk") >= 10;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("Drunk") >= 20;
    },
    finish() {
        addResource("teamMembers", 1);
        unlockStory("teammateGathered");
        if (resources.teamMembers >= 5) unlockStory("fullParty");
    },
});

Action.LargeDungeon = new DungeonAction("Large Dungeon", 1, {
    type: "multipart",
    expMult: 2,
    townNum: 2,
    varName: "LDungeon",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.largeDungeonAttempted;
            case 2:
                return towns[MERCHANTON][`total${this.varName}`] >= 2000;
            case 3:
                return towns[MERCHANTON][`total${this.varName}`] >= 10000;
            case 4:
                return towns[MERCHANTON][`total${this.varName}`] >= 20000;
            case 5:
                return storyReqs.clearLDungeon;
        }
        return false;
    },
    stats: {
        Str: 0.2,
        Dex: 0.2,
        Con: 0.2,
        Cha: 0.3,
        Luck: 0.1
    },
    skills: {
        Combat: 15,
        Magic: 15
    },
    loopStats: ["Cha", "Spd", "Str", "Cha", "Dex", "Dex", "Str"],
    affectedBy: ["Gather Team"],
    manaCost() {
        return 6000;
    },
    canStart() {
        const curFloor = Math.floor((towns[this.townNum].LDungeonLoopCounter) / this.segments + 0.0000001);
        return resources.teamMembers >= 1 && curFloor < dungeons[this.dungeonNum].length;
    },
    loopCost(segment) {
        return precision3(Math.pow(3, Math.floor((towns[this.townNum].LDungeonLoopCounter + segment) / this.segments + 0.0000001)) * 5e5);
    },
    tickProgress(offset) {
        const floor = Math.floor((towns[this.townNum].LDungeonLoopCounter) / this.segments + 0.0000001);
        return (getTeamCombat() + getSkillLevel("Magic")) *
            (1 + getLevel(this.loopStats[(towns[this.townNum].LDungeonLoopCounter + offset) % this.loopStats.length]) / 100) *
            Math.sqrt(1 + dungeons[this.dungeonNum][floor].completed / 200);
    },
    loopsFinished() {
        const curFloor = Math.floor((towns[this.townNum].LDungeonLoopCounter) / this.segments + 0.0000001 - 1);
        finishDungeon(this.dungeonNum, curFloor);
    },
    visible() {
        return towns[MERCHANTON].getLevel("Drunk") >= 5;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("Drunk") >= 20;
    },
    finish() {
        handleSkillExp(this.skills);
        unlockStory("largeDungeonAttempted");
        if (towns[MERCHANTON].LDungeonLoopCounter >= 63) unlockStory("clearLDungeon");
    },
});

Action.CraftingGuild = new MultipartAction("Crafting Guild", {
    type: "multipart",
    expMult: 1,
    townNum: 2,
    varName: "CraftGuild",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.craftGuildTestsTaken;
            case 2:
                return storyReqs.craftGuildRankEReached;
            case 3:
                return storyReqs.craftGuildRankDReached;
            case 4:
                return storyReqs.craftGuildRankCReached;
            case 5:
                return storyReqs.craftGuildRankBReached;
            case 6:
                return storyReqs.craftGuildRankAReached;
            case 7:
                return storyReqs.craftGuildRankSReached;
            case 8:
                return storyReqs.craftGuildRankUReached;
            case 9:
                return storyReqs.craftGuildRankGodlikeReached;
        }
        return false;
    },
    stats: {
        Dex: 0.3,
        Per: 0.3,
        Int: 0.4
    },
    skills: {
        Crafting: 50
    },
    loopStats: ["Int", "Per", "Dex"],
    manaCost() {
        return 3000;
    },
    allowed() {
        return 1;
    },
    canStart() {
        return guild === "";
    },
    loopCost(segment) {
        return precision3(Math.pow(1.2, towns[MERCHANTON][`${this.varName}LoopCounter`] + segment)) * 2e6;
    },
    tickProgress(offset) {
        return (getSkillLevel("Magic") / 2 +
                getSkillLevel("Crafting")) *
                (1 + getLevel(this.loopStats[(towns[MERCHANTON][`${this.varName}LoopCounter`] + offset) % this.loopStats.length]) / 100) *
                Math.sqrt(1 + towns[MERCHANTON][`total${this.varName}`] / 1000);
    },
    loopsFinished() {
        if (curCraftGuildSegment >= 0) unlockStory("craftGuildRankEReached");
        if (curCraftGuildSegment >= 3) unlockStory("craftGuildRankDReached");
        if (curCraftGuildSegment >= 6) unlockStory("craftGuildRankCReached");
        if (curCraftGuildSegment >= 9) unlockStory("craftGuildRankBReached");
        if (curCraftGuildSegment >= 12) unlockStory("craftGuildRankAReached");
        if (curCraftGuildSegment >= 15) unlockStory("craftGuildRankSReached");
        if (curCraftGuildSegment >= 27) unlockStory("craftGuildRankUReached");
        if (curCraftGuildSegment >= 39) unlockStory("craftGuildRankGodlikeReached");
    },
    segmentFinished() {
        curCraftGuildSegment++;
        handleSkillExp(this.skills);
        addResource("gold", 10);
    },
    getPartName() {
        return `Rank ${getCraftGuildRank().name}`;
    },
    getSegmentName(segment) {
        return `Rank ${getCraftGuildRank(segment % 3).name}`;
    },
    visible() {
        return towns[MERCHANTON].getLevel("Drunk") >= 5;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("Drunk") >= 30;
    },
    finish() {
        guild = "Crafting";
        unlockStory("craftGuildTestsTaken");
    },
});
function getCraftGuildRank(offset) {
    let name = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS", "SSSS", "U", "UU", "UUU", "UUUU"][Math.floor(curCraftGuildSegment / 3 + 0.00001)];

    const segment = (offset === undefined ? 0 : offset - (curCraftGuildSegment % 3)) + curCraftGuildSegment;
    let bonus = precision3(1 + segment / 20 + Math.pow(segment, 2) / 300);
    if (name) {
        if (offset === undefined) {
            name += ["-", "", "+"][curCraftGuildSegment % 3];
        } else {
            name += ["-", "", "+"][offset % 3];
        }
    } else {
        name = "Godlike";
        bonus = 10;
    }
    name += `, Mult x${bonus}`;
    return { name, bonus };
}

Action.CraftArmor = new Action("Craft Armor", {
    type: "normal",
    expMult: 1,
    townNum: 2,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.armorCrafted;
            case 2:
                return storyReqs.craft10Armor;
            case 3:
                return storyReqs.failedCraftArmor;
        }
        return false;
    },
    stats: {
        Str: 0.1,
        Dex: 0.3,
        Con: 0.3,
        Int: 0.3
    },
    // this.affectedBy = ["Crafting Guild"];
    canStart() {
        return resources.hide >= 2;
    },
    cost() {
        addResource("hide", -2);
    },
    manaCost() {
        return 1000;
    },
    visible() {
        return towns[MERCHANTON].getLevel("Drunk") >= 15;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("Drunk") >= 30;
    },
    finish() {
        addResource("armor", 1);
        unlockStory("armorCrafted");
        if (resources.armor >= 10) unlockStory("craft10Armor");
    },
});

Action.Apprentice = new Action("Apprentice", {
    type: "progress",
    expMult: 1.5,
    townNum: 2,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MERCHANTON].getLevel(this.varName) >= 1;
            case 2:
                return towns[MERCHANTON].getLevel(this.varName) >= 10;
            case 3:
                return towns[MERCHANTON].getLevel(this.varName) >= 20;
            case 4:
                return towns[MERCHANTON].getLevel(this.varName) >= 40;
            case 5:
                return towns[MERCHANTON].getLevel(this.varName) >= 60;
            case 6:
                return towns[MERCHANTON].getLevel(this.varName) >= 80;
            case 7:
                return towns[MERCHANTON].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Dex: 0.2,
        Int: 0.4,
        Cha: 0.4
    },
    skills: {
        Crafting() {
            return 10 * (1 + towns[MERCHANTON].getLevel("Apprentice") / 100);
        }
    },
    affectedBy: ["Crafting Guild"],
    canStart() {
        return guild === "Crafting";
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return towns[MERCHANTON].getLevel("Drunk") >= 20;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("Drunk") >= 40;
    },
    finish() {
        towns[MERCHANTON].finishProgress(this.varName, 30 * getCraftGuildRank().bonus);
        handleSkillExp(this.skills);
        view.adjustExpGain(Action.Apprentice);
    },
});

Action.Mason = new Action("Mason", {
    type: "progress",
    expMult: 2,
    townNum: 2,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MERCHANTON].getLevel(this.varName) >= 1;
            case 2:
                return towns[MERCHANTON].getLevel(this.varName) >= 10;
            case 3:
                return towns[MERCHANTON].getLevel(this.varName) >= 20;
            case 4:
                return towns[MERCHANTON].getLevel(this.varName) >= 40;
            case 5:
                return towns[MERCHANTON].getLevel(this.varName) >= 60;
            case 6:
                return towns[MERCHANTON].getLevel(this.varName) >= 80;
            case 7:
                return towns[MERCHANTON].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Dex: 0.2,
        Int: 0.5,
        Cha: 0.3
    },
    skills: {
        Crafting() {
            return 20 * (1 + towns[MERCHANTON].getLevel("Mason") / 100);
        }
    },
    affectedBy: ["Crafting Guild"],
    canStart() {
        return guild === "Crafting";
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return towns[MERCHANTON].getLevel("Drunk") >= 40;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("Drunk") >= 60 && towns[MERCHANTON].getLevel("Apprentice") >= 100;
    },
    finish() {
        towns[MERCHANTON].finishProgress(this.varName, 20 * getCraftGuildRank().bonus);
        handleSkillExp(this.skills);
    },
});

Action.Architect = new Action("Architect", {
    type: "progress",
    expMult: 2.5,
    townNum: 2,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MERCHANTON].getLevel(this.varName) >= 1;
            case 2:
                return towns[MERCHANTON].getLevel(this.varName) >= 10;
            case 3:
                return towns[MERCHANTON].getLevel(this.varName) >= 20;
            case 4:
                return towns[MERCHANTON].getLevel(this.varName) >= 40;
            case 5:
                return towns[MERCHANTON].getLevel(this.varName) >= 60;
            case 6:
                return towns[MERCHANTON].getLevel(this.varName) >= 80;
            case 7:
                return towns[MERCHANTON].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Dex: 0.2,
        Int: 0.6,
        Cha: 0.2
    },
    skills: {
        Crafting() {
            return 40 * (1 + towns[MERCHANTON].getLevel("Architect") / 100);
        }
    },
    affectedBy: ["Crafting Guild"],
    canStart() {
        return guild === "Crafting";
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return towns[MERCHANTON].getLevel("Drunk") >= 60;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("Drunk") >= 80 && towns[MERCHANTON].getLevel("Mason") >= 100;
    },
    finish() {
        towns[MERCHANTON].finishProgress(this.varName, 10 * getCraftGuildRank().bonus);
        handleSkillExp(this.skills);
    },
});

Action.ReadBooks = new Action("Read Books", {
    type: "normal",
    expMult: 4,
    townNum: 2,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.booksRead;
        }
        return false;
    },
    stats: {
        Int: 0.8,
        Soul: 0.2
    },
    affectedBy: ["Take Glasses"],
    allowed() {
        return trainingLimits;
    },
    canStart() {
        return resources.glasses;
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return towns[MERCHANTON].getLevel("City") >= 5;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("City") >= 50;
    },
    finish() {
        unlockStory("booksRead");
    },
});

Action.BuyPickaxe = new Action("Buy Pickaxe", {
    type: "normal",
    expMult: 1,
    townNum: 2,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.pickaxeBought;
        }
        return false;
    },
    stats: {
        Cha: 0.8,
        Int: 0.1,
        Spd: 0.1
    },
    allowed() {
        return 1;
    },
    canStart() {
        return resources.gold >= 200;
    },
    cost() {
        addResource("gold", -200);
    },
    manaCost() {
        return 3000;
    },
    visible() {
        return towns[MERCHANTON].getLevel("City") >= 60;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("City") >= 90;
    },
    finish() {
        addResource("pickaxe", true);
        unlockStory("pickaxeBought");
    },
});

Action.HeroesTrial = new TrialAction("Heroes Trial", 0, {
    type: "multipart",
    expMult: 0.2,
    townNum: 2,
    varName: "HTrial",
    stats: {
        Dex: 0.11,
        Str: 0.11,
        Con: 0.11,
        Spd: 0.11,
        Per: 0.11,
        Cha: 0.11,
        Int: 0.11,
        Luck: 0.11,
        Soul: 0.11
    },
    skills: {
        Combat: 500,
        Pyromancy: 100,
        Restoration: 100
    },
    loopStats: ["Dex", "Str", "Con", "Spd", "Per", "Cha", "Int", "Luck", "Soul"],
    affectedBy: ["Team"],
    floorScaling: 2,
    baseScaling: 1e8,
    manaCost() {
        return 100000;
    },
    canStart() {
        return this.currentFloor() < trialFloors[this.trialNum];
    },
    /*loopCost(segment) {
        return precision3(Math.pow(2, Math.floor((towns[this.townNum].HTrialLoopCounter + segment) / this.segments + 0.0000001)) * 1e8);
    },*/
    baseProgress() {
        return getTeamCombat();
    },
    floorReward() {
        if (this.currentFloor() >= getBuffLevel("Heroism")) addBuffAmt("Heroism", 1);
    },
    /*tickProgress(offset) {
        const floor = Math.floor((towns[this.townNum].HTrialLoopCounter) / this.segments + 0.0000001);
        return getTeamCombat() *
            (1 + getLevel(this.loopStats[(towns[this.townNum].HTrialLoopCounter + offset) % this.loopStats.length]) / 100) *
            Math.sqrt(1 + trials[this.trialNum][floor].completed / 200);
    },*/
    /*loopsFinished() {
        const curFloor = this.currentFloor();
        trials[this.trialNum][curFloor].completed++;
        if (curFloor >= getBuffLevel("Heroism")) addBuffAmt("Heroism", 1);
        if (curFloor + 1 > trials[this.trialNum].highestFloor || trials[this.trialNum].highestFloor === undefined) trials[this.trialNum].highestFloor = curFloor + 1;
        view.updateTrialInfo(this.trialNum, curFloor);
    },*/
    visible() {
        return towns[this.townNum].getLevel("Survey") >= 100;
    },
    unlocked() {
        return towns[this.townNum].getLevel("Survey") >= 100;
    },
    finish() {
        handleSkillExp(this.skills);
        view.updateBuff("Heroism");
        view.updateSkills();
    },
});

Action.StartTrek = new Action("Start Trek", {
    type: "normal",
    expMult: 2,
    townNum: 2,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return townsUnlocked.includes(3);
        }
        return false;
    },
    stats: {
        Con: 0.7,
        Per: 0.2,
        Spd: 0.1
    },
    allowed() {
        return getNumOnList("Open Portal") > 0 ? 2 : 1;
    },
    manaCost() {
        return Math.ceil(12000);
    },
    visible() {
        return towns[MERCHANTON].getLevel("City") >= 30;
    },
    unlocked() {
        return towns[MERCHANTON].getLevel("City") >= 60;
    },
    finish() {
        //unlockTown(3);
    },
});

Action.Underworld = new Action("Underworld", {
    type: "normal",
    expMult: 1,
    townNum: 2,
    stats: {
        Cha: 1,
    },
    allowed() {
        return 1;
    },
    cost() {
        addResource("gold", -500)
    },
    manaCost() {
        return 50000;
    },
    canStart() {
        return resources.gold >= 500;
    },
    visible() {
        return getExploreProgress() >= 50;
    },
    unlocked() {
        return getExploreProgress() >= 50;
    },
    goldCost() {
        return 500;
    },
    finish() {
        unlockTown(7);
    },
});

//====================================================================================================
//Zone 4 - Mt Olympus
//====================================================================================================

Action.ClimbMountain = new Action("Climb Mountain", {
    type: "progress",
    expMult: 1,
    townNum: 3,
    varName: "Mountain",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 1;
            case 2:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 10;
            case 3:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 20;
            case 4:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 40;
            case 5:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 60;
            case 6:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 80;
            case 7:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Dex: 0.1,
        Str: 0.2,
        Con: 0.4,
        Per: 0.2,
        Spd: 0.1
    },
    affectedBy: ["Buy Pickaxe"],
    manaCost() {
        return 800;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
        towns[MTOLYMPUS].finishProgress(this.varName, 100 * (resources.pickaxe ? 2 : 1));
    },
});

Action.ManaGeyser = new Action("Mana Geyser", {
    type: "limited",
    expMult: 1,
    townNum: 3,
    varName: "Geysers",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MTOLYMPUS][`good${this.varName}`] >= 1;
            case 2:
                return towns[MTOLYMPUS][`good${this.varName}`] >= 10;
        }
        return false;
    },
    stats: {
        Str: 0.6,
        Per: 0.3,
        Int: 0.1,
    },
    affectedBy: ["Buy Pickaxe"],
    manaCost() {
        return Math.ceil(2000 * getSkillBonus("Spatiomancy"));
    },
    canStart() {
        return resources.pickaxe;
    },
    visible() {
        return true;
    },
    unlocked() {
        return towns[MTOLYMPUS].getLevel("Mountain") >= 2;
    },
    finish() {
        towns[MTOLYMPUS].finishRegular(this.varName, 100, () => {
            addMana(5000);
            return 5000;
        });
    },
});
function adjustGeysers() {
    let town = towns[MTOLYMPUS];
    let baseGeysers = town.getLevel("Mountain") * 10;
    town.totalGeysers = baseGeysers + baseGeysers * getSurveyBonus(town);
}

Action.DecipherRunes = new Action("Decipher Runes", {
    type: "progress",
    expMult: 1,
    townNum: 3,
    varName: "Runes",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 1;
            case 2:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 10;
            case 3:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 20;
            case 4:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 30;
            case 5:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 40;
            case 6:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 60;
            case 7:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 80;
            case 8:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Per: 0.3,
        Int: 0.7
    },
    affectedBy: ["Take Glasses"],
    manaCost() {
        return 1200;
    },
    visible() {
        return towns[MTOLYMPUS].getLevel("Mountain") >= 2;
    },
    unlocked() {
        return towns[MTOLYMPUS].getLevel("Mountain") >= 20;
    },
    finish() {
        towns[MTOLYMPUS].finishProgress(this.varName, 100 * (resources.glasses ? 2 : 1));
        view.adjustManaCost("Chronomancy");
        view.adjustManaCost("Pyromancy");
    },
});

Action.Chronomancy = new Action("Chronomancy", {
    type: "normal",
    expMult: 2,
    townNum: 3,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return getSkillLevel("Chronomancy") >= 1;
            case 2:
                return getSkillLevel("Chronomancy") >= 50;
            case 3:
                return getSkillLevel("Chronomancy") >= 100;
        }
        return false;
    },
    stats: {
        Soul: 0.1,
        Spd: 0.3,
        Int: 0.6
    },
    skills: {
        Chronomancy: 100
    },
    manaCost() {
        return Math.ceil(10000 * (1 - towns[MTOLYMPUS].getLevel("Runes") * 0.005));
    },
    visible() {
        return towns[MTOLYMPUS].getLevel("Runes") >= 8;
    },
    unlocked() {
        return towns[MTOLYMPUS].getLevel("Runes") >= 30 && getSkillLevel("Magic") >= 150;
    },
    finish() {
        handleSkillExp(this.skills);
    },
});

Action.LoopingPotion = new Action("Looping Potion", {
    type: "normal",
    expMult: 2,
    townNum: 3,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.loopingPotionMade;
        }
        return false;
    },
    stats: {
        Dex: 0.2,
        Int: 0.7,
        Soul: 0.1,
    },
    skills: {
        Alchemy: 100
    },
    canStart() {
        return resources.herbs >= 400;
    },
    cost() {
        addResource("herbs", -400);
    },
    manaCost() {
        return Math.ceil(30000);
    },
    visible() {
        return getSkillLevel("Spatiomancy") >= 1;
    },
    unlocked() {
        return getSkillLevel("Alchemy") >= 500;
    },
    finish() {
        addResource("loopingPotion", true);
        handleSkillExp(this.skills);
        unlockStory("loopingPotionMade");
    },
});

Action.Pyromancy = new Action("Pyromancy", {
    type: "normal",
    expMult: 2,
    townNum: 3,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return getSkillLevel("Pyromancy") >= 1;
            case 2:
                return getSkillLevel("Pyromancy") >= 50;
            case 3:
                return getSkillLevel("Pyromancy") >= 100;
        }
        return false;
    },
    stats: {
        Per: 0.2,
        Int: 0.7,
        Soul: 0.1
    },
    skills: {
        Pyromancy: 100
    },
    manaCost() {
        return Math.ceil(14000 * (1 - towns[MTOLYMPUS].getLevel("Runes") * 0.005));
    },
    visible() {
        return towns[MTOLYMPUS].getLevel("Runes") >= 16;
    },
    unlocked() {
        return towns[MTOLYMPUS].getLevel("Runes") >= 60 && getSkillLevel("Magic") >= 200;
    },
    finish() {
        handleSkillExp(this.skills);
    },
});

Action.ExploreCavern = new Action("Explore Cavern", {
    type: "progress",
    expMult: 1,
    townNum: 3,
    varName: "Cavern",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 1;
            case 2:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 10;
            case 3:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 20;
            case 4:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 40;
            case 5:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 50;
            case 6:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 60;
            case 7:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 80;
            case 8:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Dex: 0.1,
        Str: 0.3,
        Con: 0.2,
        Per: 0.3,
        Spd: 0.1
    },
    manaCost() {
        return 1500;
    },
    visible() {
        return towns[MTOLYMPUS].getLevel("Mountain") >= 10;
    },
    unlocked() {
        return towns[MTOLYMPUS].getLevel("Mountain") >= 40;
    },
    finish() {
        towns[MTOLYMPUS].finishProgress(this.varName, 100);
    },
});

Action.MineSoulstones = new Action("Mine Soulstones", {
    type: "limited",
    expMult: 1,
    townNum: 3,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MTOLYMPUS][`checked${this.varName}`] >= 1;
            case 2:
                return towns[MTOLYMPUS][`good${this.varName}`] >= 1;
            case 3:
                return towns[MTOLYMPUS][`good${this.varName}`] >= 30;
        }
        return false;
    },
    stats: {
        Str: 0.6,
        Dex: 0.1,
        Con: 0.3,
    },
    affectedBy: ["Buy Pickaxe"],
    manaCost() {
        return 5000;
    },
    canStart() {
        return resources.pickaxe;
    },
    visible() {
        return towns[MTOLYMPUS].getLevel("Cavern") >= 2;
    },
    unlocked() {
        return towns[MTOLYMPUS].getLevel("Cavern") >= 20;
    },
    finish() {
        towns[MTOLYMPUS].finishRegular(this.varName, 10, () => {
            const statToAdd = statList[Math.floor(Math.random() * statList.length)];
            stats[statToAdd].soulstone +=  Math.floor(getSkillBonus("Divine"));
            view.updateSoulstones();
        });
    },
});

function adjustMineSoulstones() {
    let town = towns[MTOLYMPUS];
    let baseMine = town.getLevel("Cavern") * 3;
    town.totalMineSoulstones = Math.floor(baseMine * getSkillMod("Spatiomancy", 700, 900, .5) + baseMine * getSurveyBonus(town));
}

Action.HuntTrolls = new MultipartAction("Hunt Trolls", {
    type: "multipart",
    expMult: 1.5,
    townNum: 3,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MTOLYMPUS].totalHuntTrolls >= 1;
            case 2:
                return storyReqs.slay10TrollsInALoop;
        }
        return false;
    },
    stats: {
        Str: 0.3,
        Dex: 0.3,
        Con: 0.2,
        Per: 0.1,
        Int: 0.1
    },
    skills: {
        Combat: 1000
    },
    loopStats: ["Per", "Con", "Dex", "Str", "Int"],
    manaCost() {
        return 8000;
    },
    loopCost(segment) {
        return precision3(Math.pow(2, Math.floor((towns[this.townNum].HuntTrollsLoopCounter + segment) / this.segments + 0.0000001)) * 1e6);
    },
    tickProgress(offset) {
        return (getSelfCombat() * (1 + getLevel(this.loopStats[(towns[MTOLYMPUS].HuntTrollsLoopCounter + offset) % this.loopStats.length]) / 100) * Math.sqrt(1 + towns[MTOLYMPUS].totalHuntTrolls / 100));
    },
    loopsFinished() {
        handleSkillExp(this.skills);
        addResource("blood", 1);
        if (resources.blood >= 10) unlockStory("slay10TrollsInALoop");
    },
    segmentFinished() {
        handleSkillExp(this.skills);
    },
    getPartName() {
        return "Hunt Troll";
    },
    visible() {
        return towns[MTOLYMPUS].getLevel("Cavern") >= 5;
    },
    unlocked() {
        return towns[MTOLYMPUS].getLevel("Cavern") >= 50;
    },
    finish() {
        //handleSkillExp(this.skills);
    },
});

Action.CheckWalls = new Action("Check Walls", {
    type: "progress",
    expMult: 1,
    townNum: 3,
    varName: "Illusions",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 1;
            case 2:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 10;
            case 3:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 20;
            case 4:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 40;
            case 5:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 60;
            case 6:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 70;
            case 7:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 80;
            case 8:
                return towns[MTOLYMPUS].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Spd: 0.1,
        Dex: 0.1,
        Per: 0.4,
        Int: 0.4
    },
    manaCost() {
        return 3000;
    },
    visible() {
        return towns[MTOLYMPUS].getLevel("Cavern") >= 40;
    },
    unlocked() {
        return towns[MTOLYMPUS].getLevel("Cavern") >= 80;
    },
    finish() {
        towns[MTOLYMPUS].finishProgress(this.varName, 100);
    },
});

Action.TakeArtifacts = new Action("Take Artifacts", {
    type: "limited",
    expMult: 1,
    townNum: 3,
    varName: "Artifacts",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return towns[MTOLYMPUS][`good${this.varName}`] >= 1;
            case 2:
                return towns[MTOLYMPUS][`good${this.varName}`] >= 20;
        }
        return false;
    },
    stats: {
        Spd: 0.2,
        Per: 0.6,
        Int: 0.2,
    },
    manaCost() {
        return 1500;
    },
    visible() {
        return towns[MTOLYMPUS].getLevel("Illusions") >= 1;
    },
    unlocked() {
        return towns[MTOLYMPUS].getLevel("Illusions") >= 5;
    },
    finish() {
        towns[MTOLYMPUS].finishRegular(this.varName, 25, () => {
            addResource("artifacts", 1);
        });
    },
});
function adjustArtifacts() {
    let town = towns[MTOLYMPUS];
    let baseArtifacts = town.getLevel("Illusions") * 5;
    town.totalArtifacts = Math.floor(baseArtifacts * getSkillMod("Spatiomancy", 800, 1000, .5) + baseArtifacts * getSurveyBonus(town));
}

Action.ImbueMind = new MultipartAction("Imbue Mind", {
    type: "multipart",
    expMult: 5,
    townNum: 3,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.imbueMindThirdSegmentReached || getBuffLevel("Imbuement") >= 1;
            case 2:
                return getBuffLevel("Imbuement") >= 1;
        }
        return false;
    },
    stats: {
        Spd: 0.1,
        Per: 0.1,
        Int: 0.8
    },
    loopStats: ["Spd", "Per", "Int"],
    manaCost() {
        return 500000;
    },
    allowed() {
        return 1;
    },
    canStart() {
        return towns[MTOLYMPUS].ImbueMindLoopCounter === 0 && checkSoulstoneSac(this.goldCost()) && getBuffLevel("Imbuement") < parseInt(document.getElementById("buffImbuementCap").value);
    },
    loopCost(segment) {
        return 100000000 * (segment * 5 + 1);
    },
    tickProgress(offset) {
        return getSkillLevel("Magic") * (1 + getLevel(this.loopStats[(towns[MTOLYMPUS].ImbueMindLoopCounter + offset) % this.loopStats.length]) / 100);
    },
    loopsFinished() {
        sacrificeSoulstones(this.goldCost());
        trainingLimits++;
        addBuffAmt("Imbuement", 1);
        view.updateSoulstones();
        view.adjustGoldCost("ImbueMind", this.goldCost());
    },
    getPartName() {
        return "Imbue Mind";
    },
    visible() {
        return towns[MTOLYMPUS].getLevel("Illusions") >= 50;
    },
    unlocked() {
        return towns[MTOLYMPUS].getLevel("Illusions") >= 70 && getSkillLevel("Magic") >= 300;
    },
    goldCost() {
        return 20 * (getBuffLevel("Imbuement") + 1);
    },
    finish() {
        view.updateBuff("Imbuement");
        if (options.autoMaxTraining) capAllTraining();
        if (towns[MTOLYMPUS].ImbueMindLoopCounter >= 0) unlockStory("imbueMindThirdSegmentReached");
    },
});

Action.ImbueBody = new MultipartAction("Imbue Body", {
    type: "multipart",
    expMult: 5,
    townNum: 3,
    stats: {
        Dex: 0.1,
        Str: 0.1,
        Con: 0.8
    },
    loopStats: ["Dex", "Str", "Con"],
    manaCost() {
        return 500000;
    },
    allowed() {
        return 1;
    },
    canStart() {
        let tempCanStart = true;
        for (const stat in stats) {
            if (getTalent(stat) < getBuffLevel("Imbuement2") + 1) tempCanStart = false;
        }
        return towns[MTOLYMPUS].ImbueBodyLoopCounter === 0 && (getBuffLevel("Imbuement") > getBuffLevel("Imbuement2")) && tempCanStart;
    },
    loopCost(segment) {
        return 100000000 * (segment * 5 + 1);
    },
    tickProgress(offset) {
        return getSkillLevel("Magic") * (1 + getLevel(this.loopStats[(towns[MTOLYMPUS].ImbueBodyLoopCounter + offset) % this.loopStats.length]) / 100);
    },
    loopsFinished() {
        for (const stat in stats) {
            let targetTalentLevel = getTalent(stat) - getBuffLevel("Imbuement2") - 1;
            stats[stat].talent = getExpOfLevel(targetTalentLevel); 
        }
        view.updateStats();
        addBuffAmt("Imbuement2", 1);
        view.adjustGoldCost("ImbueBody", this.goldCost());
    },
    getPartName() {
        return "Imbue Body";
    },
    visible() {
        return getBuffLevel("Imbuement") > 1;
    },
    unlocked() {
        return getBuffLevel("Imbuement") > getBuffLevel("Imbuement2");
    },
    goldCost() {
        return getBuffLevel("Imbuement2") + 1;
    },
    finish() {
        view.updateBuff("Imbuement2");
    },
});

Action.FaceJudgement = new Action("Face Judgement", {
    type: "normal",
    expMult: 2,
    townNum: 3,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.judgementFaced;
            case 2:
                return storyReqs.acceptedIntoValhalla;
            case 3:
                return storyReqs.castIntoShadowRealm;
        }
        return false;
    },
    stats: {
        Cha: 0.3,
        Luck: 0.2,
        Soul: 0.5,
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 30000;
    },
    visible() {
        return towns[MTOLYMPUS].getLevel("Mountain") >= 40;
    },
    unlocked() {
        return towns[MTOLYMPUS].getLevel("Mountain") >= 100;
    },
    finish() {
        unlockStory("judgementFaced");
        if (resources.reputation >= 50) {
            unlockStory("acceptedIntoValhalla");
            unlockTown(4);
        } else if (resources.reputation <= -50) {
            unlockStory("castIntoShadowRealm");
            unlockTown(5);
        }
    },
});

Action.Guru = new Action("Guru", {
    type: "normal",
    expMult: 1,
    townNum: 3,
    stats: {
        Cha: 0.5,
        Soul: 0.5
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 100000;
    },
    cost() {
        addResource("herbs", -1000);
    },
    canStart() {
        return resources.herbs >= 1000;
    },
    visible() {
        return getExploreProgress() >= 100;
    },
    unlocked() {
        return getExploreProgress() >= 100;
    },
    finish() {
        unlockTown(4);
    },
});

//====================================================================================================
//Zone 5 - Valhalla
//====================================================================================================
Action.GuidedTour = new Action("Guided Tour", {
    type: "progress",
    expMult: 1,
    townNum: 4,
    varName: "Tour",
    stats: {
        Per: 0.3,
        Con: 0.2,
        Cha: 0.3,
        Int: 0.1,
        Luck: 0.1
    },
    canStart() {
        return resources.gold >= 10;
    },
    cost() {
        addResource("gold", -10);
    },
    manaCost() {
        return 2500;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
        towns[VALHALLA].finishProgress(this.varName, 100 * (resources.glasses ? 2 : 1));
    },
});

Action.Canvass = new Action("Canvass", {
    type: "progress",
    expMult: 1,
    townNum: 4,
    varName: "Canvassed",
    stats: {
        Con: 0.1,
        Cha: 0.5,
        Spd: 0.2,
        Luck: 0.2
    },
    manaCost() {
        return 4000;
    },
    visible() {
        return true;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 10;
    },
    finish() {
        towns[VALHALLA].finishProgress(this.varName, 50);
    },
});

Action.Donate = new Action("Donate", {
    type: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Per: 0.2,
        Cha: 0.2,
        Spd: 0.2,
        Int: 0.4,
    },
    canStart() {
        return resources.gold >= 20;
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return true;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Canvassed") >= 5;
    },
    finish() {
        addResource("gold", -20);
        addResource("reputation", 1);
    },
});

Action.AcceptDonations = new Action("Accept Donations", {
    type: "limited",
    expMult: 1,
    townNum: 4,
    varName: "Donations",
    stats: {
        Con: 0.1,
        Cha: 0.2,
        Spd: 0.3,
        Luck: 0.4
    },
    canStart() {
        return resources.reputation > 0;
    },
    cost() {
        addResource("reputation", -1);
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return true;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Canvassed") >= 5;
    },
    finish() {
        towns[VALHALLA].finishRegular(this.varName, 5, () => {
            addResource("gold", 20);
            return 20;
        });
    },
});

function adjustDonations() {
    let town = towns[VALHALLA];
    let base = town.getLevel("Canvassed") * 5;
    town.totalDonations = Math.floor(base * getSkillMod("Spatiomancy", 900, 1100, .5) + base * getSurveyBonus(town));
}

Action.TidyUp = new MultipartAction("Tidy Up", {
    type: "multipart",
    expMult: 1,
    townNum: 4,
    varName: "Tidy",
    stats: {
        Spd: 0.3,
        Dex: 0.3,
        Str: 0.2,
        Con: 0.2,
    },
    loopStats: ["Str", "Dex", "Spd", "Con"],
    manaCost() {
        return 10000;
    },
    loopCost(segment) {
        return fibonacci(Math.floor((towns[VALHALLA].TidyLoopCounter + segment) - towns[VALHALLA].TidyLoopCounter / 3 + 0.0000001)) * 1000000; // Temp.
    },
    tickProgress(offset) {
        return (1 + getLevel(this.loopStats[(towns[VALHALLA].TidyLoopCounter + offset) % this.loopStats.length]) / 100) * Math.sqrt(1 + towns[VALHALLA].totalTidy / 100);
    },
    loopsFinished() {
        addResource("reputation", 1);
        addResource("gold", 5);
    },
    segmentFinished() {
        // empty.
    },
    getPartName() {
        return `${_txt(`actions>${getXMLName(this.name)}>label_part`)} ${numberToWords(Math.floor((towns[VALHALLA].TidyLoopCounter + 0.0001) / this.segments + 1))}`;
    },
    visible() {
        return towns[VALHALLA].getLevel("Canvassed") >= 10;
    },
    unlocked(){
        return towns[VALHALLA].getLevel("Canvassed") >= 30;
    },
    finish(){
        // empty
    },
});

Action.BuyManaZ5 = new Action("Buy Mana Z5", {
    type: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Cha: 0.7,
        Int: 0.2,
        Luck: 0.1
    },
    manaCost() {
        return 100;
    },
    canStart() {
        return !portalUsed;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    goldCost() {
        return Math.floor(50 * getSkillBonus("Mercantilism"));
    },
    finish() {
        addMana(resources.gold * this.goldCost());
        resetResource("gold");
    },
});

Action.SellArtifact = new Action("Sell Artifact", {
    type: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Cha: 0.4,
        Per: 0.3,
        Luck: 0.2,
        Soul: 0.1
    },
    canStart() {
        return resources.artifacts >= 1;
    },
    cost() {
        addResource("artifacts", -1);
    },
    manaCost() {
        return 500;
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 10;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 20;
    },
    finish() {
        addResource("gold", 50);
    },
});

Action.GiftArtifact = new Action("Gift Artifact", {
    type: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Cha: 0.6,
        Luck: 0.3,
        Soul: 0.1
    },
    canStart() {
        return resources.artifacts >= 1;
    },
    cost() {
        addResource("artifacts", -1);
    },
    manaCost() {
        return 500;
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 10;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 20;
    },
    finish() {
        addResource("favors", 1);
    },
});

Action.Mercantilism = new Action("Mercantilism", {
    type: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Per: 0.2, // Temp
        Int: 0.7,
        Soul: 0.1
    },
    skills: {
        Mercantilism: 100
    },
    canStart() {
        return resources.reputation > 0;
    },
    manaCost() {
        return 10000; // Temp
    },
    cost() {
        addResource("reputation", -1);
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 20;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 30;
    },
    finish() {
        handleSkillExp(this.skills);
        view.adjustManaCost("Buy Mana Z1");
        view.adjustManaCost("Buy Mana Z3");
        view.adjustManaCost("Buy Mana Z5");
    },
});

Action.CharmSchool = new Action("Charm School", {
    type: "normal",
    expMult: 4,
    townNum: 4,
    stats: {
        Cha: 0.8,
        Int: 0.2
    },
    allowed() {
        return trainingLimits;
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 20;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 30;
    },
    finish() {
        // empty
    },
});

Action.Oracle = new Action("Oracle", {
    type: "normal",
    expMult: 4,
    townNum: 4,
    stats: {
        Luck: 0.8,
        Soul: 0.2
    },
    allowed() {
        return trainingLimits;
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 30;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 40;
    },
    finish() {
		
    },
});

Action.EnchantArmor = new Action("Enchant Armor", {
    tytpe: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Cha: 0.6,
        Int: 0.2,
        Luck: 0.2
    },
    skills: {
        Crafting: 50
    },
    manaCost() {
        return 1000; // Temp
    },
    canStart() {
        return resources.favors >= 1 && resources.armor >= 1;
    },
    cost() {
        addResource("favors", -1);
        addResource("armor", -1);
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 30;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 40;
    },
    finish() {
        handleSkillExp(this.skills);
        addResource("enchantments", 1);
    },
});

Action.WizardCollege = new MultipartAction("Wizard College", {
    type: "multipart",
    expMult: 1,
    townNum: 4,
    varName: "wizCollege",
    stats: {
        Int: 0.5,
        Soul: 0.3,
        Cha: 0.2
    },
    loopStats: ["Int", "Cha", "Soul"],
    manaCost() {
        return 10000;
    },
    allowed() {
        return 1;
    },
    canStart() {
        return resources.gold >= 500 && resources.favors >= 10;
    },
    cost() {
        addResource("gold", -500);
        addResource("favors", -10);
    },
    loopCost(segment) {
        return precision3(Math.pow(1.3, towns[VALHALLA][`${this.varName}LoopCounter`] + segment)) * 1e7; // Temp
    },
    tickProgress(offset) {
        return (
            getSkillLevel("Magic") +
            getSkillLevel("Chronomancy") + getSkillLevel("Pyromancy") + getSkillLevel("Restoration") + getSkillLevel("Spatiomancy")) * 
            (1 + getLevel(this.loopStats[(towns[VALHALLA][`${this.varName}LoopCounter`] + offset) % this.loopStats.length]) / 100) * 
            Math.sqrt(1 + towns[VALHALLA][`total${this.varName}`] / 1000);
    },
    loopsFinished() {
        // empty.
    },
    segmentFinished() {
        curWizCollegeSegment++;
        view.adjustManaCost("Restoration");
        view.adjustManaCost("Spatiomancy");
    }, 
    getPartName() {
        return `${getWizCollegeRank().name}`;
    },
    getSegmentName(segment) {
        return `${getWizCollegeRank(segment % 3).name}`;
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 40;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 60;
    },
    finish() {
        //guild = "Wizard";
    },
});
function getWizCollegeRank(offset) {
    let name = [
        "Initiate",
        "Student",
        "Apprentice",
        "Disciple",
        "Spellcaster",
        "Magician",
        "Wizard",
        "Great Wizard",
        "Grand Wizard",
        "Archwizard",
        "Sage",
        "Great Sage",
        "Grand Sage",
        "Archsage",
        "Magus",
        "Great Magus",
        "Grand Magus",
        "Archmagus",
        "Member of The Council of the Seven",
        "Chair of The Council of the Seven"][Math.floor(curWizCollegeSegment / 3 + 0.00001)];
    const segment = (offset === undefined ? 0 : offset - (curWizCollegeSegment % 3)) + curWizCollegeSegment;
    let bonus = precision3(1 + 0.02 * Math.pow(segment, 1.05));
    if (name) {
        if (offset === undefined) {
            name += ["-", "", "+"][curWizCollegeSegment % 3];
        } else {
            name += ["-", "", "+"][offset % 3];
        }
    } else {
        name = "Merlin";
        bonus = 5;
    }
    name += `, Mult x${bonus}`;
    return { name, bonus };
}

Action.Restoration = new Action("Restoration", {
    type: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Int: 0.5,
        Soul: 0.3,
        Con: 0.2
    },
    affectedBy: ["Wizard College"],
    skills: {
        Restoration: 100
    },
    manaCost() {
        return 15000 / getWizCollegeRank().bonus;
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 40;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 60;
    },
    finish() {
        handleSkillExp(this.skills);
    },
});

Action.Spatiomancy = new Action("Spatiomancy", {
    type: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Int: 0.7,
        Con: 0.2,
        Per: 0.1,
        Spd: 0.1,
    },
    affectedBy: ["Wizard College"],
    skills: {
        Spatiomancy: 100
    },
    manaCost() {
        return 20000 / getWizCollegeRank().bonus;
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 40;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 60;
    },
    finish() {
        handleSkillExp(this.skills);
        view.adjustManaCost("Mana Geyser");
        view.adjustManaCost("Mana Well");
        adjustAll();
        for (const action of totalActionList) {
            if (towns[action.townNum].varNames.indexOf(action.varName) !== -1) {
                view.updateRegular(action.varName, action.townNum);
            }
        }
    },
});

Action.SeekCitizenship = new Action("Seek Citizenship", {
    type: "progress",
    expMult: 1,
    townNum: 4,
    varName: "Citizen",
    stats: {
        Cha: 0.5,
        Int: 0.2,
        Luck: 0.2,
        Per: 0.1
    },
    manaCost() {
        return 1500; // Temp
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 60;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 80;
    },
    finish() {
        towns[VALHALLA].finishProgress(this.varName, 100);
    },
});

Action.BuildHousing = new Action("Build Housing", {
    type: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Str: 0.4,
        Con: 0.3,
        Dex: 0.2,
        Spd: 0.1
    },
    skills: {
        Crafting: 100
    },
    affectedBy: ["Crafting Guild"],
    canStart() {
        let maxHouses = Math.floor(getCraftGuildRank().bonus * getSkillMod("Spatiomancy",0,500,1));
        return guild === "Crafting" && towns[VALHALLA].getLevel("Citizen") >= 100 && resources.houses < maxHouses;
    },
    manaCost() {
        return 2000;
    },
    visible() {
        return towns[VALHALLA].getLevel("Citizen") >= 80;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Citizen") >= 100;
    },
    finish() {
        addResource("houses", 1);
        handleSkillExp(this.skills);
    },
});

Action.CollectTaxes = new Action("Collect Taxes", {
    type: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Cha: 0.4,
        Spd: 0.2,
        Per: 0.2,
        Luck: 0.2
    },
    affectedBy: ["Build Housing"],
    canStart() {
        return resources.houses > 0;
    },
    allowed () {
        return 1;
    },
    manaCost() {
        return 10000;
    },
    visible() {
        return towns[VALHALLA].getLevel("Citizen") >= 60;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Citizen") >= 100 && getSkillLevel("Mercantilism") > 0;
    },
    finish() {
        const goldGain = Math.floor(resources.houses * getSkillLevel("Mercantilism") / 10);
        addResource("gold", goldGain);
        return goldGain;
    },
});

Action.Pegasus = new Action("Pegasus", {
    tytpe: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Soul: 0.3,
        Cha: 0.2,
        Luck: 0.2,
        int: 0.2
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 3000;
    },
    canStart() {
        return resources.gold >= 200 && resources.favors >= 20;
    },
    cost() {
        addResource("favors", -20);
        addResource("gold", -200);
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 70;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 90;
    },
    finish() {
        addResource("pegasus", true);
    },
});

Action.GreatFeast = new MultipartAction("Great Feast", {
    type: "multipart",
    expMult: 5,
    townNum: 4,
    stats: {
        Spd: 0.1,
        Int: 0.1,
        Soul: 0.8
    },
    loopStats: ["Spd", "Int", "Soul"],
    manaCost() {
        return 5000000;
    },
    allowed() {
        return 1;
    },
    canStart() {
        return resources.reputation >= 100 && towns[this.townNum].GreatFeastLoopCounter === 0 && checkSoulstoneSac(this.goldCost()) && getBuffLevel("Feast") < parseInt(document.getElementById("buffFeastCap").value);
    },
    loopCost(segment) {
        return 1000000000 * (segment * 5 + 1);
    },
    tickProgress(offset) {
        return (1 + getLevel(this.loopStats[(towns[VALHALLA].GreatFeastLoopCounter + offset) % this.loopStats.length]) / 100);
    },
    loopsFinished() {
        sacrificeSoulstones(this.goldCost());
        addBuffAmt("Feast", 1);
        view.updateSoulstones();
        view.adjustGoldCost("GreatFeast", this.goldCost());
    },
    getPartName() {
        return "Host Great Feast";
    },
    visible() {
        return towns[VALHALLA].getLevel("Tour") >= 80;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Tour") >= 100;
    },
    goldCost() {
        return Math.ceil(5000 * (getBuffLevel("Feast") + 1) * getSkillBonus("Gluttony"));
    },
    finish() {
        view.updateBuff("Feast");
    },
});


Action.FightFrostGiants = new MultipartAction("Fight Frost Giants", {
    type: "multipart",
    expMult: 1,
    townNum: 4,
    varName: "FightFrostGiants",
    stats: {
        Str: 0.5,
        Con: 0.3,
        Per: 0.2,
    },
    skills: {
        Combat: 1250
    },
    loopStats: ["Per", "Con", "Str"],
    manaCost() {
        return 20000;
    },
    allowed() {
        return 1;
    },
    canStart() {
        return resources.pegasus;
    },
    loopCost(segment) {
        return precision3(Math.pow(1.3, towns[VALHALLA][`${this.varName}LoopCounter`] + segment)) * 1e7; // Temp
    },
    tickProgress(offset) {
        return (getSelfCombat() * 
            (1 + getLevel(this.loopStats[(towns[VALHALLA][`${this.varName}LoopCounter`] + offset) % this.loopStats.length]) / 100) * 
            Math.sqrt(1 + towns[VALHALLA][`total${this.varName}`] / 1000));
    },
    loopsFinished() {
        handleSkillExp(this.skills);
    },
    segmentFinished() {
        curFightFrostGiantsSegment++;
        handleSkillExp(this.skills);
        // Additional thing?
    }, 
    getPartName() {
        return `${getFrostGiantsRank().name}`;
    },
    getSegmentName(segment) {
        return `${getFrostGiantsRank(segment % 3).name}`;
    },
    visible() {
        return towns[VALHALLA].getLevel("Citizen") >= 80;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Citizen") >= 100;
    },
    finish() {
    },
});
function getFrostGiantsRank(offset) {
    let name = [
        "Private",
        "Corporal",
        "Specialist",
        "Sergeant",
        "Staff Sergeant",
        "Sergeant First Class",
        "Master Sergeant",
        "Sergeant Major",
        "Warrant Officer",
        "Chief Warrant Officer",
        "Second Lieutenant",
        "First Lieutenant",
        "Major",
        "Lieutenant Colonel",
        "Colonel",
        "Lieutenant Commander",
        "Commander",
        "Captain",
        "Rear Admiral",
        "Vice Admiral"][Math.floor(curFightFrostGiantsSegment / 3 + 0.00001)];
    const segment = (offset === undefined ? 0 : offset - (curFightFrostGiantsSegment % 3)) + curFightFrostGiantsSegment;
    let bonus = precision3(1 + 0.05 * Math.pow(segment, 1.05));
    if (name) {
        if (offset === undefined) {
            name += ["-", "", "+"][curFightFrostGiantsSegment % 3];
        } else {
            name += ["-", "", "+"][offset % 3];
        }
    } else {
        name = "Admiral";
        bonus = 10;
    }
    name += `, Mult x${bonus}`;
    return { name, bonus };
}

Action.SeekBlessing = new Action("Seek Blessing", {
    type: "normal",
    expMult: 1,
    townNum: 4,
    stats: {
        Cha: 0.5,
        Luck: 0.5
    },
    skills: {
        Divine: 50
    },
    canStart() {
        return resources.pegasus;
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 1000000;
    },
    visible() {
        return towns[VALHALLA].getLevel("Citizen") >= 80;
    },
    unlocked() {
        return towns[VALHALLA].getLevel("Citizen") >= 100;
    },
    finish() {
        this.skills.Divine = Math.floor(50 * getFrostGiantsRank().bonus);
        handleSkillExp(this.skills);
    },
});

Action.FallFromGrace = new Action("Fall From Grace", {
    type: "normal",
    expMult: 2,
    townNum: 4,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return storyReqs.fellFromGrace;
        }
        return false;
    },
    stats: {
        Dex: 0.4,
        Luck: 0.3,
        Spd: 0.2,
        Int: 0.1,
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 30000;
    },
    visible() {
        return true;
    },
    unlocked() {
        return getSkillLevel("Pyromancy") >= 200;
    },
    finish() {
        if (resources.reputation >= 0) resources.reputation = -1;
        view.updateResource('reputation');
        unlockStory("fellFromGrace");
        unlockTown(5);
    },
});

//====================================================================================================
//Zone 6 - Startington
//====================================================================================================
Action.Meander = new Action("Meander", {
    type: "progress",
    expMult: 1,
    townNum: 5,
    stats: {
        Per: 0.2,
        Con: 0.2,
        Cha: 0.2,
        Spd: 0.3,
        Luck: 0.1
    },
    affectedBy: ["Imbue Mind"],
    manaCost() {
        return 2500;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
        towns[STARTINGTOWN].finishProgress(this.varName, getBuffLevel("Imbuement"));
    }
});
function adjustPylons() {
    let town = towns[STARTINGTOWN];
    let base = town.getLevel("Meander") * 10;
    town.totalPylons = Math.floor(base * getSkillMod("Spatiomancy", 1000, 1200, .5) + base * getSurveyBonus(town));
}

Action.ManaWell = new Action("Mana Well", {
    type: "limited",
    expMult: 1,
    townNum: 5,
    varName: "Wells",
    stats: {
        Str: 0.6,
        Per: 0.3,
        Int: 0.1,
    },
    manaCost() {
        return Math.ceil(2500 * getSkillBonus("Spatiomancy"));
    },
    canStart() {
        return true;
    },
    visible() {
        return true;
    },
    unlocked() {
        return towns[STARTINGTOWN].getLevel("Meander") >= 2;
    },
    finish() {
        towns[STARTINGTOWN].finishRegular(this.varName, 100, () => {
        let wellMana = Math.max(5000 - Math.floor(10 * effectiveTime), 0);
        addMana(wellMana);
        return wellMana;
        });
    },
});
function adjustWells() {
    let town = towns[STARTINGTOWN];
    let base = town.getLevel("Meander") * 10;
    town.totalWells = Math.floor(base + base * getSurveyBonus(town));
}

Action.DestroyPylons = new Action("Destroy Pylons", {
    type: "limited",
    expMult: 1,
    townNum: 5,
    varName: "Pylons",
    stats: {
        Str: 0.4,
        Dex: 0.3,
        Int: 0.3
    },
    manaCost() {
        return 10000;
    },
    visible() {
        return towns[STARTINGTOWN].getLevel("Meander") >= 1;
    },
    unlocked() {
        return towns[STARTINGTOWN].getLevel("Meander") >= 5;
    },
    finish() {
        towns[STARTINGTOWN].finishRegular(this.varName, 100, () => {
            addResource("pylons", 1);
            view.adjustManaCost("The Spire");
            return 1;
        });
    },
});

Action.RaiseZombie = new Action("Raise Zombie", {
    type: "normal",
    expMult: 1,
    townNum: 5,
    stats: {
        Con: 0.4,
        Int: 0.3,
        Soul: 0.3
    },
    canStart() {
        return resources.blood >= 1;
    },
    cost() {
        addResource("blood", -1);
    },
    manaCost() {
        return 10000;
    },
    visible() {
        return towns[STARTINGTOWN].getLevel("Meander") >= 15;
    },
    unlocked() {
        return false;
    },
    finish() {
        handleSkillExp(this.skills);
        addResource("zombie", 1);
    },
});

Action.DarkSacrifice = new Action("Dark Sacrifice", {
    type: "normal",
    expMult: 1,
    townNum: 5,
    stats: {
        Int: 0.2,
        Soul: 0.8
    },
    skills: {
        Commune: 100
    },
    canStart() {
        return resources.blood >= 1;
    },
    cost() {
        addResource("blood", -1);
    },
    manaCost() {
        return 20000;
    },
    visible() {
        return towns[STARTINGTOWN].getLevel("Meander") >= 25;
    },
    unlocked() {
        return false;
    },
    finish() {
        handleSkillExp(this.skills);
        //view.adjustGoldCost("DarkRitual", Action.DarkRitual.goldCost());
    },
});

Action.TheSpire = new DungeonAction("The Spire", 2, {
    type: "multipart",
    expMult: 1,
    townNum: 5,
    varName: "TheSpire",
    stats: {
        Str: 0.1,
        Dex: 0.1,
        Spd: 0.1,
        Con: 0.1,
        Per: 0.2,
        Int: 0.2,
        Soul: 0.2
    },
    skills: {
        Combat: 100
    },
    loopStats: ["Per", "Int", "Con", "Spd", "Dex", "Per", "Int", "Str", "Soul"],
    affectedBy: ["Team"],
    manaCost() {
        return 100000 * Math.pow(0.9,resources.pylons);
    },
    canStart() {
        const curFloor = Math.floor((towns[this.townNum].TheSpireLoopCounter) / this.segments + 0.0000001);
        return curFloor < dungeons[this.dungeonNum].length;
    },
    loopCost(segment) {
        return precision3(Math.pow(2, Math.floor((towns[this.townNum].TheSpireLoopCounter + segment) / this.segments + 0.0000001)) * 1e7);
    },
    tickProgress(offset) {
        const floor = Math.floor((towns[this.townNum].TheSpireLoopCounter) / this.segments + 0.0000001);
        return getTeamCombat() *
        (1 + getLevel(this.loopStats[(towns[this.townNum].TheSpireLoopCounter + offset) % this.loopStats.length]) / 100) *
        Math.sqrt(1 + dungeons[this.dungeonNum][floor].completed / 200);
    },
    loopsFinished() {
        const curFloor = Math.floor((towns[this.townNum].TheSpireLoopCounter) / this.segments + 0.0000001 - 1);
        finishDungeon(this.dungeonNum, curFloor);
        if (curFloor >= getBuffLevel("Aspirant")) addBuffAmt("Aspirant", 1);
    },
    visible() {
        return towns[STARTINGTOWN].getLevel("Meander") >= 5;
    },
    unlocked() {
        return (getSkillLevel("Combat") + getSkillLevel("Magic")) >= 35;
    },
    finish() {
        handleSkillExp(this.skills);
        view.updateBuff("Aspirant");
    },
});

Action.PurchaseSupplies = new Action("Purchase Supplies", {
    type: "normal",
    expMult: 1,
    townNum: 5,
    stats: {
        Cha: 0.8,
        Luck: 0.1,
        Soul: 0.1
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 2000;
    },
    canStart() {
        return resources.gold >= 500 && !resources.supplies;
    },
    cost() {
        addResource("gold", -500);
    },
    visible() {
        return towns[STARTINGTOWN].getLevel("Meander") >= 50;
    },
    unlocked() {
        return towns[STARTINGTOWN].getLevel("Meander") >= 75;
    },
    finish() {
        addResource("supplies", true);
    },
});

Action.DeadTrial = new TrialAction("Dead Trial", 4, {
    type: "multipart",
    expMult: 0.25,
    townNum: 5,
    stats: {
        Cha: 0.25,
        Int: 0.25,
        Luck: 0.25,
        Soul: 0.25
    },
    loopStats: ["Cha", "Int", "Luck", "Soul"],
    affectedBy: ["RaiseZombie"],
    floorScaling: 2, //Difficulty is raised to this exponent each floor
    baseScaling: 1e9, //Difficulty is multiplied by this number each floor
    manaCost() {
        return 100000;
    },
    baseProgress() {
        //Determines what skills give progress to the trial
		return 1;
        //return getSkillLevel("Dark") * resources.zombie / 2;
    },
    floorReward() {
        //Rewards given per floor
        addResource("zombie", 1);
    },
    canStart() {
        return this.currentFloor() < trialFloors[this.trialNum];
    },
    /*loopCost(segment) {
        return precision3(Math.pow(this.floorScaling, Math.floor((towns[this.townNum][`${this.varName}LoopCounter`] + segment) / this.segments + 0.0000001)) * this.baseScaling);
    },*/
    /*tickProgress(offset) {
        const floor = Math.floor((towns[this.townNum][`${this.varName}LoopCounter`]) / this.segments + 0.0000001);
        return this.baseProgress() *
            (1 + getLevel(this.loopStats[(towns[this.townNum][`${this.varName}LoopCounter`] + offset) % this.loopStats.length]) / 100) *
            Math.sqrt(1 + trials[this.trialNum][floor].completed / 200);
    },*/
    /*loopsFinished() {
        const curFloor = Math.floor((towns[this.townNum][`${this.varName}LoopCounter`]) / this.segments + 0.0000001 - 1);
        trials[this.trialNum][curFloor].completed++;
        if (curFloor + 1 > trials[this.trialNum].highestFloor || trials[this.trialNum].highestFloor === undefined) trials[this.trialNum].highestFloor = curFloor + 1;
        view.updateTrialInfo(this.trialNum, curFloor + 1);
        this.floorReward();
    },*/
    visible() {
        return towns[this.townNum].getLevel("Survey") >= 100;
    },
    unlocked() {
        return towns[this.townNum].getLevel("Survey") >= 100;
    },
    finish() {
    },
});

Action.JourneyForth = new Action("Journey Forth", {
    type: "normal",
    expMult: 2,
    townNum: 5,
    stats: {
        Con: 0.4,
        Per: 0.3,
        Spd: 0.3
    },
    allowed() {
        return getNumOnList("Open Portal") > 0 ? 2 : 1;
    },
    manaCost() {
        return 20000;
    },
    canStart() {
        return resources.supplies;
    },
    cost() {
        addResource("supplies", false);
    },
    visible() {
        return towns[STARTINGTOWN].getLevel("Meander") >= 75;
    },
    unlocked() {
        return towns[STARTINGTOWN].getLevel("Meander") >= 100;
    },
    finish() {
        unlockTown(6);
    },
});

//====================================================================================================
//Zone 7 - Jungle Path
//====================================================================================================
Action.ExploreJungle = new Action("Explore Jungle", {
    type: "progress",
    expMult: 1,
    townNum: 6,
    stats: {
        Per: 0.2,
        Con: 0.2,
        Cha: 0.2,
        Spd: 0.3,
        Luck: 0.1
    },
    affectedBy: ["Fight Jungle Monsters"],
    manaCost() {
        return 25000;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
        towns[JUNGLEPATH].finishProgress(this.varName, 20 * getFightJungleMonstersRank().bonus);
        addResource("herbs", 1);
    }
});

Action.FightJungleMonsters = new MultipartAction("Fight Jungle Monsters", {
    type: "multipart",
    expMult: 1,
    townNum: 6,
    varName: "FightJungleMonsters",
    stats: {
        Str: 0.2,
        Dex: 0.3,
        Per: 0.4,
    },
    skills: {
        Combat: 1500
    },
    loopStats: ["Dex", "Str", "Per"],
    manaCost() {
        return 30000;
    },
    canStart() {
        return true;
    },
    loopCost(segment) {
        return precision3(Math.pow(1.3, towns[JUNGLEPATH][`${this.varName}LoopCounter`] + segment)) * 1e8; // Temp
    },
    tickProgress(offset) {
        return (getSelfCombat() * 
            (1 + getLevel(this.loopStats[(towns[JUNGLEPATH][`${this.varName}LoopCounter`] + offset) % this.loopStats.length]) / 100) * 
            Math.sqrt(1 + towns[JUNGLEPATH][`total${this.varName}`] / 1000));
    },
    loopsFinished() {
        handleSkillExp(this.skills);
    },
    segmentFinished() {
        handleSkillExp(this.skills);
    },
    segmentFinished() {
        curFightJungleMonstersSegment++;
        addResource("hide", 1);
        // Additional thing?
    }, 
    getPartName() {
        return `${getFightJungleMonstersRank().name}`;
    },
    getSegmentName(segment) {
        return `${getFightJungleMonstersRank(segment % 3).name}`;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
    },
});
function getFightJungleMonstersRank(offset) {
    let name = [
        "Frog",
        "Toucan",
        "Sloth",
        "Pangolin",
        "Python",
        "Tapir",
        "Okapi",
        "Bonobo",
        "Jaguar",
        "Chimpanzee",
        "Annaconda",
        "Lion",
        "Tiger",
        "Bear",
        "Crocodile",
        "Rhino",
        "Gorilla",
        "Hippo",
        "Elephant"][Math.floor(curFightJungleMonstersSegment / 3 + 0.00001)];
    const segment = (offset === undefined ? 0 : offset - (curFightJungleMonstersSegment % 3)) + curFightJungleMonstersSegment;
    let bonus = precision3(1 + 0.05 * Math.pow(segment, 1.05));
    if (name) {
        if (offset === undefined) {
            name += ["-", "", "+"][curFightJungleMonstersSegment % 3];
        } else {
            name += ["-", "", "+"][offset % 3];
        }
    } else {
        name = "Stampede";
        bonus = 10;
    }
    name += `, Mult x${bonus}`;
    return { name, bonus };
}

Action.RescueSurvivors = new MultipartAction("Rescue Survivors", {
    type: "multipart",
    expMult: 1,
    townNum: 6,
    varName: "Rescue",
    stats: {
        Per: 0.4,
        Dex: 0.2,
        Cha: 0.2,
        Spd: 0.2
    },
    skills: {
        Restoration: 25
    },
    loopStats: ["Per", "Spd", "Cha"],
    manaCost() {
        return 25000;
    },
    canStart() {
        return true;
    },
    loopCost(segment) {
        return fibonacci(2 + Math.floor((towns[JUNGLEPATH].RescueLoopCounter + segment) / this.segments + 0.0000001)) * 5000;
    },
    tickProgress(offset) {
        return getSkillLevel("Magic") * Math.max(getSkillLevel("Restoration") / 100, 1) * (1 + getLevel(this.loopStats[(towns[JUNGLEPATH].RescueLoopCounter + offset) % this.loopStats.length]) / 100) * Math.sqrt(1 + towns[JUNGLEPATH].totalRescue / 100);
    },
    loopsFinished() {
        addResource("reputation", 4);
    },
    getPartName() {
        return `${_txt(`actions>${getXMLName(this.name)}>label_part`)} ${numberToWords(Math.floor((towns[JUNGLEPATH].RescueLoopCounter + 0.0001) / this.segments + 1))}`;
    },
    visible() {
        return towns[JUNGLEPATH].getLevel("ExploreJungle") >= 10;
    },
    unlocked() {
        return towns[JUNGLEPATH].getLevel("ExploreJungle") >= 20;
    },
    finish() {
        handleSkillExp(this.skills);
    },
});

Action.PrepareBuffet = new Action("Prepare Buffet", {
    type: "normal",
    expMult: 1,
    townNum: 6,
    stats: {
        Con: 0.3,
        Per: 0.1,
        Int: 0.6
    },
    skills: {
        Alchemy: 25,
        Gluttony: 5
    },
    canStart() {
        return resources.herbs >= 10 && resources.hide > 0;
    },
    cost() {
        addResource("herbs", -10);
        addResource("hide", -1);
    },
    manaCost() {
        return 30000;
    },
    visible() {
        return towns[JUNGLEPATH].getLevel("ExploreJungle") >= 20;
    },
    unlocked() {
        return towns[JUNGLEPATH].getLevel("ExploreJungle") >= 20;
    },
    finish() {
        this.skills.Gluttony = Math.floor(towns[JUNGLEPATH].RescueLoopCounter * 5);
        handleSkillExp(this.skills);
    },
});

Action.Totem = new Action("Totem", {
    type: "normal",
    expMult: 1,
    townNum: 6,
    stats: {
        Con: 0.3,
        Per: 0.2,
        Soul: 0.5
    },
    skills: {
        Wunderkind: 100
    },
    canStart() {
        return resources.loopingPotion;
    },
    cost() {
        addResource("loopingPotion", false);
    },
    manaCost() {
        return 30000;
    },
    visible() {
        return towns[JUNGLEPATH].getLevel("ExploreJungle") >= 25;
    },
    unlocked() {
        return towns[JUNGLEPATH].getLevel("ExploreJungle") >= 50;
    },
    finish() {
        handleSkillExp(this.skills);
    },
});

Action.Escape = new Action("Escape", {
    type: "normal",
    expMult: 2,
    townNum: 6,
    stats: {
        Dex: 0.2,
        Spd: 0.8
    },
    allowed() {
        return 1;
    },
    canStart() {
        return effectiveTime < 60;
    },
    manaCost() {
        return 50000;
    },
    visible() {
        return towns[JUNGLEPATH].getLevel("ExploreJungle") >= 75;
    },
    unlocked() {
        return towns[JUNGLEPATH].getLevel("ExploreJungle") >= 100;
    },
    finish() {
        unlockTown(7);
    },
});

Action.OpenPortal = new Action("Open Portal", {
    type: "normal",
    expMult: 1,
    townNum: 6,
    stats: {
        Int: 0.2,
        Luck: 0.1,
        Soul: 0.7
    },
    skills: {
        Restoration: 2500
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 50000;
    },
    visible() {
        return getExploreProgress() >= 75;
    },
    unlocked() {
        return getSkillLevel("Restoration") >= 1000;
    },
    finish() {
        portalUsed = true;
        handleSkillExp(this.skills);
        unlockTown(1);
    },
});

//====================================================================================================
//Zone 8 - Commerceville
//====================================================================================================
Action.Excursion = new Action("Excursion", {
    type: "progress",
    expMult: 1,
    townNum: 7,
    stats: {
        Per: 0.2,
        Con: 0.2,
        Cha: 0.2,
        Spd: 0.3,
        Luck: 0.1
    },
    affectedBy: ["Take Glasses"],
    manaCost() {
        return 25000;
    },
    canStart() {
        return resources.gold > this.goldCost();
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    goldCost() {
        return (guild === "Thieves" || guild === "Explorer") ? 2 : 10;
    },
    finish() {
        towns[COMMERCEVILLE].finishProgress(this.varName, 50 * (resources.glasses ? 2 : 1));
        addResource("gold", guild === "Thieves" ? -2 : -10);
    }
});
function adjustPockets() {
    let town = towns[COMMERCEVILLE];
    let base = town.getLevel("Excursion");
    town.totalPockets = Math.floor(base * getSkillMod("Spatiomancy", 1100, 1300, .5) + base * getSurveyBonus(town));
}
function adjustWarehouses() {
    let town = towns[COMMERCEVILLE];
    let base = town.getLevel("Excursion") / 2.5;
    town.totalWarehouses = Math.floor(base * getSkillMod("Spatiomancy", 1200, 1400, .5) + base * getSurveyBonus(town));
}
function adjustInsurance() {
    let town = towns[COMMERCEVILLE];
    let base = town.getLevel("Excursion") / 10;
    town.totalInsurance = Math.floor(base * getSkillMod("Spatiomancy", 1300, 1500, .5) + base * getSurveyBonus(town));
}

Action.ExplorersGuild = new Action("Explorers Guild", {
    type: "normal",
    expMult: 1,
    townNum: 7,
    stats: {
        Per: 0.4,
        Cha: 0.3,
        Int: 0.2,
        Luck: 0.2
    },
    manaCost() {
        return 65000;
    },
    allowed() {
        return 1;
    },
    canStart() {
        return guild === "";
    },
    visible() {
        return towns[COMMERCEVILLE].getLevel("Excursion") >= 5;
    },
    unlocked() {
        return towns[COMMERCEVILLE].getLevel("Excursion") >= 10;
    },
    finish() {
        if (getExploreSkill() == 0) towns[this.townNum].finishProgress("SurveyZ"+this.townNum, 100);
        guild = "Explorer";
        view.adjustGoldCost("Excursion", Action.Excursion.goldCost());
    }
});
function getExploreProgress() {
    let totalExploreProgress = 0;
    towns.forEach((town, index) => {
        if (town.getLevel("SurveyZ"+index)) totalExploreProgress += town.getLevel("SurveyZ"+index);
    });
    if (totalExploreProgress == 0) return 0;
    else return Math.max(Math.floor(totalExploreProgress / towns.length), 1);
}
function getExploreSkill() {
    return Math.floor(Math.sqrt(getExploreProgress()));
}

Action.ThievesGuild = new MultipartAction("Thieves Guild", {
    type: "multipart",
    expMult: 2,
    townNum: 7,
    varName: "ThievesGuild",
    stats: {
        Dex: 0.4,
        Per: 0.3,
        Spd: 0.3
    },
    skills: {
        Thievery: 50,
    },
    loopStats: ["Per", "Dex", "Spd"],
    manaCost() {
        return 75000;
    },
    allowed() {
        return 1;
    },
    canStart() {
        return guild === "" && resources.reputation < 0;
    },
    loopCost(segment) {
        return precision3(Math.pow(1.2, towns[COMMERCEVILLE][`${this.varName}LoopCounter`] + segment)) * 5e8;
    },
    tickProgress(offset) {
        return (
				getSkillLevel("Thievery")) *
                (1 + getLevel(this.loopStats[(towns[COMMERCEVILLE][`${this.varName}LoopCounter`] + offset) % this.loopStats.length]) / 100) *
                Math.sqrt(1 + towns[COMMERCEVILLE][`total${this.varName}`] / 1000);
    },
    loopsFinished() {
    },
    segmentFinished() {
        curThievesGuildSegment++;
        handleSkillExp(this.skills);
        addResource("gold", 10);
    },
    getPartName() {
        return `Rank ${getThievesGuildRank().name}`;
    },
    getSegmentName(segment) {
        return `Rank ${getThievesGuildRank(segment % 3).name}`;
    },
    visible() {
        return towns[COMMERCEVILLE].getLevel("Excursion") >= 20;
    },
    unlocked() {
        return towns[COMMERCEVILLE].getLevel("Excursion") >= 25;
    },
    finish() {
        guild = "Thieves";
        view.adjustGoldCost("Excursion", Action.Excursion.goldCost());
        handleSkillExp(this.skills);
    },
});
function getThievesGuildRank(offset) {
    let name = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS", "SSSS", "U", "UU", "UUU", "UUUU"][Math.floor(curThievesGuildSegment / 3 + 0.00001)];

    const segment = (offset === undefined ? 0 : offset - (curThievesGuildSegment % 3)) + curThievesGuildSegment;
    let bonus = precision3(1 + segment / 20 + Math.pow(segment, 2) / 300);
    if (name) {
        if (offset === undefined) {
            name += ["-", "", "+"][curThievesGuildSegment % 3];
        } else {
            name += ["-", "", "+"][offset % 3];
        }
    } else {
        name = "Godlike";
        bonus = 10;
    }
    name += `, Mult x${bonus}`;
    return { name, bonus };
}

Action.PickPockets = new Action("Pick Pockets", {
    type: "progress",
    expMult: 1.5,
    townNum: 7,
    stats: {
        Dex: 0.4,
        Spd: 0.4,
        Luck: 0.2
    },
    skills: {
        Thievery() {
            return 10 * (1 + towns[COMMERCEVILLE].getLevel("PickPockets") / 100);
        }
    },
    affectedBy: ["Thieves Guild"],
    allowed() {
        return towns[COMMERCEVILLE].totalPockets;
    },
    canStart() {
        return guild === "Thieves";
    },
    manaCost() {
        return 20000;
    },
    visible() {
        return getSkillLevel("Thievery") > 0;
    },
    unlocked() {
        return getSkillLevel("Thievery") > 0;
    },
    goldCost() {
        return Math.floor(1 * getSkillBonus("Thievery"));
    },
    finish() {
        towns[COMMERCEVILLE].finishProgress(this.varName, 30 * getThievesGuildRank().bonus);
        handleSkillExp(this.skills);
        view.adjustExpGain(Action.ThievesGuild);
        const goldGain = Math.floor(this.goldCost() * getThievesGuildRank().bonus);
        addResource("gold", goldGain);
        return goldGain;
    },
});

Action.RobWarehouse = new Action("Rob Warehouse", {
    type: "progress",
    expMult: 2,
    townNum: 7,
    stats: {
        Dex: 0.4,
        Spd: 0.2,
        Int: 0.2,
        Luck: 0.2
    },
    skills: {
        Thievery() {
            return 20 * (1 + towns[COMMERCEVILLE].getLevel("RobWarehouse") / 100);
        }
    },
    affectedBy: ["Thieves Guild"],
    allowed() {
        return towns[COMMERCEVILLE].totalWarehouses;
    },
    canStart() {
        return guild === "Thieves";
    },
    manaCost() {
        return 50000;
    },
    visible() {
        return towns[COMMERCEVILLE].getLevel("PickPockets") >= 25;
    },
    unlocked() {
        return towns[COMMERCEVILLE].getLevel("PickPockets") >= 100;
    },
    goldCost() {
        return Math.floor(10 * getSkillBonus("Thievery"));
        },
    finish() {
        towns[COMMERCEVILLE].finishProgress(this.varName, 20 * getThievesGuildRank().bonus);
        handleSkillExp(this.skills);
        view.adjustExpGain(Action.ThievesGuild);
        const goldGain = Math.floor(this.goldCost() * getThievesGuildRank().bonus);
        addResource("gold", goldGain);
        return goldGain;
    },
});

Action.InsuranceFraud = new Action("Insurance Fraud", {
    type: "progress",
    expMult: 2.5,
    townNum: 7,
    stats: {
        Dex: 0.2,
        Spd: 0.2,
        Int: 0.3,
        Luck: 0.3
    },
    skills: {
        Thievery() {
            return 40 * (1 + towns[COMMERCEVILLE].getLevel("InsuranceFraud") / 100);
        }
    },
    affectedBy: ["Thieves Guild"],
    allowed() {
        return towns[COMMERCEVILLE].totalInsurance;
    },
    canStart() {
        return guild === "Thieves";
    },
    manaCost() {
        return 100000;
    },
    visible() {
        return towns[COMMERCEVILLE].getLevel("RobWarehouse") >= 50;
    },
    unlocked() {
        return towns[COMMERCEVILLE].getLevel("RobWarehouse") >= 100;
    },
    goldCost() {
        return Math.floor(100 * getSkillBonus("Thievery"));
    },
    finish() {
        towns[COMMERCEVILLE].finishProgress(this.varName, 10 * getThievesGuildRank().bonus);
        handleSkillExp(this.skills);
        view.adjustExpGain(Action.ThievesGuild);
        const goldGain = Math.floor(this.goldCost() * getThievesGuildRank().bonus);
        addResource("gold", goldGain);
        return goldGain;
    },
});

Action.Invest = new Action("Invest", {
    type: "normal",
    expMult: 1,
    townNum: 7,
    stats: {
        Con: 0.4,
        Per: 0.3,
        Spd: 0.3
    },
    skills: {
        Mercantilism: 100
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 50000;
    },
    canStart() {
        return resources.gold > 0;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
        handleSkillExp(this.skills);
        goldInvested += resources.gold;
        if (goldInvested > 999999999999) goldInvested = 999999999999;
        resetResource("gold");
    },
});

Action.CollectInterest = new Action("Collect Interest", {
    type: "normal",
    expMult: 1,
    townNum: 7,
    stats: {
        Con: 0.4,
        Per: 0.3,
        Spd: 0.3
    },
    skills: {
        Mercantilism: 50
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 1;
    },
    canStart() {
        return true;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
        handleSkillExp(this.skills);
        let interestGold = Math.floor(goldInvested * .001);
        addResource("gold", interestGold);
        return interestGold;
    },
});

Action.PurchaseKey = new Action("Purchase Key", {
    type: "normal",
    expMult: 1,
    townNum: 7,
    stats: {
        Cha: 0.8,
        Luck: 0.1,
        Soul: 0.1
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 20000;
    },
    canStart() {
        return resources.gold >= 1000000 && !resources.key;
    },
    cost() {
        addResource("gold", -1000000);
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    goldCost() {
        return 1000000;
    },
    finish() {
        addResource("key", true);
    },
});

Action.SecretTrial = new TrialAction("Secret Trial", 3, {
    type: "multipart",
    expMult: 0,
    townNum: 7,
    varName: "STrial",
    stats: {
        Dex: 0.11,
        Str: 0.11,
        Con: 0.11,
        Spd: 0.11,
        Per: 0.11,
        Cha: 0.11,
        Int: 0.11,
        Luck: 0.11,
        Soul: 0.11
    },
    loopStats: ["Dex", "Str", "Con", "Spd", "Per", "Cha", "Int", "Luck", "Soul"],
    affectedBy: ["Team"],
    floorScaling: 1.25,
    baseScaling: 1e10,
    manaCost() {
        return 100000;
    },
    canStart() {
        return currentFloor() < trialFloors[this.trialNum];
    },
    baseProgress() {
        return getTeamCombat();
    },
    /*loopCost(segment) {
        return precision3(Math.pow(1.25, Math.floor((towns[this.townNum].STrialLoopCounter + segment) / this.segments + 0.0000001)) * 1e10);
    },*/
    /*tickProgress(offset) {
        const floor = Math.floor((towns[this.townNum].STrialLoopCounter) / this.segments + 0.0000001);
        return getTeamCombat() *
            (1 + getLevel(this.loopStats[(towns[this.townNum].STrialLoopCounter + offset) % this.loopStats.length]) / 100) *
            Math.sqrt(1 + trials[this.trialNum][floor].completed / 200);
    },*/
    floorReward() {
        //None
    },
    /*loopsFinished() {
        const curFloor = Math.floor((towns[this.townNum].STrialLoopCounter) / this.segments + 0.0000001 - 1);
        trials[this.trialNum][curFloor].completed++;
        if (curFloor + 1 > trials[this.trialNum].highestFloor || trials[this.trialNum].highestFloor === undefined) trials[this.trialNum].highestFloor = curFloor + 1;
        view.updateTrialInfo(this.trialNum, curFloor + 1);
    },*/
    visible() {
        return goldInvested === 999999999999;
    },
    unlocked() {
        return goldInvested === 999999999999;
    },
    finish() {
    },
});

Action.LeaveCity = new Action("Leave City", {
    type: "normal",
    expMult: 2,
    townNum: 7,
    stats: {
        Con: 0.4,
        Per: 0.3,
        Spd: 0.3
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 100000;
    },
    cost() {
        addResource("key", false);
    },
    canStart() {
        return resources.key;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
        unlockTown(8);
    },
});

//====================================================================================================
//Zone 9 - Valley of Olympus
//====================================================================================================
Action.ImbueSoul = new MultipartAction("Imbue Soul", {
    type: "multipart",
    expMult: 5,
    townNum: 8,
    stats: {
        Soul: 1.0
    },
    loopStats: ["Soul", "Soul", "Soul"],
    manaCost() {
        return 5000000;
    },
    allowed() {
        return 1;
    },
    canStart() {
        return towns[VLOLYMPUS].ImbueSoulLoopCounter === 0 && getBuffLevel("Imbuement") > 499 && getBuffLevel("Imbuement2") > 499;
    },
    loopCost(segment) {
        return 100000000 * (segment * 5 + 1);
    },
    tickProgress(offset) {
        return getSkillLevel("Magic") * (1 + getLevel(this.loopStats[(towns[VLOLYMPUS].ImbueSoulLoopCounter + offset) % this.loopStats.length]) / 100);
    },
    loopsFinished() {
        for (const stat in stats) {
            stats[stat].talent = 0;
            stats[stat].soulstone = 0;
            view.requestUpdate("updateStat", stat);
        }
        buffs["Imbuement"].amt = 0;
        buffs["Imbuement2"].amt = 0;
        trainingLimits = 10;
        addBuffAmt("Imbuement3", 1);
        view.updateBuffs();
        view.updateStats();
    },
    getPartName() {
        return "Imbue Soul";
    },
    visible() {
        return true;
    },
    unlocked() {
        return getBuffLevel("Imbuement") > 499 && getBuffLevel("Imbuement2") > 499;
    },
    finish() {
        view.updateBuff("Imbuement3");
    },
});

Action.BuildTower = new Action("Build Tower", {
    type: "progress",
    expMult: 1,
    townNum: 8,
    stats: {
        Dex: 0.1,
        Str: 0.3,
        Con: 0.4,
        Per: 0.2,
        Spd: 0.1
    },
    affectedBy: ["Temporal Stone"],
    manaCost() {
        return 250000;
    },
    canStart() {
        return resources.stone;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
        stonesUsed[stoneLoc]++;
        //towns[stoneLoc]["checkedStonesZ" + stoneLoc] -= 1000;
        towns[this.townNum].finishProgress(this.varName, 505);
        addResource("stone", false);
        if (towns[this.townNum].getLevel(this.varName) >= 100) stonesUsed = {1:250, 3:250, 5:250, 6:250};
    },
});

Action.GodsTrial = new TrialAction("Gods Trial", 1, {
    type: "multipart",
    expMult: 0.2,
    townNum: 8,
    varName: "GTrial",
    stats: {
        Dex: 0.11,
        Str: 0.11,
        Con: 0.11,
        Spd: 0.11,
        Per: 0.11,
        Cha: 0.11,
        Int: 0.11,
        Luck: 0.11,
        Soul: 0.11
    },
    skills: {
        Combat: 250,
        Pyromancy: 50,
        Restoration: 50
    },
    loopStats: ["Dex", "Str", "Con", "Spd", "Per", "Cha", "Int", "Luck", "Soul"],
    affectedBy: ["Team"],
    floorScaling: 1.3,
    baseScaling: 1e7,
    manaCost() {
        return 50000;
    },
    canStart() {
        return this.currentFloor() < trialFloors[this.trialNum] && resources.power < 7;
    },
    baseProgress() {
        return getTeamCombat();
    },
    floorReward() {
        if (this.currentFloor() === trialFloors[this.trialNum] - 1) addResource("power", 1);
    },
    /*loopCost(segment) {
        return precision3(Math.pow(1.3, Math.floor((towns[this.townNum].GTrialLoopCounter + segment) / this.segments + 0.0000001)) * 1e7);
    },*/
    /*tickProgress(offset) {
        const floor = Math.floor((towns[this.townNum].GTrialLoopCounter) / this.segments + 0.0000001);
        return getTeamCombat() *
            (1 + getLevel(this.loopStats[(towns[this.townNum].GTrialLoopCounter + offset) % this.loopStats.length]) / 100) *
            Math.sqrt(1 + trials[this.trialNum][floor].completed / 200);
    },*/
    /*loopsFinished() {
        const curFloor = Math.floor((towns[this.townNum].GTrialLoopCounter) / this.segments + 0.0000001 - 1);
        trials[this.trialNum][curFloor].completed++;
        if (curFloor + 1 > trials[this.trialNum].highestFloor || trials[this.trialNum].highestFloor === undefined) trials[this.trialNum].highestFloor = curFloor + 1;
        view.updateTrialInfo(this.trialNum, curFloor + 1);
        if (curFloor + 1 === 100) addResource("power", 1);
    },*/
    visible() {
        return towns[this.townNum].getLevel("BuildTower") >= 100;
    },
    unlocked() {
        return towns[this.townNum].getLevel("BuildTower") >= 100;
    },
    finish() {
        handleSkillExp(this.skills);
        view.updateSkills();
    },
});

Action.ChallengeGods = new TrialAction("Challenge Gods", 2, {
    type: "multipart",
    expMult: 0.5,
    townNum: 8,
    varName: "GFight",
    stats: {
        Dex: 0.11,
        Str: 0.11,
        Con: 0.11,
        Spd: 0.11,
        Per: 0.11,
        Cha: 0.11,
        Int: 0.11,
        Luck: 0.11,
        Soul: 0.11
    },
    skills: {
        Combat: 500,
    },
    loopStats: ["Dex", "Str", "Con", "Spd", "Per", "Cha", "Int", "Luck", "Soul"],
    floorScaling: 2,
    baseScaling: 1e16,
    manaCost() {
        return 50000;
    },
    canStart() {
        return this.currentFloor() < trialFloors[this.trialNum] && resources.power > 0 && resources.power < 8;
    },
    baseProgress() {
        return getSelfCombat();
    },
    floorReward() {
        addResource("power", 1);
    },
    /*loopCost(segment) {
        return precision3(Math.pow(2, Math.floor((towns[this.townNum].GFightLoopCounter + segment) / this.segments + 0.0000001)) * 1e16);
    },*/
    /*tickProgress(offset) {
        const floor = Math.floor((towns[this.townNum].GFightLoopCounter) / this.segments + 0.0000001);
        return getSelfCombat() *
            (1 + getLevel(this.loopStats[(towns[this.townNum].GFightLoopCounter + offset) % this.loopStats.length]) / 100) *
            Math.sqrt(1 + trials[this.trialNum][floor].completed / 200);
    },*/
    /*loopsFinished() {
        const curFloor = Math.floor((towns[this.townNum].GFightLoopCounter) / this.segments + 0.0000001 - 1);
        trials[this.trialNum][curFloor].completed++;
        if (curFloor + 1 > trials[this.trialNum].highestFloor || trials[this.trialNum].highestFloor === undefined) trials[this.trialNum].highestFloor = curFloor + 1;
        view.updateTrialInfo(this.trialNum, curFloor + 1);
        addResource("power", 1);
    },*/
    visible() {
        return towns[this.townNum].getLevel("BuildTower") >= 100;
    },
    unlocked() {
        return towns[this.townNum].getLevel("BuildTower") >= 100;
    },
    finish() {
        handleSkillExp(this.skills);
        view.updateSkills();
    },
});

Action.RestoreTime = new Action("Restore Time", {
    type: "normal",
    expMult: 0,
    townNum: 8,
    stats: {
        Luck: 0.5,
        Soul: 0.5,
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 7777777777;
    },
    canStart() {
        return resources.power >= 8;
    },
    visible() {
        return towns[this.townNum].getLevel("BuildTower") >= 100;
    },
    unlocked() {
        return towns[this.townNum].getLevel("BuildTower") >= 100;
    },
    finish() {
        addResource("reputation", 9999999);
        unlockGlobalStory(3);
    },
});

const actionsWithGoldCost = Object.values(Action).filter(
    action => action.goldCost !== undefined
);

//====================================================================================================
//Zone 10 - Chronos' Lair
//====================================================================================================

Action.FirstTrial = new Action("First Trial", {
    type: "normal",
    expMult: 1,
    townNum: 10,
	storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return true
        }
        return false;
    },
    stats: {
		Cha: 0.6,
        Luck: 0.1,
        Soul: 0.2,
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 1000;
    },
    canStart() {
        return resources.squirrel;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
		
    },
});


Action.BreakLoop = new Action("Break Loop", {
    type: "normal",
    expMult: 1,
    townNum: 10,
	storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return true
        }
        return false;
    },
    stats: {
		Con : 0.1,
		Cha: 0.5,
		Int : 0.1,
        Soul: 0.3,
    },
    allowed() {
        return 1;
    },
    manaCost() {
        return 1000;
    },
    canStart() {
        return resources.loopPotion;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish() {
		
    },
});
