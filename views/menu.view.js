Views.registerView("menu", {
    selector: "#menu",
    html() {
        let html = "";
        html += Views.menu.htmlChangelog();
        html += Views.menu.htmlSaveMenu();
        html += Views.menu.htmlFAQMenu();
        html += Views.menu.htmlOptionsMenu();
		
        return html;
    },
    versions() {
        let html = "";
        const versions = _txtsObj("menu>changelog>version");
        $(versions).each((_index, version) => {
            html += `<div class='showthat2'style='display:inline-block;width:95px'>
						${`${_text("menu>changelog>meta>version_prefix")} ${$(version).attr("verNum")}`}
						<div class='showthis2' style='margin-left: 95px;'>
							${$(version).text()}
						</div>
					</div>
                    `;
        });
        return html;
    },
    htmlChangelog() {
        const html =
        `<div style='display:inline-block;height:30px;margin-left:10px;' class='showthatH'>
            ${_text("menu>changelog>meta>title")}
            <div style='max-width: 90px;' class='showthisH' id='changelog'>
                ${this.versions()}
            </div>
        </div>`;
        return html;
    },
    htmlSaveMenu() {
        const html =
        `<div style='display:inline-block;height:30px;margin-left:10px;' class='showthatH'>
            ${_text("menu>save>meta>title")}
            <div class='showthisH'>
                <div class='button' onclick='save()'>${_text("menu>save>manual_save")}</div>
                <br>
                <textarea id='exportImportList'></textarea><label for='exportImportList'> ${_text("menu>save>list_label")}</label>
                <br>
                <div class='button' style='margin-right: 2px;' onclick='exportCurrentList()'>${_text("menu>save>export_button")}</div>
                <div class='button' onclick='importCurrentList()'>${_text("menu>save>import_button")}</div>
                <br>
                ${_text("menu>save>list_comment")}
                <br><br>
                <input id='exportImport'><label for='exportImport'> ${_text("menu>save>input_label")}</label><br>
                <div class='button' style='margin-top: 5px; margin-right: 2px;' onclick='exportSave()'>${_text("menu>save>export_button")}</div>
                <div class='button' style='margin-top: 1px;' onclick='importSave()'>${_text("menu>save>import_button")}</div><br>
                ${_text("menu>save>export_comment")}<br>
                ${_text("menu>save>import_comment")}
                <br>
            </div>
        </div>`;
        return html;
    },
    FAQs() {
        let html = "";
        const QAs = _txtsObj("menu>faq>q_a");
        $(QAs).each((_index, QA) => {
            html += 
            `${_text("menu>faq>meta>q_prefix")} <i>"${$(QA).find("q").html()}"</i><br>
            ${_text("menu>faq>meta>a_prefix")} ${$(QA).find("a").html()}<br>
            <br>`;
        });
		html += _text("menu>faq>buttons>intro");		
		for(i=0; i<6; i++){
			html += `<div class="button" id="FAQButton${i}" style="display:block" onclick="view.showPopup('tutorial${i}')">${_text(`menu>faq>buttons>tuto${i}`)}</div>`
		}
		
        return html;
    },
    htmlFAQMenu() {
        const html = 
        `<div style='display:inline-block;height:30px;margin-left:10px;' class='showthatH'>
            ${_text("menu>faq>meta>title")}
            <div class='showthisH'>
                ${this.FAQs()}
            </div>
        </div>`;
        return html;
    },
    htmlOptionsMenu() {
        const html =
            `<div style='display:inline-block;height:30px;margin-left:10px;' class='showthatH'>
            ${_text("menu>options>meta>title")}
            <div class='showthisH'>
                <a target='_blank' href='${_text("menu>options>discord>link")}'>${_text("menu>options>discord>title")}</a><br>
                ${Views.menu.htmlThemeMenu()}
                ${Object.keys(Localization.supportedLang).length > 1 ? Views.menu.htmlLocalizationMenu() : ""}
                ${_text("menu>options>adblock_warning")}<br>
                <input id='pingOnPauseInput' type='checkbox' onchange='setOption("pingOnPause", this.checked)'/>
                <label for='pingOnPauseInput'>${_text("menu>options>pause_audio_cue")}</label>
                <br>
                <input id='autoMaxTrainingInput' type='checkbox' onchange='setOption("autoMaxTraining", this.checked)'/>
                <label for='autoMaxTrainingInput'>${_text("menu>options>auto_max_training")}</label>
                <br>
				<input id='chaosModeInput' type='checkbox' onchange='setOption("chaosMode", this.checked)'/>
                <label for='chaosModeInput'>${_text("menu>options>chaos_mode")}</label>
                <br>
				<input id='hideBarsInput' type='checkbox' onchange='setOption("hideBars", this.checked)'/>
                <label for='hideBarsInput'>${_text("menu>options>hide_bars")}</label>
                <br>
				<input id='mergeModesInput' type='checkbox' onchange='setOption("mergeModes", this.checked)'/>
                <label for='mergeModesInput'>${_text("menu>options>merge_modes")}</label>
                <br>
                <input id='hotkeysInput' type='checkbox' onchange='setOption("hotkeys", this.checked)'/>
                <label class='showthat' for='hotkeysInput'>${_text("menu>options>hotkeys")}
                    <div class='showthis'>${_text("menu>options>hotkeys_tooltip")}</div>
                </label>
                <br>
                ${_text("menu>options>update_rate")}
                <input id='updateRateInput' type='number' value='50' min='1' style='width: 50px;transform: translateY(-2px);' oninput='setOption("updateRate", parseInt(this.value))' />
                <br>
            </div>
        </div>`;
        return html;
    },
    htmlLocalizationMenu() {
        const lg = Localization.supportedLang;
        let html = `${_text("menu>options>localization_title")}: <select id='localization_menu' onchange='Localization.change();'>`;
        $.each(lg, (val, str) => {
            html += `<option value='${val}'${Localization.currentLang === val ? "selected" : ""}>${str}</option>`;
        });
        html += "</select><br>";
        return html;
    },
    htmlThemeMenu() {
        const themeList = ["normal", "dark", "cubic"];
        const themes = _txtsObj("menu>options>theme");
        let html = `${_text("menu>options>theme_title")}: <select id='themeInput' onchange='view.changeTheme();'>`;
        $(themes).each((index, theme) => {
            html += `<option value='${themeList[index]}'>${$(theme).find(themeList[index]).text()}</option>`;
        });
        html += "</select><br>";
        return html;
    }
});
