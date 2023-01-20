let main, appData;
const RIGHTBARWIDTH = 180;
const IMAGEBARWIDTH = 134;
let cols = new ApplicationColors();
//*------------------------application data
class AppData extends ApplicationData {
    constructor(completedCallback) {
        super();
        this.createDisplaySettings();
        this.completedCallback = completedCallback;
        this.openFile(
            "data/ui_language.csv",
            this.processTranslations.bind(this)
        );
    }
    processTranslations(data) {
        let lines = data.split("\n");
        //console.log(lines);
        let lans = lines.shift().split(",");
        let translations = [];
        while (lines.length) {
            let chunks = lines.shift().split(",");
            if (chunks.length < 2) continue;
            translations.push(chunks);
        }
        //enable multilingual support
        enableMultilingual(lans, translations);

        this.setup().then(() => {
            setTimeout(this.completedCallback, 100);
        });
    }
    async setup() {
        //Load Fixes
        this.aFixImage = [];
        let base = "images/fixes/";
        let fixConfigs = ["square", "triangle", "star", "diamond", "circle"];
        for (let i = 0; i < 15; i++) {
            let url = base + "fix" + i + ".png";
            let pic = await this.loadImage(url);
            if (i < 5) pic.fixType = fixConfigs[i];
            else pic.fixType = "bmp";
            this.aFixImage.push(pic);
        }
        //Load Airport Items
        this.aAirportImage = [];
        base = "images/airport/";
        let aAPurl = ["runway", "approach"];
        for (let i = 0; i < aAPurl.length; i++) {
            let url = base + aAPurl[i];
            let pic = await this.loadImage(url + ".png");
            pic.type = aAPurl[i];
            pic.displaySize = { w: 100, h: 25 };
            this.aAirportImage.push(pic);
        }

        return null;
    }
    createDisplaySettings() {
        let dis = localStorage.getItem("displaysettings");
        if (dis) {
            this.displaySettings = JSON.parse(dis);
        } else {
            this.displaySettings = {
                bShowGrid: true,
                gridSpacing: 5,
                gridColor: "#ACAAAA",
                backgroundColor: "#787878",
                bShowScale: true,
                baseFixSize: 2.4,
                fixStrokeColor: "#303030",
                fixFillColor: "#FFFFFF00",
                fixStrokeWeight: 2,
                rwyStrokeColor: "#f0f0f0",
                rwyFillColor: "#232428",
                rwyStrokeWeight: 3,
                taxiStrokeColor: "#808080",
                taxiFillColor: "#80808080",
                taxiStrokeWeight: 2,
                approachStrokeColor: "#C0C0C0",
                approachStrokeWeight: 1,
                selectedColor: "#FFFF00",
            };
            this.saveDisplaySettings();
        }
        this.aDisplayObjects = [];
        this.itemSelected = null;
    }
    saveDisplaySettings() {
        localStorage.setItem(
            "displaysettings",
            JSON.stringify(this.displaySettings)
        );
    }
    connectDisplay(dc) {
        this.dispCnt = dc;
    }
    renderAll(needsUpdate) {
        //sort array by layer number
        this.aDisplayObjects.sort((a, b) => a.layer - b.layer);
        for (let i = 0; i < this.aDisplayObjects.length; i++) {
            this.aDisplayObjects[i].index = i;
            this.aDisplayObjects[i].draw(needsUpdate);
        }
    }
    changeBaseFixSize() {
        for (let i = 0; i < this.aDisplayObjects.length; i++) {
            let f = this.aDisplayObjects[i];
            if (f.type == "fix") {
                if (!f.bOverrideSize) {
                    f.updateSize();
                }
            }
        }
    }
    getItemFromIconID(testID) {
        return this.aDisplayObjects.find((item) => item.icon.id == testID);
    }
    deleteDisplayItem() {
        if (this.itemSelected) {
            this.itemSelected.destructor();
            this.aDisplayObjects.splice(this.itemSelected.index, 1);
            this.itemSelected = null;
            main.triggerRedraw(true);
        }
    }
}
//*------------------------User Interface
class UI extends UIContainer {
    constructor() {
        super();
        //get saved language from storage
        loadLanguageFromStorage();

        //get dark or light mode
        this.mode = localStorage.getItem("displaymode");
        if (this.mode !== "dark" && this.mode !== "light") {
            this.mode = "light";
            this.saveDisplayModeToStorage();
        }
        this.setDisplayMode();
        //set AOmode to center
        AO.RECTMODE = AO.CENTER;

        //set up the display area
        new DisplayContainer("cntDisplay", "");
        //Connect the display container to the Display Object Class
        appData.connectDisplay(this.cntDisplay);
        //Set up the initial zoom value
        Pos2d.zoom = 15;
        //---------------------------
        //set up the image panel on the left side
        new StackManager("stkLeft", IMAGEBARWIDTH, "");
        this.stkLeft.paneClosedHeight = 30;
        this.stkLeft.bOpen = true;
        this.stkLeft.applyStyle("overflow", "visible");
        //----------LEFT SIDE PANES
        this.addMiniControlsPane();
        this.addFixesPane();
        this.addAirportsPane();
        //set up the settings panels on the right side
        new StackManager("stkRight", RIGHTBARWIDTH, "");
        this.stkRight.paneClosedHeight = 30;
        this.stkRight.bOpen = true;
        this.stkRight.applyStyle("overflow", "visible");
        //-----------RT SIDE PANES
        this.addrPane0();
        this.addDisplaySettingsPane();
        this.addColorsPane();
        this.addAnimatePane();
        //---------------------------------
        //this.keyHandler = new KeyHandler(this.processKeys.bind(this));
        this.enableAnimation(this.newFrame.bind(this));
        // this.animStart();
        this.onResizeEvent();

        //setup event listener for keypresses
        this.keyHandler = new KeyHandler(this.keyboardHandler.bind(this));
    }
    onResizeEvent() {
        this.w = this.getWidth();
        this.h = this.getHeight();
        this.cntDisplay.resize(this.w, this.h);
        if (this.stkRight.bOpen) {
            this.stkRight.setX(this.w - RIGHTBARWIDTH);
        } else {
            this.stkRight.setX(this.w);
        }
    }
    newFrame() {
        //clear the canvas
        //this.canvas.fillCanvas(51);
        console.log(this.frameRate());
    }
    //* ------------        Display Mode
    saveDisplayModeToStorage() {
        localStorage.setItem("displaymode", this.mode);
    }
    setDisplayMode() {
        if (this.mode === "light") {
            document
                .getElementById("pagestyle")
                .setAttribute("href", "css/applight.css");
        } else {
            document
                .getElementById("pagestyle")
                .setAttribute("href", "css/appdark.css");
        }
        this.saveDisplayModeToStorage();
    }
    //* ------------        PANE CREATION ------------------------------
    //-------------------------------LEFT SIDE
    addMiniControlsPane() {
        let pn = this.stkLeft.addPane("pnMiniControl", "");
        pn.showOverflow();

        //DARKMODE BUTTON
        new BasicButton("btnDarkmode", "", pn.id)
            .fixSize(40, 40)
            .fixLocation(-5, -7)
            .addClass("imagebutton")
            .bgImage("images/darkmode.png")
            .bgImageFit()
            .addAction("darkMode")
            .listenForClicks(this.btnHandler.bind(this));

        //dropdown for language choice
        let s = new SelectionBox("", pn.id)
            .fixLocation(40, 3)
            .fixSize(40, 20)
            .listenForChanges(this.chgHandler.bind(this))
            .addAction("langDropdown")
            .addClass("dropdown");
        let langs = getLanguages();
        for (let i = 0; i < langs.length; i++) {
            s.addOption(i, langs[i]);
        }
        s.selectOption(getCurrentLanguage());

        //CLOSE/OPEN buttons
        new BasicButton("btnCloseStkLeft", "", pn.id)
            .fixSize(28, 28)
            .fixLocation(IMAGEBARWIDTH - 20, 2)
            .addClass("imagebutton")
            .bgImage("images/moveleft.png")
            .bgImageFit()
            .addAction("closeStkLeft")
            .listenForClicks(this.btnHandler.bind(this));

        this.btnOpenLeft = new BasicButton("btnOpenStkLeft", "", pn.id)
            .fixSize(28, 28)
            .fixLocation(134, 2)
            .addClass("imagebutton")
            .bgImage("images/moveright.png")
            .bgImageFit()
            .addAction("openStkLeft")
            .listenForClicks(this.btnHandler.bind(this))
            .hide();
        //-----------------
        pn.openHeight = 36;
        pn.changeState();
        pn.hideHeaderLabel();
        pn.hideToggleButton();
    }
    addFixesPane() {
        let pn = this.stkLeft.addPane("pnFixes", "Navaid");
        let y = 30;
        let x = 2;
        for (let i = 0; i < appData.aFixImage.length; i++) {
            let p = appData.aFixImage[i];
            let img = new Image("", pn.id, p.url)
                .fixLocation(x, y)
                .fixSize(24, 24)
                .setDraggable(true)
                .addClass("draggable")
                .addAction({ type: "fix", index: i })
                .enableDragTracking(
                    this.dragStart.bind(this),
                    this.dragEnd.bind(this)
                );
            x += 26;
            if (x > 120) {
                y += 26;
                x = 2;
            }
        }

        //-----------------
        pn.openHeight = 30 + (appData.aFixImage.length / 5) * 26;
        pn.changeState();
    }
    addAirportsPane() {
        let pn = this.stkLeft.addPane("pnAirport", "Airport Related");
        let y = 30;
        //RUNWAY
        new Label("", "Runway", pn.id).addClass("obj-label").fixLocation(8, y);
        let p = appData.aAirportImage[0];
        let img = new Image("", pn.id, p.url)
            .fixLocation(17, y + 20)
            .fixSize(100, 25)
            .setDraggable(true)
            .addClass("draggable")
            .addAction({ type: "runway" })
            .enableDragTracking(
                this.dragStart.bind(this),
                this.dragEnd.bind(this)
            );

        //APPROACH
        y += 45;
        new Label("", "Approach", pn.id)
            .addClass("obj-label")
            .fixLocation(8, y);
        p = appData.aAirportImage[1];
        img = new Image("", pn.id, p.url)
            .fixLocation(17, y + 20)
            .fixSize(100, 25)
            .setDraggable(true)
            .addClass("draggable")
            .addAction({ type: "approach" })
            .enableDragTracking(
                this.dragStart.bind(this),
                this.dragEnd.bind(this)
            );

        //-----------------
        pn.openHeight = y + 54;
        pn.changeState();
    }
    //------------------------------RIGHT SIDE
    addrPane0() {
        let pn = this.stkRight.addPane("pn0", "");
        pn.showOverflow();
        new Label("lblTitle", "Working Title", pn.id)
            .fixLocation(30, 5)
            .fontSize(18)
            .bold();

        //CLOSE/OPEN buttons
        new BasicButton("btnCloseStkRight", "", pn.id)
            .fixSize(28, 28)
            .fixLocation(0, 2)
            .addClass("imagebutton")
            .bgImage("images/moveright.png")
            .bgImageFit()
            .addAction("closeStkRight")
            .listenForClicks(this.btnHandler.bind(this));

        this.btnOpenRight = new BasicButton("btnOpenStkRight", "", pn.id)
            .fixSize(28, 28)
            .fixLocation(-20, 2)
            .addClass("imagebutton")
            .bgImage("images/moveleft.png")
            .bgImageFit()
            .addAction("openStkRight")
            .listenForClicks(this.btnHandler.bind(this))
            .hide();

        //-----------------
        pn.openHeight = 36;
        pn.changeState();
        pn.hideHeaderLabel();
        pn.hideToggleButton();
    }
    addDisplaySettingsPane() {
        let pn = this.stkRight.addPane("pnDispSet", "Display Settings");
        let y = 30;

        //GRID/SCALE checkboxes
        let g = new Container("cntGrid", pn.id)
            .fixLocation(10, y)
            .fixSize(55, 18);

        let chk = new CustomCheckbox("", g.id, this.chgHandler.bind(this))
            .addClass("customcheck")
            .fixLocation(0, 0)
            .fixSize(16, 16)
            .addAction("chkGrid");
        new Label("", "Grid", g.id)
            .addClass("obj-label")
            .fixLocation(18, 0)
            .labelFor(chk.id);
        if (appData.displaySettings.bShowGrid) chk.check();

        this.cntScale = new Container("cntScale", pn.id)
            .fixLocation(70, y)
            .fixSize(90, 18);

        chk = new CustomCheckbox(
            "",
            this.cntScale.id,
            this.chgHandler.bind(this)
        )
            .addClass("customcheck")
            .fixLocation(0, 0)
            .fixSize(16, 16)
            .addAction("chkScale");

        new Label("", "Scale", this.cntScale.id)
            .addClass("obj-label")
            .fixLocation(18, 0)
            .labelFor(chk.id);
        if (appData.displaySettings.bShowScale) chk.check();
        if (!appData.displaySettings.bShowGrid) this.cntScale.hide();

        //GRID spacing
        y += 25;
        new Slider("", 5, 100, 5, appData.displaySettings.gridSpacing, pn.id)
            .fixLocation(5, y + 15)
            .setWidth(RIGHTBARWIDTH - 15)
            .listenForChanges(this.sliderHandler.bind(this))
            .addAction("sldGridSpacing")
            .addClass("slider");
        new Label("", "Grid Spacing", pn.id)
            .addClass("obj-label")
            .fixLocation(5, y);

        //DEFAULT FIX SIZE
        y += 40;
        new Label("", "Default Fix Size", pn.id)
            .addClass("obj-label")
            .fixLocation(5, y);
        new Slider("", 0.1, 20, 0.1, appData.displaySettings.baseFixSize, pn.id)
            .fixLocation(5, y + 15)
            .setWidth(RIGHTBARWIDTH - 15)
            .listenForChanges(this.sliderHandler.bind(this))
            .addAction("sldFixSize")
            .addClass("slider");

        //-----------------------
        pn.openHeight = y + 50;
        pn.changeState();
    }
    addColorsPane() {
        let pn = this.stkRight.addPane("pnColor", "Colors");
        let y = 30;
        //Background Color

        let c = new ColorInput(
            "",
            pn.id,
            appData.displaySettings.backgroundColor
        )
            .fixLocation(5, y)
            .fixSize(40, 26)
            .addAction("clrBackground")
            .addClass("inputcolor")
            .listenForChanges(this.colorHandler.bind(this));
        new Label("", "Base", pn.id)
            .addClass("obj-label")
            .fixLocation(50, y)
            .labelFor(c.id);

        y += 32;

        c = new ColorInput("", pn.id, appData.displaySettings.gridColor)
            .fixLocation(5, y)
            .fixSize(40, 26)
            .addAction("clrGrid")
            .addClass("inputcolor")
            .listenForChanges(this.colorHandler.bind(this));
        new Label("", "Grid", pn.id)
            .addClass("obj-label")
            .fixLocation(50, y)
            .labelFor(c.id);

        y += 32;

        c = new ColorInput("", pn.id, appData.displaySettings.fixStrokeColor)
            .fixLocation(5, y)
            .fixSize(40, 26)
            .addAction("clrFixStroke")
            .addClass("inputcolor")
            .listenForChanges(this.colorHandler.bind(this));
        new Label("", "Navaid Border", pn.id)
            .addClass("obj-label")
            .fixLocation(50, y)
            .labelFor(c.id);

        y += 32;
        c = new ColorInput("", pn.id, appData.displaySettings.fixFillColor)
            .fixLocation(5, y)
            .fixSize(40, 26)
            .addAction("clrFixFill")
            .addClass("inputcolor")
            .listenForChanges(this.colorHandler.bind(this));
        new Label("", "Navaid Fill", pn.id)
            .addClass("obj-label")
            .fixLocation(50, y)
            .labelFor(c.id);

        y += 32;
        c = new ColorInput("", pn.id, appData.displaySettings.rwyStrokeColor)
            .fixLocation(5, y)
            .fixSize(40, 26)
            .addAction("clrRwyStroke")
            .addClass("inputcolor")
            .listenForChanges(this.colorHandler.bind(this));
        new Label("", "Runway Border", pn.id)
            .addClass("obj-label")
            .fixLocation(50, y)
            .labelFor(c.id);

        y += 32;
        c = new ColorInput("", pn.id, appData.displaySettings.rwyFillColor)
            .fixLocation(5, y)
            .fixSize(40, 26)
            .addAction("clrRwyFill")
            .addClass("inputcolor")
            .listenForChanges(this.colorHandler.bind(this));
        new Label("", "Runway Fill", pn.id)
            .addClass("obj-label")
            .fixLocation(50, y)
            .labelFor(c.id);

        y += 32;
        c = new ColorInput(
            "",
            pn.id,
            appData.displaySettings.approachStrokeColor
        )
            .fixLocation(5, y)
            .fixSize(40, 26)
            .addAction("clrApproach")
            .addClass("inputcolor")
            .listenForChanges(this.colorHandler.bind(this));
        new Label("", "Approach", pn.id)
            .addClass("obj-label")
            .fixLocation(50, y)
            .labelFor(c.id);

        //-----------------------
        pn.openHeight = y + 40;
        pn.changeState();
    }
    addAnimatePane() {
        let pn = this.stkRight.addPane("pnAnimate", "Animation");
        new BasicButton("", "Start", pn.id)
            .addClass("basicbutton1")
            .fixLocation(5, 30)
            .fixSize(75, 24)
            .listenForClicks(this.btnHandler.bind(this))
            .addAction("animStart");

        new BasicButton("", "Stop", pn.id)
            .addClass("basicbutton1")
            .fixLocation(90, 30)
            .fixSize(75, 24)
            .listenForClicks(this.btnHandler.bind(this))
            .addAction("animStop");
        pn.openHeight = 100;
        //pn.changeState();
    }
    //* ------------      EVENT HANDLERS ------------------------------

    //* ----------- -------------- ------------ EVENT HANDLERS
    btnHandler(details) {
        if (details.action == "animStart") {
            this.animStart();
        } else if (details.action == "animStop") {
            this.animStop();
        } else if (details.action == "darkMode") {
            this.mode == "light" ? (this.mode = "dark") : (this.mode = "light");
            this.setDisplayMode();
        } else if (details.action == "closeStkLeft") {
            this.stkLeft.setX(-IMAGEBARWIDTH);
            this.stkLeft.bOpen = false;
            this.btnOpenLeft.visible = true;
        } else if (details.action == "openStkLeft") {
            this.stkLeft.setX(0);
            this.stkLeft.bOpen = true;
            this.btnOpenLeft.visible = false;
        } else if (details.action == "closeStkRight") {
            this.stkRight.setX(this.w);
            this.stkRight.bOpen = false;
            this.btnOpenRight.visible = true;
        } else if (details.action == "openStkRight") {
            this.stkRight.setX(this.w - RIGHTBARWIDTH);
            this.stkRight.bOpen = true;
            this.btnOpenRight.visible = false;
        } else {
            console.log(details);
        }
    }
    sliderHandler(details) {
        //console.log(details);
        if (details.action == "sldFixSize") {
            appData.displaySettings.baseFixSize = Number(details.value);
            appData.changeBaseFixSize();
        } else if (details.action == "sldGridSpacing") {
            appData.displaySettings.gridSpacing = Number(details.value);
            console.log(appData.displaySettings.gridSpacing);
        }
        this.triggerRedraw(false);
        appData.saveDisplaySettings();
    }
    dragStart(details) {
        $(details.draggedItemID).setOpacity(0.5);
        //console.log(details);
    }
    dragEnd(details) {
        $(details.draggedItemID).setOpacity(1);
        //console.log(details);
    }
    chgHandler(details) {
        if (details.action == "chkGrid") {
            appData.displaySettings.bShowGrid = details.status;
            if (!appData.displaySettings.bShowGrid) this.cntScale.hide();
            else this.cntScale.show();
        } else if (details.action == "chkScale") {
            appData.displaySettings.bShowScale = details.status;
        } else if (details.action == "langDropdown") {
            changeLanguage(Number(details.sender.getSelection().index));
        } else {
            console.log(details);
        }
        this.triggerRedraw(true);
        appData.saveDisplaySettings();
    }
    colorHandler(details) {
        if (details.action == "clrBackground") {
            appData.displaySettings.backgroundColor = details.value;
        } else if (details.action == "clrGrid") {
            appData.displaySettings.gridColor = details.value;
        } else if (details.action == "clrFixStroke") {
            appData.displaySettings.fixStrokeColor = details.value;
        } else if (details.action == "clrFixFill") {
            appData.displaySettings.fixFillColor = details.value;
        } else if (details.action == "clrRwyStroke") {
            appData.displaySettings.rwyStrokeColor = details.value;
        } else if (details.action == "clrRwyFill") {
            appData.displaySettings.rwyFillColor = details.value;
        } else if (details.action == "clrApproach") {
            appData.displaySettings.approachStrokeColor = details.value;
        }
        this.triggerRedraw();
        appData.saveDisplaySettings();
    }
    keyboardHandler(details) {
        if (details.action == "Up") {
            if (details.key == "Delete") {
                appData.deleteDisplayItem();
            }
        }
    }
    //* ------------      ACTIONS ------------------------------
    triggerRedraw(needsUpdate) {
        this.cntDisplay.redraw(needsUpdate);
    }
    //* ------------      TESTERS ------------------------------
}
//*------------------------ Supporting UI Classes
class DisplayContainer extends Container {
    constructor(id, parentid) {
        super(id, parentid);
        this.relativeSize(100, 100);
        //create the canvas
        new Canvas("canvas", id).fixLocation(0, 0).fillCanvas(220);
        // .addAction("canvasClick");
        // .listenForDragging(this.dragHandler.bind(this))
        // .listenForWheel(this.wheelHandler.bind(this));
        //create the svg surface
        new SVGContainer("cntSVG", id)
            .fixLocation(0, 0)
            .addAction("svgClick")
            .listenForDragging(this.dragHandler.bind(this))
            .listenForWheel(this.wheelHandler.bind(this))
            .listenForClicks(this.clickHandler.bind(this));
        this.bDrawAxes = true;
        this.cntSVG.enableDropTracking(this.catchDropped.bind(this));
    }
    resize(w, h) {
        this.canvas.resize(w, h);
        this.cntSVG.fixSize(w, h);
        //update the static Pos2d values
        Pos2d.updateScreenSize(w, h);
        this.redraw(true);
    }
    //get items dropped on canvas
    catchDropped(details) {
        //console.log(details);
        //determine the center of the dropped position:
        let info = details.draggedItemDetails;
        let dX = info.draggedItemSize.w / 2 - info.draggedItemOffset.x;
        let dY = info.draggedItemSize.h / 2 - info.draggedItemOffset.y;
        //console.log("dX, dY: ", dX, dY);
        let dispX = details.offset.x + dX;
        let dispY = details.offset.y + dY;

        if (info.action.type == "fix") {
            //console.log("fix dropped at: " + dispX + "," + dispY);
            let size = appData.displaySettings.baseFixSize;
            let f = appData.aFixImage[info.action.index];
            new Fix(f, dispX, dispY);
            this.redraw();
        } else if (info.action.type == "runway") {
            let f = appData.aAirportImage[0];
            new Runway(dispX, dispY, f.displaySize.w, f.displaySize.h);
            this.redraw();
        } else if (info.action.type == "approach") {
            let f = appData.aAirportImage[1];
            new Approach(dispX, dispY, f.displaySize.w, f.displaySize.h);
            this.redraw();
        }
    }
    //---------------------------------------event handlers
    wheelHandler(delta) {
        if (delta < 0) {
            Pos2d.zoomIn();
        } else {
            Pos2d.zoomOut();
        }
        this.redraw(true);
    }
    dragHandler(delta) {
        //console.log(delta);
        if (delta.target == this.cntSVG) {
            let x = Pos2d.getWorldDistance(delta.x);
            let y = Pos2d.getWorldDistance(delta.y);
            Pos2d.incrementViewCenter(x, y);
            this.redraw(true);
        } else if (delta.target.type == "dragHandle") {
            //means we are dragging a dragHandler circle
            delta.target.containingObject.dragHandle(
                delta.target.index,
                delta.x,
                delta.y
            );
        } else {
            //console.log(delta.event.target.owner.id);
            let item = appData.getItemFromIconID(delta.target.id);
            if (item) {
                item.moveItem(delta.x, delta.y);
            }
        }
    }
    clickHandler(details) {
        //console.log(details);
        let item = appData.getItemFromIconID(details.clicktarget.id);
        //console.log(item);
        //if (item && item.hasOwnProperty("type")) console.log(item.type);
        if (item && item.type) {
            //console.log("slct");
            appData.itemSelected = item;
        } else {
            appData.itemSelected = null;
        }
        this.redraw(true);
    }
    //* ----------- -------------- ------------ DRAWING
    redraw(needsUpdate = false) {
        this.canvas.fillCanvas(appData.displaySettings.backgroundColor);
        if (appData.displaySettings.bShowGrid) this.drawGrid();
        appData.renderAll(needsUpdate);
    }
    drawGrid() {
        this.canvas.strokeStyle(appData.displaySettings.gridColor);
        this.canvas.weight = 1;
        let extent = 201;
        for (let x = 0; x > -extent; x -= appData.displaySettings.gridSpacing) {
            let p1 = Pos2d.displayFromPos(x, -200);
            let p2 = Pos2d.displayFromPos(x, 200);
            if (x == 0) this.canvas.weight = 2;
            else this.canvas.weight = 1;
            this.canvas.drawLinePoints(p1, p2);
        }

        for (let y = 0; y < extent; y += appData.displaySettings.gridSpacing) {
            let p1 = Pos2d.displayFromPos(-200, y);
            let p2 = Pos2d.displayFromPos(200, y);
            if (y == 0) this.canvas.weight = 2;
            else this.canvas.weight = 1;
            this.canvas.drawLinePoints(p1, p2);
        }
        for (let y = 0; y > -extent; y -= appData.displaySettings.gridSpacing) {
            let p1 = Pos2d.displayFromPos(-200, y);
            let p2 = Pos2d.displayFromPos(200, y);
            if (y == 0) this.canvas.weight = 2;
            else this.canvas.weight = 1;
            this.canvas.drawLinePoints(p1, p2);
        }

        for (let x = 0; x < extent; x += appData.displaySettings.gridSpacing) {
            let p1 = Pos2d.displayFromPos(x, -200);
            let p2 = Pos2d.displayFromPos(x, 200);
            if (x == 0) this.canvas.weight = 2;
            else this.canvas.weight = 1;
            this.canvas.drawLinePoints(p1, p2);
        }

        if (appData.displaySettings.bShowScale) {
            for (
                let x = 0;
                x < extent;
                x += appData.displaySettings.gridSpacing
            ) {
                let p3 = Pos2d.displayFromPos(x, 0);
                this.canvas.fillStyle(appData.displaySettings.backgroundColor);
                this.canvas.strokeStyle(
                    appData.displaySettings.backgroundColor
                );
                this.canvas.rectangle(p3.x - 10, p3.y - 10, 20, 12, true);
                this.canvas.fillStyle(appData.displaySettings.gridColor);
                this.canvas.drawText(x, 12, p3.x - 5, p3.y - 5);
            }
        }
    }
}
//*------------------------APP TRIGGER & STARTUP
function setup() {
    main = new UI();
    setTimeout(launch, 100);
}
function launch() {
    console.log(`Application started: ${new Date().toString()}`);
    clearLoadingAssets();
}
function clearLoadingAssets() {
    let a = $("msg1");
    a.parentNode.removeChild(a);
    //window.removeEventListener("load", clearLoadingAssets);
}
//window.addEventListener("load", clearLoadingAssets);
appData = new AppData(setup);
