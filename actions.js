"use strict";

function Actions() {
    this.current = [];
    this.next = [];
    this.addAmount = 1;

    this.totalNeeded = 0;
    this.completedTicks = 0;
    this.currentPos = 0;
    this.timeSinceLastUpdate = 0;

    this.tick = function(ticksAmt) {
        const curAction = this.getNextValidAction();
        // out of actions
        if (!curAction) {
            shouldRestart = true;
            return;
        }
		
		if(curTown != SANCTUARY) addExpFromAction(curAction);
		curAction.ticks += ticksAmt;
		curAction.manaUsed += ticksAmt;
		curAction.timeSpent += 1 / baseManaPerSecond / getActualGameSpeed();
        // only for multi-part progress bars
        if (curAction.loopStats) {
            let segment = 0;
            let curProgress = towns[curAction.townNum][curAction.varName];
            while (curProgress >= curAction.loopCost(segment)) {
                curProgress -= curAction.loopCost(segment);
                segment++;
            }
            // segment is 0,1,2
            const toAdd = curAction.tickProgress(segment) * (curAction.manaCost() / curAction.adjustedTicks) * ticksAmt;
            // console.log("using: "+curAction.loopStats[(towns[curAction.townNum][curAction.varName + "LoopCounter"]+segment) % curAction.loopStats.length]+" to add: " + toAdd + " to segment: " + segment + " and part " +towns[curAction.townNum][curAction.varName + "LoopCounter"]+" of progress " + curProgress + " which costs: " + curAction.loopCost(segment));
            towns[curAction.townNum][curAction.varName] += toAdd;
            curProgress += toAdd;
            let partUpdateRequired = false;
            while (curProgress >= curAction.loopCost(segment)) {
                curProgress -= curAction.loopCost(segment);
                // segment finished
                if (segment === curAction.segments - 1) {
                    // part finished
                    if (curAction.name === "Imbue Mind" && towns[curAction.townNum][curAction.varName] >= 700000000) unlockStory("imbueMindThirdSegmentReached");
                    towns[curAction.townNum][curAction.varName] = 0;
                    towns[curAction.townNum][`${curAction.varName}LoopCounter`] += curAction.segments;
                    towns[curAction.townNum][`total${curAction.varName}`]++;
                    segment -= curAction.segments;
                    curAction.loopsFinished();
                    partUpdateRequired = true;
                    if (curAction.canStart && !curAction.canStart()) {
                        this.completedTicks += curAction.ticks;
                        view.updateTotalTicks();
                        curAction.loopsLeft = 0;
                        curAction.ticks = 0;
                        curAction.manaRemaining = timeNeeded - timer;
                        curAction.goldRemaining = resources.gold;
						if(curAction.squirrelAction && curAction.squirrelLevelUp !== "undefined" && curAction.squirrelActionEffect !== "undefined"){
							curAction.squirrelLevelUp();
							curAction.squirrelActionEffect();
						} else {
							curAction.finish();
						}
                        break;
                    }
                    towns[curAction.townNum][curAction.varName] = curProgress;
                }
                if (curAction.segmentFinished) {
                    curAction.segmentFinished();
                    partUpdateRequired = true;
                }
                segment++;
            }
            view.requestUpdate("updateMultiPartSegments", curAction);
            if (partUpdateRequired) {
                view.requestUpdate("updateMultiPart", curAction);
            }
        }
        if (curAction.ticks >= curAction.adjustedTicks) {
            curAction.ticks = 0;
            curAction.loopsLeft--;

            curAction.lastMana = curAction.rawTicks;
            this.completedTicks += curAction.adjustedTicks;
			
			if(curAction.squirrelAction && curAction.squirrelLevelUp !== "undefined" && curAction.squirrelActionEffect !== "undefined"){
				curAction.squirrelLevelUp();
				curAction.squirrelActionEffect();
			} else {
				curAction.finish();
			}
			
            curAction.manaRemaining = timeNeeded - timer;
            
            if (curAction.cost) {
                curAction.cost();
            }
            curAction.goldRemaining = resources.gold;

            this.adjustTicksNeeded();
            view.updateCurrentActionLoops(this.currentPos);
        }
        view.requestUpdate("updateCurrentActionBar", this.currentPos);
        if (curAction.loopsLeft === 0) {
            if (!this.current[this.currentPos + 1] && options.repeatLastAction &&
                (!curAction.canStart || curAction.canStart()) && curAction.townNum === curTown) {
                curAction.loopsLeft++;
                curAction.loops++;
                curAction.extraLoops++;
            } else {
                this.currentPos++;
            }
        }
    };

    this.getNextValidAction = function() {
        let curAction = this.current[this.currentPos];
		let actionIsValid = true;
        if (!curAction) {
            return curAction;
        }
        if (curAction.allowed && getNumOnCurList(curAction.name) > curAction.allowed()) {
            curAction.ticks = 0;
            curAction.timeSpent = 0;
            view.updateCurrentActionBar(this.currentPos);
            return undefined;
        }
        while ((curAction.canStart && !curAction.canStart() && curAction.townNum === curTown)
				|| curAction.townNum !== curTown
				|| (curAction.squirrelAction && alreadyLeveledUp[curAction.name] !== undefined && curAction.squirrelLevelUp(true) === true)
				|| curAction.unlocked() === false) {
			actionIsValid = false;
            curAction.errorMessage = this.getErrorMessage(curAction);
            view.updateCurrentActionBar(this.currentPos);
            this.currentPos++;
            if (this.currentPos >= this.current.length) {
                curAction = undefined;
                break;
            }
            curAction = this.current[this.currentPos];
        }
		if(actionIsValid) endLoopWithNoValidAction = false;
        return curAction;
    };

    this.getErrorMessage = function(action) {
		if(action.unlocked() === false){
			return "This action isn't unlocked.";
		}
        if (action.townNum !== curTown) {
			
			const curTownNumber = zoneOrder.findIndex(arr => arr.includes(curTown));
			const actionTownNumber = zoneOrder.findIndex(arr => arr.includes(action.townNum));
			
            return `You were in zone ${curTownNumber} when you tried this action, and needed to be in zone ${actionTownNumber}`;
        }
        if (action.canStart && !action.canStart()) {
            return "You could not make the cost for this action.";
        }
		if(action.squirrelAction){
			return "You can't level up this action twice in the same loop.";
		}
        return "??";
    };

    this.restart = function() {
        this.currentPos = 0;
        this.completedTicks = 0;
		endLoopWithNoValidAction = true;
		squirrelAlreadyPickedUp = false;
		alreadyHealed = false;
		alreadyFought = false;
		alreadySDungeon = false;
		alreadyLeveledUp = {};
        if(tutorialLevel >= 6)curTown = 0;
		else curTown = TUTORIALIS;
        towns[BEGINNERSVILLE].suppliesCost = 450;
		view.adjustGoldCost("BuySupplies", towns[BEGINNERSVILLE].suppliesCost);
        view.updateResource("supplies");
		gamblesInARow = 0;
        curAdvGuildSegment = 0;
        curCraftGuildSegment = 0;
		curWizCollegeSegment = 0;
        curFightFrostGiantsSegment = 0;
        curFightJungleMonstersSegment = 0;
        curThievesGuildSegment = 0;
        for (const town of towns) {
            for (const action of town.totalActionList) {
                if (action.type === "multipart") {
                    town[action.varName] = 0;
                    town[`${action.varName}LoopCounter`] = 0;
                }
            }
        }
		for(const action of totalActionList){
			if(action.tooltipRefresh && action.tooltipRefresh.some(r => resources.hasOwnProperty(r))){
				view.adjustTooltip(action);
			}
		}
        guild = "";
		magicFight = false;
		squirrelHaggle = false;
        portalUsed = false;
        stoneLoc = 0;
        if (options.keepCurrentList) {
            this.currentPos = 0;
            this.completedTicks = 0;

            for (const action of this.current) {
                action.loops -= action.extraLoops;
                action.loopsLeft = action.loops;
                action.extraLoops = 0;
                action.ticks = 0;
                action.manaUsed = 0;
                action.lastMana = 0;
                action.manaRemaining = 0;
                action.goldRemaining = 0;
                action.timeSpent = 0;
            }

        } else {
            this.current = [];
            for (const action of this.next) {
                // don't add empty/disabled ones
                if (action.loops === 0 || action.disabled) {
                    continue;
                }
                const toAdd = translateClassNames(action.name);

                toAdd.loops = action.loops;
                toAdd.loopsLeft = action.loops;
                toAdd.extraLoops = 0;
                toAdd.ticks = 0;
                toAdd.manaUsed = 0;
                toAdd.lastMana = 0;
                toAdd.manaRemaining = 0;
                toAdd.goldRemaining = 0;
                toAdd.timeSpent = 0;
				toAdd.squirrelAction = action.squirrelAction;

                this.current.push(toAdd);
            }
        }
        if (this.current.length === 0) {
            pauseGame();
        }
        this.adjustTicksNeeded();
        view.requestUpdate("updateMultiPartActions");
        view.requestUpdate("updateNextActions");
        view.requestUpdate("updateTime");
		addResource("reputation", 0);
		view.adjustGoldCost("TailJudges", Action.TailJudges.goldCost());
    };

    this.adjustTicksNeeded = function() {
        let remainingTicks = 0;
        for (let i = 0; i < this.current.length; i++) {
            const action = this.current[i];
            if (i < this.currentPos) {
                continue;
            }
            setAdjustedTicks(action);
            remainingTicks += action.loopsLeft * action.adjustedTicks;
        }
        this.totalNeeded = this.completedTicks + remainingTicks;
        view.updateTotalTicks();
 
    };


    this.addAction = function(action, loops, initialOrder, squirrelAction, disabled) {
        const toAdd = {};
        toAdd.name = action;
				
		switch(favMode[camelize(action)]){
			case fav.none : toAdd.squirrelAction = squirrelAction;
					break;
			
			case fav.squirrel : toAdd.squirrelAction = true;
					break;
			
			case fav.human : toAdd.squirrelAction = false;
					break;
		}
				
        if (disabled) toAdd.disabled = true;
        else toAdd.disabled = false;

        toAdd.loops = loops === undefined ? this.addAmount : loops;

        if (initialOrder === undefined) {
            if (options.addActionsToTop) {
                this.next.splice(0, 0, toAdd);
            } else {
                this.next.push(toAdd);
            }
        } else {
            // insert at index
            this.next.splice(initialOrder, 0, toAdd);
        }
    };
}

function setAdjustedTicks(action) {
    let newCost = 0;
    for (let i = 0; i < statList.length; i++) {
        const statName = statList[i];
        if (action.stats[statName]) {
            newCost += action.stats[statName] / Math.sqrt((1 + getLevel(statName) / 100));
        }
    }
    action.rawTicks = action.manaCost() * newCost - 0.000001;
    action.adjustedTicks = Math.ceil(action.rawTicks);
}

function calcSoulstoneMult(soulstones) {
    return 1 + Math.pow(soulstones, 0.7) / 10;
}

function calcTalentMult(talent) {
    return 1 + Math.sqrt(talent) / 2;
}

function addExpFromAction(action) {
    const adjustedExp = action.expMult * (action.manaCost() / action.adjustedTicks);
    for (const stat of statList) {
        if (action.stats[stat]) {
            const expToAdd = action.stats[stat] * adjustedExp * getTotalBonusXP(stat);
            const statExp = `statExp${stat}`;
            if (!action[statExp]) {
                action[statExp] = 0;
            }
            action[statExp] += expToAdd;
			addExp(stat, expToAdd);
        }
    }
}

function getNumOnList(actionName) {
    let count = 0;
    for (const action of actions.next) {
        if (!action.disabled && action.name === actionName) {
            count += action.loops;
        }
    }
    return count;
}

function getOtherSurveysOnList(surveyName) {
    let count = 0;
    for (const action of actions.next) {
        if (!action.disabled && action.name.startsWith("Survey") && action.name != surveyName) {
            count += action.loops;
        }
    }
    return count;
}

function getNumOnCurList(actionName) {
    let count = 0;
    for (const action of actions.current) {
        if (action.name === actionName) {
            count += action.loops;
        }
    }
    return count;
}
