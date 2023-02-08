const IMAGEBARWIDTH = 134
const TOPBARHEIGHT = 28
const LEFTBARWIDTH = 60
const EDITMODE = "editmode"
const ANIMATEMODE = "animatemode"
const MSGSETTINGS = "msgsettings"
const MSGREDRAW = "msgredraw"
const MSGADD = "msgadd"
const MSGSELECT = "msgselect"
const MSGDELETE = "msgdelete"
const MSGUI = "msgui"
const MSGSHAPECONTROLS = "msgshapecontrols"
const MSGOBJECTEDIT = "msgobjectedit"
const MSGAIRWAYCHANGE = "msgairwaychange"
//last 5FEB0745
//*------------------------APP DIRECTOR
class AppDirector extends ApplicationDirector {
    constructor(completedCallback) {
        super()
        this.createDisplaySettings()
        this.completedCallback = completedCallback
        //get dark or light mode
        this.darkMode = localStorage.getItem("displaymode")
        if (this.darkMode !== "dark" && this.darkMode !== "light") {
            this.darkMode = "light"
            this.saveDisplayModeToStorage()
        }
        this.setDisplayMode()
        //set the current app mode to nothing
        //TODO set to null - don't show add/edit stuff at startup
        this.appMode = EDITMODE
        //listen for system messages
        document.addEventListener(
            "systemmessage",
            this.processSystemMessage.bind(this)
        )
        //open the language file which triggers the rest of loading
        this.openFile(
            "data/ui_language.csv",
            this.processTranslations.bind(this)
        )
    }
    processTranslations(data) {
        let lines = data.split("\n")
        //console.log(lines);
        let lans = lines.shift().split(",")
        let translations = []
        while (lines.length) {
            let chunks = lines.shift().split(",")
            if (chunks.length < 2) continue
            translations.push(chunks)
        }
        //enable multilingual support
        enableMultilingual(lans, translations)

        this.setup().then(() => {
            setTimeout(this.completedCallback, 100)
        })
    }
    async setup() {
        //Load Fixes
        this.aFixImage = []
        let base = "images/fixes/"
        let fixConfigs = ["square", "triangle", "star", "diamond", "circle"]
        for (let i = 0; i < 11; i++) {
            let url = base + "fix" + i + ".png"
            let pic = await this.loadImage(url)
            if (i < 5) pic.fixType = fixConfigs[i]
            else pic.fixType = "bmp"
            this.aFixImage.push(pic)
        }
        //Load Airport Items
        this.aAirportImage = []
        base = "images/airport/"
        let aAPurl = ["runway", "app2", "airway", "sua"]
        for (let i = 0; i < aAPurl.length; i++) {
            let url = base + aAPurl[i]
            let pic = await this.loadImage(url + ".png")
            pic.type = aAPurl[i]
            pic.displaySize = { w: 100, h: 25 }
            if (i == 3) pic.displaySize = { w: 40, h: 40 }
            this.aAirportImage.push(pic)
        }

        this.aShapeImage = []
        base = "images/shapes/"
        let aSurl = ["line", "circle", "polygon", "letter"]
        for (let i = 0; i < aSurl.length; i++) {
            let url = base + aSurl[i] + ".png"
            let pic = await this.loadImage(url)
            pic.type = aSurl[i]
            pic.displaySize = { w: 64, h: 64 }
            if (i == 0) pic.displaySize = { w: 64, h: 20 }
            this.aShapeImage.push(pic)
        }

        return null
    }
    //* ------------        Display Settings & Mode
    createDisplaySettings() {
        let dis = localStorage.getItem("displaysettings")
        if (dis) {
            this.displaySettings = JSON.parse(dis)
        } else {
            this.displaySettings = {
                bShowGrid: true,
                gridSpacing: 5,
                gridColor: "#ACAAAA",
                backgroundColor: "#787878",
                bShowScale: true,
                baseFixSize: 2.4,
                fixStrokeColor: "#303030FF",
                fixFillColor: "#FFFFFF80",
                fixStrokeWeight: 2,
                labelFontColor: "#00529c",
                labelFontSize: 20,
                bShowLabels: false,
                rwyStrokeColor: "#f0f0f0FF",
                rwyFillColor: "#232428b0",
                rwyStrokeWeight: 3,
                approachStrokeColor: "#C0C0C0FF",
                approachStrokeWeight: 1,
                selectedColor: "#FFFF00",
                airwayStrokeColor: "#000000",
                airwayStrokeWeight: 3,
                suaStrokeColor: "#FFFFFFFF",
                suaFillColor: "#f91f1f80",
                suaStrokeWeight: 3,
                shapeStrokeColor: "#303030FF",
                shapeFillColor: "#00529c80",
                shapeStrokeWeight: 2,
            }
            this.saveDisplaySettings()
        }
        this.aDisplayObjects = []
        this.itemSelected = null
    }
    saveDisplaySettings() {
        localStorage.setItem(
            "displaysettings",
            JSON.stringify(this.displaySettings)
        )
    }
    saveDisplayModeToStorage() {
        localStorage.setItem("displaymode", this.darkMode)
    }
    setDisplayMode() {
        if (this.darkMode === "light") {
            document
                .getElementById("pagestyle")
                .setAttribute("href", "css/applight.css")
        } else {
            document
                .getElementById("pagestyle")
                .setAttribute("href", "css/appdark.css")
        }
        this.saveDisplayModeToStorage()
    }
    connectDisplay(dc) {
        this.dispCnt = dc
    }
    sortObjects() {
        //sort array by layer number
        this.aDisplayObjects.sort((a, b) => a.layer - b.layer)
        for (let i = 0; i < this.aDisplayObjects.length; i++) {
            this.aDisplayObjects[i].index = i
        }
    }
    changeBaseFixSize() {
        for (let i = 0; i < this.aDisplayObjects.length; i++) {
            let f = this.aDisplayObjects[i]
            if (f.type == "fix") {
                if (!f.bOverrideSize) {
                    f.updateSize(this.displaySettings.baseFixSize)
                }
            }
        }
    }
    getItemFromIconID(testID) {
        return this.aDisplayObjects.find((item) => item.icon.id == testID)
    }
    getItemPosFromFixDesignator(d) {
        for (let i = 0; i < this.aDisplayObjects.length; i++) {
            let item = this.aDisplayObjects[i]
            if (item.type == "fix") {
                if (item.desig == d) {
                    return {
                        x: item.pos.x,
                        y: item.pos.y,
                    }
                }
            }
        }
        return false
    }
    getWithinFixRadius(v) {
        for (let i = 0; i < this.aDisplayObjects.length; i++) {
            let item = this.aDisplayObjects[i]
            if (item.type == "fix") {
                let dist = v.distanceFrom(item.pos)
                if (dist < item.size) return item.desig
            }
        }
        return false
    }
    deleteDisplayItem() {
        if (this.itemSelected) {
            //console.log(this.itemSelected)
            this.itemSelected.destructor()
            this.aDisplayObjects.splice(this.itemSelected.index, 1)
            this.itemSelected = null
            this.sortObjects()
            this.sendRedraw(false)
            main.itemEditor.activate(null)
        }
    }
    //* ------------        System Messaging Handler
    processSystemMessage(e) {
        //console.log(e.detail)
        if (e.detail.type == MSGREDRAW) {
            this.sendRedraw(e.detail.setting)
        } else if (e.detail.type == MSGADD) {
            this.addDisplayObject(e.detail.setting, e.detail.value)
        } else if (e.detail.type == MSGSETTINGS) {
            this.processSettingsChange(e.detail.setting, e.detail.value)
        } else if (e.detail.type == MSGDELETE) {
            this.deleteDisplayItem()
        } else if (e.detail.type == "msg-display-connect") {
            this.connectDisplay(e.detail.value)
        } else if (e.detail.type == MSGUI) {
            this.processUIMessage(e.detail.setting, e.detail.value)
        } else if (e.detail.type == MSGSELECT) {
            this.processObjectSelection(e.detail.value)
        } else if (e.detail.type == MSGSHAPECONTROLS) {
            this.processShapeEditingMessage(e.detail.setting, e.detail.value)
        } else if (e.detail.type == MSGOBJECTEDIT) {
            this.processObjectEditing(e.detail.setting, e.detail.value)
        } else if (e.detail.type == MSGAIRWAYCHANGE) {
            this.processAirwayChange(e.detail.value)
        } else {
            console.log(e.detail)
        }
    }
    sendRedraw(bNeedsUpdate) {
        if (main && main.type) {
            main.cntDisplay.redraw(
                this.displaySettings,
                this.aDisplayObjects,
                bNeedsUpdate,
                this.itemSelected
            )
        }
    }
    addDisplayObject(objType, details) {
        if (objType == "fix") {
            let f = this.aFixImage[details.index]
            let fix = new Fix(
                f,
                details.locX,
                details.locY,
                this.displaySettings,
                this.dispCnt,
                this.aDisplayObjects
            )
            this.itemSelected = fix
        } else if (objType == "runway") {
            let f = this.aAirportImage[0]
            let rwy = new Runway(
                details.locX,
                details.locY,
                f.displaySize.w,
                f.displaySize.h,
                this.displaySettings,
                this.dispCnt,
                this.aDisplayObjects
            )
            this.itemSelected = rwy
        } else if (objType == "approach") {
            let f = this.aAirportImage[1]
            let rwy = new Approach(
                details.locX,
                details.locY,
                f.displaySize.w,
                f.displaySize.h,
                this.displaySettings,
                this.dispCnt,
                this.aDisplayObjects
            )
            this.itemSelected = rwy
        } else if (objType == "airway") {
            let airway = new Airway(
                details.locX,
                details.locY,
                this.displaySettings,
                this.dispCnt,
                this.aDisplayObjects
            )
            this.itemSelected = airway
        } else if (objType == "sua") {
            let sua = new Sua(
                details.locX,
                details.locY,
                this.displaySettings,
                this.dispCnt,
                this.aDisplayObjects
            )
            this.itemSelected = sua
        } else if (objType == "line") {
            let item = new LineShape(
                details.locX,
                details.locY,
                this.displaySettings,
                this.dispCnt,
                this.aDisplayObjects
            )
            this.itemSelected = item
        } else if (objType == "circle") {
            let item = new CircleShape(
                details.locX,
                details.locY,
                this.displaySettings,
                this.dispCnt,
                this.aDisplayObjects
            )
            this.itemSelected = item
        } else if (objType == "polygon") {
            let item = new PolygonShape(
                details.locX,
                details.locY,
                this.displaySettings,
                this.dispCnt,
                this.aDisplayObjects
            )
            this.itemSelected = item
        } else if (objType == "text") {
            let item = new TextShape(
                details.locX,
                details.locY,
                this.displaySettings,
                this.dispCnt,
                this.aDisplayObjects
            )
            this.itemSelected = item
        } else {
            console.log(objType, details)
            return
        }

        this.sortObjects()
        this.sendRedraw(false)
        main.itemEditor.activate(this.itemSelected)
    }
    processSettingsChange(setting, details) {
        //console.log(setting, details)
        if (setting == "baseFixSize") {
            this.displaySettings[setting] = details
            this.changeBaseFixSize()
            this.sendRedraw(false)
        } else {
            this.displaySettings[setting] = details
            this.sendRedraw(false)
        }
        this.saveDisplaySettings()
    }
    processUIMessage(setting, details) {
        //console.log(setting, details)
        if (setting == "dispSettingsWindow") {
            main.wnSettings.show()
        } else if (setting == "toggleDarkMode") {
            this.darkMode == "light"
                ? (this.darkMode = "dark")
                : (this.darkMode = "light")
            this.setDisplayMode()
        } else if (setting == "changeAppMode") {
            this.appMode = details
            main.useAppMode(this.appMode)
        } else if (setting == "gridToggle") {
            console.log("gridToggle")
            this.displaySettings.bShowGrid = !this.displaySettings.bShowGrid
            this.sendRedraw(false)
            this.saveDisplaySettings()
        } else if (setting == "labelToggle") {
            console.log("labelToggle")
            this.displaySettings.bShowLabels = !this.displaySettings.bShowLabels
            this.sendRedraw(false)
            this.saveDisplaySettings()
        } else {
            console.log(setting, details)
        }
    }
    processObjectSelection(item) {
        this.itemSelected = item
        main.itemEditor.activate(item)
    }
    processShapeEditingMessage(source, details) {
        //console.log(source, details)
        if (source == "Navaid Defaults") {
            if (details.type == "strokeColor") {
                this.displaySettings.fixStrokeColor = details.value
            } else if (details.type == "fillColor") {
                this.displaySettings.fixFillColor = details.value
            } else if (details.type == "strokeWeight") {
                this.displaySettings.fixStrokeWeight = details.value
            }
        } else if (source == "Runway Defaults") {
            if (details.type == "strokeColor") {
                this.displaySettings.rwyStrokeColor = details.value
            } else if (details.type == "fillColor") {
                this.displaySettings.rwyFillColor = details.value
            } else if (details.type == "strokeWeight") {
                this.displaySettings.rwyStrokeWeight = details.value
            }
        } else if (source == "Approach Defaults") {
            if (details.type == "strokeColor") {
                this.displaySettings.approachStrokeColor = details.value
            } else if (details.type == "strokeWeight") {
                this.displaySettings.approachStrokeWeight = details.value
            }
        } else if (source == "Airway Defaults") {
            if (details.type == "strokeColor") {
                this.displaySettings.airwayStrokeColor = details.value
            } else if (details.type == "strokeWeight") {
                this.displaySettings.airwayStrokeWeight = details.value
            }
        } else if (source == "SUA Defaults") {
            if (details.type == "strokeColor") {
                this.displaySettings.suaStrokeColor = details.value
            } else if (details.type == "fillColor") {
                this.displaySettings.suaFillColor = details.value
            } else if (details.type == "strokeWeight") {
                this.displaySettings.suaStrokeWeight = details.value
            }
        } else if (source == "Shape Defaults") {
            if (details.type == "strokeColor") {
                this.displaySettings.shapeStrokeColor = details.value
            } else if (details.type == "fillColor") {
                this.displaySettings.shapeFillColor = details.value
            } else if (details.type == "strokeWeight") {
                this.displaySettings.shapeStrokeWeight = details.value
            }
        } else {
            source[details.type] = details.value
        }
        this.sendRedraw(false)
        this.saveDisplaySettings()
    }
    processObjectEditing(setting, details) {
        //console.log(setting, details)
        if (setting == "changeLayer") {
            this.itemSelected.changeLayer(Number(details))
            this.sortObjects()
        } else if (setting == "adjustFixSize") {
            this.itemSelected.bOverrideSize = true
            this.itemSelected.size = Number(details)
        } else if (setting == "changeDesignator") {
            this.itemSelected.desig = details
        } else if (setting == "numberPoints") {
            this.itemSelected.changeNumberOfVertices(details)
        } else if (setting == "changeDash0") {
            this.itemSelected.dashPattern[0] = Number(details)
        } else if (setting == "changeDash1") {
            this.itemSelected.dashPattern[1] = Number(details)
        } else if (setting == "changeRadius") {
            this.itemSelected.radius = Number(details)
        } else if (setting == "changeFontSize") {
            this.itemSelected.fontSize = Number(details)
        } else if (setting == "colorFont") {
            this.itemSelected.fontColor = details
        } else if (setting == "changeLabelText") {
            this.itemSelected.text = details
        } else {
            console.log(setting, details)
        }
        this.sendRedraw(false)
    }
    processAirwayChange(route) {
        main.itemEditor.processAirwayRouteChange()
    }
}
//*------------------------User Interface
class UI extends UIContainer {
    constructor(displaySettings) {
        super()
        this.displaySettings = displaySettings
        //get saved language from storage
        loadLanguageFromStorage()
        //set AOmode to center
        AO.RECTMODE = AO.CENTER
        //set up the display area
        new DisplayContainer("cntDisplay", "")
        //set up quick settings window middle top of the screen
        new QuickSettingsWindow("cntQuickSettings", "").fixLocation(50, 0)
        //create the left bar for adding items
        new VerticalAddWindow("leftAddBar", "")
        //create the Item Settings window
        new ItemEditor("itemEditor", "")
        //create the settings window
        new AppSettingsWindow(
            "wnSettings",
            this.displaySettings,
            "images/ui/close.svg",
            ""
        )
            .fixLocation(60, 50)
            .centerH()
        //Connect the display container to the Display Object Class
        dispatchMessage("msg-display-connect", null, this.cntDisplay)
        //Set up the initial zoom value
        Pos2d.zoom = 15
        //setup event listener for keypresses
        this.keyHandler = new KeyHandler(this.keyboardHandler.bind(this))
        //enable the animation loop
        this.enableAnimation(this.newFrame.bind(this))
        // this.animStart();
        //resize everything to the screen
        this.onResizeEvent()

        //test = new ShapeEditor('editShape', false, '').fixLocation(200, 200)
    }
    onResizeEvent() {
        this.w = this.getWidth()
        this.h = this.getHeight()
        this.cntDisplay.resize(this.w, this.h)
        this.leftAddBar.onResize(this.w, this.h)
        this.cntQuickSettings.centerH()
        this.itemEditor.onResize(this.w, this.h)
    }
    newFrame() {
        //clear the canvas
        //this.canvas.fillCanvas(51);
        console.log(this.frameRate())
    }
    useAppMode(mode) {
        if (mode == EDITMODE) {
            this.leftAddBar.show()
            this.itemEditor.show()
        } else if (mode == ANIMATEMODE) {
            this.leftAddBar.hide()
            this.itemEditor.hide()
        }
    }
    //TODO ------------Deal with RIGHT SIDE animation items
    addAnimatePane() {
        let pn = this.stkRight.addPane("pnAnimate", "Animation")
        new BasicButton("", "Start", pn.id)
            .addClass("basicbutton1")
            .fixLocation(5, 30)
            .fixSize(75, 24)
            .listenForClicks(this.btnHandler.bind(this))
            .addAction("animStart")

        new BasicButton("", "Stop", pn.id)
            .addClass("basicbutton1")
            .fixLocation(90, 30)
            .fixSize(75, 24)
            .listenForClicks(this.btnHandler.bind(this))
            .addAction("animStop")
        pn.openHeight = 100
        //pn.changeState();
    }
    // HANDLERS ----------------
    btnHandler(details) {
        if (details.action == "animStart") {
            this.animStart()
        } else if (details.action == "animStop") {
            this.animStop()
        } else {
            console.log(details)
        }
    }
    keyboardHandler(details) {
        if (details.action == "Up") {
            //console.log(details)
            if (details.key == "Delete") {
                dispatchMessage(MSGDELETE, null, null)
            }
        }
    }
    hideClutter() {
        //a way to close stuff that should be closed
        this.wnSettings.hide()
    }
}
//*------------------------APP TRIGGER & STARTUP
function setup() {
    main = new UI(director.displaySettings)
    setTimeout(launch, 100)
}
function launch() {
    console.log(`Application started: ${new Date().toString()}`)
    clearLoadingAssets()
    dispatchMessage(MSGREDRAW, true)
}
function clearLoadingAssets() {
    let a = $("msg1")
    a.parentNode.removeChild(a)
    //window.removeEventListener("load", clearLoadingAssets);
}
function dispatchMessage(type, setting, value) {
    let d = {
        type: type,
        setting: setting,
        value: value,
    }
    let e = new CustomEvent("systemmessage", { detail: d })
    document.dispatchEvent(e)
}
director = new AppDirector(setup)

function test() {
    let p = new svgPolyline("test", main.cntDisplay.cntSVG.id)
    p.addClass("svgLine")
    p.addPoint(2)
    p.update(0, 100, 100)
    p.update(1, 300, 500)
    return p
}
