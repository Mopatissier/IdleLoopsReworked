Views.registerView("buffsContainer", {
    selector: "#buffsContainer",
    html() {
        const fullNames = {
			SpiritBlessing: "Spirit Blessing",
			ImbueSoulstones: "Soulstones Imbued",
			YinYang: "Yin Yang Magic",
            Imbuement: "Imbue Mind",
            Imbuement2: "Imbue Body",
            Feast: "Great Feast",
            Aspirant: "Aspirant",
            Heroism: "Heroism",
            Imbuement3: "Imbue Soul"
        };
        let html = "";
        for (const buff of buffList) {
            const fullName = fullNames[buff];
            const XMLName = getXMLName(fullName);
            const desc2 = _txtsObj(`buffs>${XMLName}`)[0].innerHTML.includes("desc2");
            html +=
                `<div class="buffContainer showthat" id="buff${buff}Container">
                    <div class="buffNameContainer">
                        <img class="buffIcon" src="img/${camelize(fullName)}.svg">
                        <div class="buffLabel medium bold">${_text(`buffs>${XMLName}>label`)}</div>
                        <div class="showthis">
                            <span>${_text(`buffs>${XMLName}>desc`)}</span>
                            <br>
                            ${desc2 ? `<span class="localized" data-lockey="buffs>${XMLName}>desc2"></span>` : ""}
                        </div>
                    </div>
                    <div class="buffNumContainer">
                        <div id="buff${buff}Level">0/</div>
                        <input type="number" id="buff${buff}Cap" class="buffmaxinput" value="${buffHardCaps[buff]}" onchange="view.updateBuffCaps()">
                    </div>
                </div>`;
        }
        return html;
    },
});
