Views.registerView("timeControls", {
    selector: "#timeControls",
    stories() {
        let html = "";
        // eslint-disable-next-line no-unused-vars
        _txtsObj("time_controls>stories>story").each((index, story) => {
            html +=
            `<div id='story${$(story).attr("num")}'>
                ${$(story).text()}
            </div>`;
        });
        return html;
    },
    html() {
		
		const OverclockOff =
		`<div style='display:inline-block;height:30px;' class='showthatH' id='overclockOffMenu'> 
			<div class='button showthatO control' onclick='toggleOffline()'>${_text("time_controls>bonus_seconds>title")}</div>
            <div class='showthisH' style='width:420px;color:black;'>${_text("time_controls>bonus_seconds>main_text_idle")}
				<div class='button showthat control' style='margin-top:5px;' onclick='setActivatedBonusSpeed(5)'>x5
				<div class='showthis' style='margin-left:-5px;'>${_text("time_controls>bonus_seconds>x5_tooltip")}</div></div>
				<div class='button showthat control' style='margin-top:5px' onclick='setActivatedBonusSpeed(10)'>x10
				<div class='showthis' style='margin-left:-5px;'>${_text("time_controls>bonus_seconds>x10_tooltip")}</div></div>
				<div class='button showthat control' style='margin-top:5px' onclick='setActivatedBonusSpeed(20)'>x20
				<div class='showthis' style='margin-left:-5px;'>${_text("time_controls>bonus_seconds>x20_tooltip")}</div></div><br>
				${_text("time_controls>bonus_seconds>state_introduction")}
				<div class='bold' id='isBonusOn'>${_text("time_controls>bonus_seconds>state>off")}</div><br>
				<div class='bold'>${_text("time_controls>bonus_seconds>bonus_mult")}</div> <div id='bonusMult'></div><br>
                <div class='bold'>${_text("time_controls>bonus_seconds>counter_text")}</div> <div id='bonusSeconds'></div><br>
                <div class='bold'>${_text("time_controls>bonus_seconds>fatigue_text")}</div> <div id='fatigue'v>0</div><br>
				<div class='button showthat control' style='margin-top:5px' onclick='toggleOverclock(true)'>${_text("time_controls>bonus_seconds>overclock_button_on")}
				<div class='showthis' style='margin-left:-5px;'>${_text("time_controls>bonus_seconds>overclock_on_tooltip")}'</div></div>
            </div>
        </div>`;
		
		const OverclockOn =
		`<div style='display:none;height:30px;' class='showthatH' id='overclockOnMenu'>
			<div class='button showthatO control'>${_text("time_controls>bonus_seconds>title")}</div>
			<div class='showthisH' style='width:420px;color:black;'>${_text("time_controls>bonus_seconds>main_text_active")}
				<div class='bold'>${_text("time_controls>bonus_seconds>bonus_mult")}</div> <div id='bonusMultOverclock'></div><br>
                <div class='bold'>${_text("time_controls>bonus_seconds>counter_text")}</div> <div id='bonusSecondsOverclock'></div><br>
                <div class='bold'>${_text("time_controls>bonus_seconds>fatigue_text")}</div> <div id='fatigueOverclock'>0</div><br>
				<div class='button showthatO control' style='margin-top:5px' onclick='toggleOverclock(false)'>${_text("time_controls>bonus_seconds>overclock_button_off")}
				<div class='showthis' style='margin-left:-5px;'>${_text("time_controls>bonus_seconds>overclock_off_tooltip")}</div></div>
			</div>
		</div>`;
		
        const html =
        `<div id='pausePlay' onclick='pauseGame()' class='button control'>${_text("time_controls>pause_button")}</div>
        <div onclick='restart()' class='button showthatO control'>${_text("time_controls>restart_button")}
            <div class='showthis' style='color:black;width:230px;'>${_text("time_controls>restart_text")}</div>
        </div>
        ${OverclockOff}
        ${OverclockOn}
        <div idOverclockOffModetalentTreeBtn' style='display: none;' onclick='view.showTalents()'' class='button control'>${_text("time_controls>talents_button")}</div>
        <div class='showthatO control'>
            <div class='showthatO' onmouseover='view.updateStory(storyShowing)' style='height:30px;'>
                <div class='large bold'>${_text("time_controls>story_title")}</div>
                <div id='newStory' style='color:red;display:none;'>(!)</div>
                <div class='showthisH' style='width:400px;'>
                    <div style='margin-left:175px;' class='actionIcon fa fa-arrow-left control' id='storyLeft' onclick='view.updateStory(storyShowing-1)'></div>
                    <div style='' id='storyPage' class='bold control'></div>
                    <div style='' class='actionIcon fa fa-arrow-right control' id='storyRight' onclick='view.updateStory(storyShowing+1)'></div>
                    ${this.stories()}
                </div>
            </div>
        </div>
        <div class='control'>
            <input type='checkbox' id='pauseBeforeRestartInput' onchange='setOption("pauseBeforeRestart", this.checked)'>
            <label for='pauseBeforeRestartInput'>${_text("time_controls>pause_before_restart")}</label>
        </div>
        <div class='control'>
            <input type='checkbox' id='pauseOnFailedLoopInput' onchange='setOption("pauseOnFailedLoop", this.checked)'>
            <label for='pauseOnFailedLoopInput'>${_text("time_controls>pause_on_failed_loop")}</label>
        </div>
		<div class='control'>
            <input type='checkbox' id='pauseOnExplorationCompleteInput' onchange='setOption("pauseOnExplorationComplete", this.checked)'>
            <label for='pauseOnExplorationCompleteInput'>${_text("time_controls>pause_on_exploration_complete")}</label>
        </div>`;
        return html;
    },
});

