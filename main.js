import {
    $,
    ApplicationDirector,
    UIContainer,
    enableMultilingual,
    loadLanguageFromStorage,
    AO,
    Container,
    DraggableWindow,
    Div,
    Canvas,
    SVGContainer,
    Label,
    BasicButton,
    HoldButton,
    StackManager,
    Image,
    TextInput,
    NumberInput,
    Slider,
    ColorInput,
    TextArea,
    SelectionBox,
    getLanguages,
    getCurrentLanguage,
    changeLanguage,
    CustomToggleSwitch,
    svgCircle,
    svgPolygon,
    svgRectangle,
    svgPolyline,
} from "./mod/ptui.1.0.0.mjs"
import {
    parseColorString,
    Hex2Dec,
    Pos2d,
    Point,
    Vector,
    HEX,
    ROUND,
    fScale,
} from "./mod/ptmath.1.0.0.mjs"
import { KeyHandler, removeBreaks } from "./mod/ptutil.1.0.0.mjs"
const LEFTBARWIDTH = 60
const EDITMODE = "editmode"
const ANIMATEMODE = "animatemode"
const FPMODE = "fpmode"
const MSGSETTINGS = "msgsettings"
const MSGREDRAW = "msgredraw"
const MSGADD = "msgadd"
const MSGSELECT = "msgselect"
const MSGDELETE = "msgdelete"
const MSGUI = "msgui"
const MSGSHAPECONTROLS = "msgshapecontrols"
const MSGOBJECTEDIT = "msgobjectedit"
const MSGAIRWAYCHANGE = "msgairwaychange"
const MSGWINDCHANGE = "msgwindchange"
const MSGFLIGHTEDIT = "msgflightedit"
const MSGTIMING = "msgtiming"
const MSGTOOLS = "msgtools"
var main
//*------------------------JS Extensions

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
        //set the current applic. mode to edit mode
        this.appMode = EDITMODE
        //set the fp editing flag to false
        this.bEditingFlightPlan = false
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
        //load the next file in sequence and process
        this.openFile("data/acperf.txt", this.processACPerf.bind(this))
    }
    processACPerf(data) {
        //create an array to hold the data
        let dataChunks = data.split("*")
        //delete first chunk which holds the header
        dataChunks.shift()
        //create an array in this to hold the ac perf information
        this.aACType = []
        dataChunks.forEach((item) => this.aACType.push(new ACType(item)))

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

        this.aACImage = []
        base = "images/aircraft/"
        for (let i = 0; i < 4; i++) {
            let url = base + "AC" + i + ".png"
            let pic = await this.loadImage(url)
            pic.displaySize = { w: 96, h: 96 }
            this.aACImage.push(pic)
        }

        //create the wind model
        this.windModel = new WindModel()

        //create the master Timer
        this.masterTimer = new MasterTimer()

        return null
    }
    //* ------------        Display Settings & Mode
    createDisplaySettings() {
        let dis = localStorage.getItem("displaysettings")

        //TODO delete next line - this reloads fresh display settings each time
        dis = null

        if (dis) {
            this.displaySettings = JSON.parse(dis)
        } else {
            this.displaySettings = {
                bShowGrid: true,
                bShowTags: true,
                acStrokeColor: "#548235FF",
                acStrokeWeight: 2,
                acFillColor: "#C5E0B480",
                acTagFontColor: "#FFFFFF",
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
                acBaseRadius: 15,
                acBaseTagSize: 14,

                bShowPTL: false,
                bShowRoute: false,
                bShowHalo: false,
                bShowSep: false,
                bShowScan: false,
                ptlLength: 2,
                haloSize: 5,
                scanRange: 30,
                sepWarnDistance: 10,
                sepLossDistance: 5,
                conflictDetectDistance: 40,

                ptlColor: "#FFFFFF",
                haloColor: "#20FF20",
                routeColor: "#C0C0C0",
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
            this.aDisplayObjects[i].adjustSVGZ()
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
            dispatchMessage(MSGREDRAW, false)
            main.itemEditor.activate(null)
        }
    }
    windChangeUpdate() {
        for (let i = 0; i < this.aDisplayObjects.length; i++) {
            if (this.aDisplayObjects[i].type == "aircraft") {
                this.aDisplayObjects[i].calculateStatic()
            }
        }
        dispatchMessage(MSGREDRAW, true)
    }
    staticTimeUpdate(dT) {
        for (let i = 0; i < this.aDisplayObjects.length; i++) {
            if (this.aDisplayObjects[i].type == "aircraft") {
                this.aDisplayObjects[i].updateStatic(dT)
            }
        }
        dispatchMessage(MSGREDRAW, true)
    }
    resetToZero() {
        for (let i = 0; i < this.aDisplayObjects.length; i++) {
            if (this.aDisplayObjects[i].type == "aircraft") {
                this.aDisplayObjects[i].resetToZero()
            }
        }
        dispatchMessage(MSGREDRAW, true)
    }
    setNewZero() {
        for (let i = 0; i < this.aDisplayObjects.length; i++) {
            if (this.aDisplayObjects[i].type == "aircraft") {
                this.aDisplayObjects[i].setNewZero()
            }
        }
        dispatchMessage(MSGREDRAW, true)
    }
    //* ------------        System Messaging Handler
    processSystemMessage(e) {
        //console.log(e.detail)
        if (e.detail.type == MSGREDRAW) {
            this.sendRedraw(e.detail.setting)
        } else if (e.detail.type == MSGADD) {
            main.hideClutter()
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
            main.hideClutter()
            this.processObjectSelection(e.detail.value)
        } else if (e.detail.type == MSGSHAPECONTROLS) {
            this.processShapeEditingMessage(e.detail.setting, e.detail.value)
        } else if (e.detail.type == MSGOBJECTEDIT) {
            this.processObjectEditing(e.detail.setting, e.detail.value)
        } else if (e.detail.type == MSGAIRWAYCHANGE) {
            this.processAirwayChange(e.detail.value)
        } else if (e.detail.type == MSGWINDCHANGE) {
            this.processWindChange(e.detail.setting, e.detail.value)
        } else if (e.detail.type == MSGFLIGHTEDIT) {
            this.processFlightChange(e.detail.setting, e.detail.value)
        } else if (e.detail.type == MSGTIMING) {
            this.processTimingMessage(e.detail.setting, e.detail.value)
        } else if (e.detail.type == MSGTOOLS) {
            this.processToolsDisplay(e.detail.setting, e.detail.value)
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
        } else if (objType == "aircraft") {
            let f = this.aACImage[details.index]
            //console.log(f, details)
            let ac = new Aircraft(
                details.index,
                details.locX,
                details.locY,
                this.displaySettings,
                this.dispCnt,
                this.aDisplayObjects,
                this.aACType
            )
            this.itemSelected = ac
        } else {
            console.log(objType, details)
            return
        }

        this.sortObjects()
        dispatchMessage(MSGREDRAW, true)
        main.itemEditor.activate(this.itemSelected)
    }
    processSettingsChange(setting, details) {
        console.log(setting, details)
        if (setting == "baseFixSize") {
            this.displaySettings[setting] = details
            this.changeBaseFixSize()
            dispatchMessage(MSGREDRAW, false)
        } else if (setting == "acBaseRadius") {
            this.displaySettings[setting] = details
            this.changeBaseACSize()
            dispatchMessage(MSGREDRAW, false)
        } else {
            this.displaySettings[setting] = details
            dispatchMessage(MSGREDRAW, false)
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
            //console.log(setting, details)
            if (this.appMode == details) {
                return
            }
            this.appMode = details
            main.useAppMode(this.appMode)
            dispatchMessage(MSGREDRAW, false)
            main.hideClutter()
        } else if (setting == "gridToggle") {
            //console.log("gridToggle")
            this.displaySettings.bShowGrid = !this.displaySettings.bShowGrid
            dispatchMessage(MSGREDRAW, false)
            this.saveDisplaySettings()
        } else if (setting == "labelToggle") {
            //console.log("labelToggle")
            this.displaySettings.bShowLabels = !this.displaySettings.bShowLabels
            dispatchMessage(MSGREDRAW, false)
            this.saveDisplaySettings()
        } else if (setting == "windEditorWindow") {
            main.wnWindEditor.show()
        } else if (setting == "miniNavWindow") {
            main.wnMiniNavPanel.toggleVisibility()
        } else if (setting == "activateFPEditor") {
            if (this.itemSelected.type != "aircraft") {
                console.error(
                    "error, somehow trying to activate FPEditor without a/c selected"
                )
                console.log(this.itemSelected)
                return
            }
            //we've selected to edit a FP, so hide info not wanted
            main.cntQuickSettings.hide()
            main.leftAddBar.hide()
            main.itemEditor.hide()
            main.wnFPEditor.activate(this.itemSelected)
            this.bEditingFlightPlan = true
            dispatchMessage(MSGREDRAW, false)
        } else if (setting == "finishFPEditor") {
            main.cntQuickSettings.show()
            main.leftAddBar.show()
            main.itemEditor.show()
            this.bEditingFlightPlan = false

            //take other action to update....
            dispatchMessage(MSGREDRAW, false)
        } else {
            console.log(setting, details)
        }
    }
    processObjectSelection(item) {
        if (this.bEditingFlightPlan) return
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
        } else if (source == "Aircraft Defaults") {
            //console.log(source, details)
            if (details.type == "strokeColor") {
                this.displaySettings.acStrokeColor = details.value
            } else if (details.type == "fillColor") {
                this.displaySettings.acFillColor = details.value
            } else if (details.type == "strokeWeight") {
                this.displaySettings.acStrokeWeight = details.value
            }
        } else {
            source[details.type] = details.value
        }
        dispatchMessage(MSGREDRAW, false)
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
        } else if (setting == "adjustTagSize") {
            this.itemSelected.tagSizeMult = Number(details)
        } else if (setting == "adjustTargetSize") {
            this.itemSelected.targetSizeMult = Number(details)
            this.itemSelected.changeSize()
        } else {
            console.log(setting, details)
        }
        dispatchMessage(MSGREDRAW, false)
    }
    processAirwayChange(route) {
        main.itemEditor.processAirwayRouteChange()
    }
    processWindChange(setting, details) {
        if (setting == "add") {
            this.windModel.addLayer(details.alt, details.dir, details.spd)
        } else {
            this.windModel.layers.splice(details, 1)
        }
        main.wnWindEditor.updateWinds(this.windModel)
        this.windChangeUpdate()
    }
    processFlightChange(setting, details) {
        if (setting == "changeIdent") {
            this.itemSelected.ident = details
        } else if (setting == "changeType") {
            this.itemSelected.changeACType(Number(details))
        } else if (setting == "changeAltitude") {
            this.itemSelected.changeAltitude(Number(details))
        } else {
            console.log(setting, details)
        }
        dispatchMessage(MSGREDRAW, false)
    }
    processTimingMessage(setting, value) {
        //console.log(setting, value)
        if (setting == "pan-time") {
            this.masterTimer.increment(value)
            this.staticTimeUpdate(value)
        } else if (setting == "resetToZero") {
            this.masterTimer.resetToZero()
            this.resetToZero()
        } else if (setting == "setZero") {
            this.masterTimer.resetToZero()
            this.setNewZero()
        }
    }
    processToolsDisplay(setting, value) {
        //console.log(setting, value)
        if (setting == "toggler") {
            this.displaySettings[value] = !this.displaySettings[value]
        } else {
            this.displaySettings[setting] = value
            //console.log(setting, value)
        }
        dispatchMessage(MSGREDRAW, false)
    }
}
class MasterTimer {
    constructor() {
        this.currentTime = 0 //in seconds
    }
    get timeText() {
        let t = this.calculateHMS(this.currentTime)

        let m = String(t.m)
        if (m.length < 2) m = "0" + m

        let s = String(Math.round(t.s))
        if (s.length < 2) s = "0" + s

        let text = t.h + ":" + m + ":" + s
        if (this.currentTime < 0) {
            text = "-" + text
        }

        return text
    }
    calculateHMS(time) {
        let t = Math.abs(time)

        let h = Math.floor(t / 3600)
        t -= h * 3600

        let m = Math.floor(t / 60)
        t -= m * 60

        return {
            h: h,
            m: m,
            s: t,
        }
    }
    increment(val) {
        this.currentTime += val
        main.wnTimeControl.updateDisplay(this.timeText)
    }
    resetToZero() {
        this.currentTime = 0 //in seconds
        main.wnTimeControl.updateDisplay(this.timeText)
    }
}
//*------------------------APP TRIGGER & STARTUP
function setup() {
    main = new UI(director.displaySettings)
    window.main = main
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
const director = new AppDirector(setup)
window.director = director
window.main = main
window.Pos2d = Pos2d
window.fScale = fScale
window.$ = $
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
        new QuickSettingsWindow("cntQuickSettings", "").setMode(EDITMODE)
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
            .fixLocation(60, 90)
            .centerH()
        //create the draggable wind editor
        new WindEditor("wnWindEditor", "images/ui/close.svg", "")
            .fixLocation(100, 120)
            .centerH()
            .title("Wind Editor")
        //create the timeline Window
        new TimeControlWindow("wnTimeControl", "")

        //add the route editing panel
        new FPEditor("wnFPEditor", "images/ui/close.svg", "")
            .fixLocation(100, 420)
            .centerH()
            .title("Flight Plan Editor")

        new MiniNavPanel("wnMiniNavPanel", "").hide()

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
    }
    onResizeEvent() {
        this.w = this.getWidth()
        this.h = this.getHeight()
        this.cntDisplay.resize(this.w, this.h)
        this.leftAddBar.onResize(this.w, this.h)
        this.cntQuickSettings.centerH()
        this.itemEditor.onResize(this.w, this.h)

        //adjust the location of the timeline window to bottom of screen
        this.wnTimeControl
            .fixLocation(0, this.h - this.wnTimeControl.getHeight())
            .centerH()

        //check if any draggable windows offscreen
        let draggables = ["wnSettings", "wnWindEditor", "wnFPEditor"]
        draggables.forEach((item) => {
            let w = $(item)
            if (w.x + w.w < 0) {
                w.setX(0)
            } else if (w.y + w.h < 0) {
                w.setY(0)
            } else if (w.x > this.w) {
                w.setX(this.w - w.w)
            } else if (w.y > this.h) {
                w.setY(this.h - w.h)
            }
        })
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
            this.wnTimeControl.show()
        } else if (mode == ANIMATEMODE) {
            this.leftAddBar.hide()
            this.itemEditor.hide()
            this.wnTimeControl.hide()
        }
        this.cntQuickSettings.setMode(mode)
    }

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
        this.wnWindEditor.hide()
    }
}
//*------------------------User Interface Classes
class DisplayContainer extends Container {
    constructor(id, parentid) {
        super(id, parentid)
        this.relativeSize(100, 100)
        //create the canvas
        new Canvas("canvas", id).fixLocation(0, 0).fillCanvas(220)
        // .addAction("canvasClick");
        // .listenForDragging(this.dragHandler.bind(this))
        // .listenForWheel(this.wheelHandler.bind(this));
        //create the svg surface
        new SVGContainer("cntSVG", id)
            .fixLocation(0, 0)
            .addAction("svgClick")
            .listenForDragging(this.dragHandler.bind(this))
            .listenForWheel(this.wheelHandler.bind(this))
            .listenForClicks(this.clickHandler.bind(this))
        this.bDrawAxes = true
        this.cntSVG.enableDropTracking(this.catchDropped.bind(this))
    }
    resize(w, h) {
        this.canvas.resize(w, h)
        this.cntSVG.fixSize(w, h)
        //update the static Pos2d values
        Pos2d.updateScreenSize(w, h)
        dispatchMessage(MSGREDRAW, true)
    }
    //get items dropped on canvas
    catchDropped(details) {
        //console.log(details)
        //determine the center of the dropped position:
        let info = details.draggedItemDetails
        let dX = info.draggedItemSize.w / 2 - info.draggedItemOffset.x
        let dY = info.draggedItemSize.h / 2 - info.draggedItemOffset.y
        //console.log("dX, dY: ", dX, dY);
        let dispX = details.offset.x + dX
        let dispY = details.offset.y + dY
        if (info.action.type == "fix" || info.action.type == "aircraft") {
            //console.log("fix dropped at: " + dispX + "," + dispY);
            let d = {
                index: info.action.index,
                locX: dispX,
                locY: dispY,
            }
            dispatchMessage(MSGADD, info.action.type, d)
        } else {
            let d = {
                index: 0,
                locX: dispX,
                locY: dispY,
            }
            dispatchMessage(MSGADD, info.action.type, d)
        }
    }
    //---------------------------------------event handlers
    wheelHandler(delta) {
        if (delta < 0) {
            Pos2d.zoomIn()
        } else {
            Pos2d.zoomOut()
        }
        dispatchMessage(MSGREDRAW, true)
    }
    dragHandler(delta) {
        //console.log(delta)
        if (delta.target == this.cntSVG) {
            let x = Pos2d.getWorldDistance(delta.x)
            let y = Pos2d.getWorldDistance(delta.y)
            Pos2d.incrementViewCenter(x, y)
            dispatchMessage(MSGREDRAW, true)
        } else if (delta.target.type == "dragHandle") {
            //means we are dragging a dragHandler circle
            let item = delta.target.containingObject
            item.dragHandle(delta.target.index, delta.x, delta.y)
        } else if (delta.target.type == "datatag") {
            //means we are dragging a datatag
            //console.log(delta.target)
            delta.target.containingObject.dragTag(delta.x, delta.y)
            dispatchMessage(MSGREDRAW, false)
        } else if (delta.target.type == "rotateHandle") {
            let ac = delta.target.containingObject
            ac.rotate(delta.x, delta.y)
        } else {
            //console.log(delta.event.target.owner.id);
            let item = director.getItemFromIconID(delta.target.id)
            if (item) {
                item.moveItem(delta.x, delta.y)
            }
        }
    }
    clickHandler(details) {
        //console.log(details)
        //get item handle if it is a display object
        let item = director.getItemFromIconID(details.clicktarget.id)
        if (item && item.type) {
            //console.log(item)
            dispatchMessage(MSGSELECT, null, item)
        } else if (
            details.clicktarget &&
            details.clicktarget.type == "datatag"
        ) {
            // dispatchMessage(
            //     MSGSELECT,
            //     null,
            //     details.clicktarget.containingObject
            // )
        } else if (
            details.clicktarget &&
            details.clicktarget.action == "dragHandle"
        ) {
            //do nothing because it is still selected
        } else if (
            details.clicktarget &&
            details.clicktarget.action == "rotateHandle"
        ) {
            //do nothing because it is still selected
        } else {
            //we've clicked on the canvas
            dispatchMessage(MSGSELECT, null, null)
        }
        dispatchMessage(MSGREDRAW, true)
    }
    //* ----------- -------------- ------------ DRAWING
    redraw(settings, items, needsUpdate, itemSelected) {
        this.canvas.fillCanvas(settings.backgroundColor)
        if (settings.bShowGrid) this.drawGrid(settings)
        items.forEach((item) => item.draw(itemSelected))
    }
    drawGrid(settings) {
        this.canvas.strokeStyle(settings.gridColor)
        this.canvas.weight = 1
        let extent = 201
        for (let x = 0; x > -extent; x -= settings.gridSpacing) {
            let p1 = Pos2d.displayFromPos(x, -200)
            let p2 = Pos2d.displayFromPos(x, 200)
            if (x == 0) this.canvas.weight = 2
            else this.canvas.weight = 1
            this.canvas.drawLinePoints(p1, p2)
        }

        for (let y = 0; y < extent; y += settings.gridSpacing) {
            let p1 = Pos2d.displayFromPos(-200, y)
            let p2 = Pos2d.displayFromPos(200, y)
            if (y == 0) this.canvas.weight = 2
            else this.canvas.weight = 1
            this.canvas.drawLinePoints(p1, p2)
        }
        for (let y = 0; y > -extent; y -= settings.gridSpacing) {
            let p1 = Pos2d.displayFromPos(-200, y)
            let p2 = Pos2d.displayFromPos(200, y)
            if (y == 0) this.canvas.weight = 2
            else this.canvas.weight = 1
            this.canvas.drawLinePoints(p1, p2)
        }

        for (let x = 0; x < extent; x += settings.gridSpacing) {
            let p1 = Pos2d.displayFromPos(x, -200)
            let p2 = Pos2d.displayFromPos(x, 200)
            if (x == 0) this.canvas.weight = 2
            else this.canvas.weight = 1
            this.canvas.drawLinePoints(p1, p2)
        }

        if (director.displaySettings.bShowScale) {
            for (let x = 0; x < extent; x += settings.gridSpacing) {
                let p3 = Pos2d.displayFromPos(x, 0)
                this.canvas.fillStyle(settings.backgroundColor)
                this.canvas.strokeStyle(settings.backgroundColor)
                this.canvas.rectangle(p3.x - 10, p3.y - 10, 20, 12, true)
                this.canvas.fillStyle(settings.gridColor)
                this.canvas.drawText(x, 12, p3.x - 5, p3.y - 5)
            }
        }
    }
}
class AppSettingsWindow extends DraggableWindow {
    constructor(id, displaySettings, closeImgURL, parentid = null) {
        super(id, closeImgURL, parentid)
        let uid = this.id
        //console.log(uid)
        this.displaySettings = displaySettings
        this.fixSize(300, 125)
            .assignClasses("wn-draggable-main", "wn-titlebar", "imagebutton")
            .addAction("wnSettings")
            .getCloseNotifications(this.clickHandler.bind(this))
            .hide()

        this.addControlButtons(uid)
        this.addInterfaceSection(uid)
        this.addDisplaySection(uid)
        this.addDefaultsSection(uid)
        this.addToolsSection(uid)

        this.clickHandler({ action: "btnTools" })
    }
    addControlButtons(id) {
        //add mini buttons down left for groups of items
        this.btnInterface = new BasicButton("", "Interface", id)
            .fixLocation(5, 35)
            .addClass("min-button")
            .addAction("btnInterface")
            .listenForClicks(this.clickHandler.bind(this))
        this.btnDisplaySettings = new BasicButton("", "Display", id)
            .fixLocation(5, 60)
            .addClass("min-button")
            .addAction("btnDisplaySettings")
            .listenForClicks(this.clickHandler.bind(this))
        this.btnDefaultSettings = new BasicButton("", "Object Defaults", id)
            .fixLocation(5, 85)
            .setWidth(95)
            .addClass("min-button")
            .addAction("btnDefaultSettings")
            .listenForClicks(this.clickHandler.bind(this))

        this.btnTools = new BasicButton("", "Target Tools", id)
            .fixLocation(5, 125)
            .setWidth(95)
            .addClass("min-button")
            .addAction("btnTools")
            .listenForClicks(this.clickHandler.bind(this))
    }
    addInterfaceSection(id) {
        this.cntInterfaceSettings = new Div("", id)
            .fixLocation(100, 22)
            .fixSize(200, 100)
            .hide()
        new Image("", this.cntInterfaceSettings.id, "images/ui/lang.png")
            .fixLocation(30, 5)
            .fixSize(100, 60)

        //dropdown for language choice
        let s = new SelectionBox("", this.cntInterfaceSettings.id)
            .fixLocation(20, 80)
            .fixSize(155, 20)
            .listenForChanges(this.changeHandler.bind(this))
            .addAction("langDropdown")
            .addClass("dropdown")
        let langs = getLanguages()
        for (let i = 0; i < langs.length; i++) {
            s.addOption(i, langs[i])
        }
        s.selectOption(getCurrentLanguage())
    }
    addDisplaySection(id) {
        this.cntDisplaySettings = new Div("", id)
            .fixLocation(100, 22)
            .fixSize(200, 278)
            .hide()
        let x = 5
        let y = 20
        //GRID/SCALE checkboxes

        this.cntScale = new Container("cntScale", this.cntDisplaySettings.id)
            .fixLocation(x, y)
            .fixSize(150, 18)

        let chk = new CustomToggleSwitch(
            "",
            this.cntScale.id,
            this.changeHandler.bind(this)
        )
            .fixLocation(0, 0)
            .fixSize(32, 16)
            .addAction("bShowScale")
            .assignClasses(
                "toggle-container",
                "toggle-inner-off",
                "toggle-inner-on"
            )
        new Label("", "Show Scale", this.cntScale.id)
            .addClass("obj-label")
            .fixLocation(50, 0)
            .labelFor(chk.id)
        if (this.displaySettings.bShowScale) chk.toggleOn()

        //-----------------Background and Grid Colors
        y += 25
        //Background Color
        let c = new ColorInput(
            "",
            this.cntDisplaySettings.id,
            this.displaySettings.backgroundColor
        )
            .fixLocation(x, y)
            .fixSize(40, 26)
            .addAction("backgroundColor")
            .addClass("inputcolor")
            .listenForChanges(this.colorHandler.bind(this))
        new Label("", "Background Color", this.cntDisplaySettings.id)
            .addClass("obj-label")
            .fixLocation(55, y + 5)
            .labelFor(c.id)
        y += 32
        c = new ColorInput(
            "",
            this.cntDisplaySettings.id,
            this.displaySettings.gridColor
        )
            .fixLocation(5, y)
            .fixSize(40, 26)
            .addAction("gridColor")
            .addClass("inputcolor")
            .listenForChanges(this.colorHandler.bind(this))
        new Label("", "Grid Color", this.cntDisplaySettings.id)
            .addClass("obj-label")
            .fixLocation(55, y + 5)
            .labelFor(c.id)
        //-----------Grid spacing
        y += 35
        new Slider(
            "",
            1,
            50,
            1,
            this.displaySettings.gridSpacing,
            this.cntDisplaySettings.id
        )
            .fixLocation(5, y + 15)
            .setWidth(160)
            .listenForInput(this.sliderHandler.bind(this))
            .addAction("gridSpacing")
            .addClass("slider")
        new Label("", "Grid Spacing", this.cntDisplaySettings.id)
            .addClass("obj-label")
            .fixLocation(5, y)

        //Font Color
        y += 38
        c = new ColorInput(
            "",
            this.cntDisplaySettings.id,
            this.displaySettings.labelFontColor
        )
            .fixLocation(5, y)
            .fixSize(40, 26)
            .addAction("labelFontColor")
            .addClass("inputcolor")
            .listenForChanges(this.colorHandler.bind(this))
        new Label("", "Label Color", this.cntDisplaySettings.id)
            .addClass("obj-label")
            .fixLocation(55, y + 5)
            .labelFor(c.id)

        //Font Sizing
        y += 35
        new Slider(
            "",
            5,
            64,
            1,
            this.displaySettings.labelFontSize,
            this.cntDisplaySettings.id
        )
            .fixLocation(5, y + 15)
            .setWidth(160)
            .listenForInput(this.sliderHandler.bind(this))
            .addAction("labelFontSize")
            .addClass("slider")
        new Label("", "Label Size", this.cntDisplaySettings.id)
            .addClass("obj-label")
            .fixLocation(5, y)
    }
    addDefaultsSection(id) {
        this.cntDefaultSettings = new Div("", "wnSettings")
            .fixLocation(100, 22)
            .fixSize(200, 350)
            .autoOverflow()
            .hide()

        let y = this.addAircraftSection()
        y = this.addNavaidsSection(y)
        y = this.addRunwaySection(y)
        y = this.addApproachSection(y)
        y = this.addAirwaySection(y)
        y = this.addSUASection(y)
        y = this.addShapeSection(y)
    }
    addToolsSection(id) {
        this.cntTools = new Div("", id)
            .fixLocation(100, 22)
            .fixSize(200, 250)
            .hide()

        let x = 3
        let y = 5
        let x2 = 55

        let pid = this.cntTools.id

        //PTL Length
        new Label("", "PTL Length", pid)
            .addClass("obj-label")
            .fixLocation(x2, y + 4)
        new NumberInput("", pid)
            .fixLocation(0, y)
            .fixSize(50, 20)
            .addClass("text-input")
            .setParms(1, 20, 1)
            .setValue(this.displaySettings.ptlLength)
            .addAction("ptlLength")
            .listenForChanges(this.toolsHandler.bind(this))

        //PTL Color
        y += 25
        new Label("", "PTL Color", pid)
            .addClass("obj-label")
            .fixLocation(x2, y + 4)
        new ColorInput("", pid, this.displaySettings.ptlColor)
            .fixLocation(0, y)
            .fixSize(50, 25)
            .addAction("ptlColor")
            .addClass("inputcolor")
            .listenForChanges(this.toolsHandler.bind(this))

        //HALO Length
        y += 30
        new Label("", "HALO Size", pid)
            .addClass("obj-label")
            .fixLocation(x2, y + 4)
        new NumberInput("", pid)
            .fixLocation(0, y)
            .fixSize(50, 20)
            .addClass("text-input")
            .setParms(0.5, 5, 0.5)
            .setValue(this.displaySettings.haloSize)
            .addAction("haloSize")
            .listenForChanges(this.toolsHandler.bind(this))

        //Halo Color
        y += 25
        new Label("", "HALO Color", pid)
            .addClass("obj-label")
            .fixLocation(x2, y + 4)
        new ColorInput("", pid, this.displaySettings.haloColor)
            .fixLocation(0, y)
            .fixSize(50, 25)
            .addAction("haloColor")
            .addClass("inputcolor")
            .listenForChanges(this.toolsHandler.bind(this))

        //Route Color
        y += 30
        new Label("", "Route Color", pid)
            .addClass("obj-label")
            .fixLocation(x2, y + 4)
        new ColorInput("", pid, this.displaySettings.routeColor)
            .fixLocation(0, y)
            .fixSize(50, 25)
            .addAction("routeColor")
            .addClass("inputcolor")
            .listenForChanges(this.toolsHandler.bind(this))

        //Scan Range
        y += 30
        new Label("", "SUA Scan Range", pid)
            .addClass("obj-label")
            .fixLocation(x2, y + 4)
        new NumberInput("", pid)
            .fixLocation(0, y)
            .fixSize(50, 20)
            .addClass("text-input")
            .setParms(10, 100, 5)
            .setValue(this.displaySettings.scanRange)
            .addAction("scanRange")
            .listenForChanges(this.toolsHandler.bind(this))

        //Separation Warning Distancee
        y += 25
        new Label("", "SEP Warning Distance", pid)
            .addClass("obj-label")
            .fixLocation(x2, y + 4)
        new NumberInput("", pid)
            .fixLocation(0, y)
            .fixSize(50, 20)
            .addClass("text-input")
            .setParms(3, 20, 1)
            .setValue(this.displaySettings.sepWarnDistance)
            .addAction("sepWarnDistance")
            .listenForChanges(this.toolsHandler.bind(this))

        //Separation Loss Distance
        y += 25
        new Label("", "SEP Loss Distance", pid)
            .addClass("obj-label")
            .fixLocation(x2, y + 4)
        new NumberInput("", pid)
            .fixLocation(0, y)
            .fixSize(50, 20)
            .addClass("text-input")
            .setParms(0.5, 10, 0.5)
            .setValue(this.displaySettings.sepLossDistance)
            .addAction("sepLossDistance")
            .listenForChanges(this.toolsHandler.bind(this))

        //Conflict Detect Distance
        y += 25
        new Label("", "Conflict Detect Range", pid)
            .addClass("obj-label")
            .fixLocation(x2, y + 4)
        new NumberInput("", pid)
            .fixLocation(0, y)
            .fixSize(50, 20)
            .addClass("text-input")
            .setParms(5, 100, 5)
            .setValue(this.displaySettings.conflictDetectDistance)
            .addAction("conflictDetectDistance")
            .listenForChanges(this.toolsHandler.bind(this))
    }
    addAircraftSection() {
        //CONFIGURE NAVAIDS SECTION
        let x = 0
        let y = 5
        new Label("", "Aircraft", this.cntDefaultSettings.id)
            .addClass("title")
            .fixLocation(x, y)

        y += 30
        new Label("", "Default Size", this.cntDefaultSettings.id)
            .addClass("obj-label")
            .fixLocation(10, y)
        new Slider(
            "",
            5,
            100,
            1,
            this.displaySettings.acBaseRadius,
            this.cntDefaultSettings.id
        )
            .fixLocation(10, y + 15)
            .setWidth(140)
            .listenForInput(this.sliderHandler.bind(this))
            .addAction("acBaseRadius")
            .addClass("slider")

        y += 40
        new Label("", "Datatag Size", this.cntDefaultSettings.id)
            .addClass("obj-label")
            .fixLocation(10, y)
        new Slider(
            "",
            5,
            100,
            1,
            this.displaySettings.acBaseTagSize,
            this.cntDefaultSettings.id
        )
            .fixLocation(10, y + 15)
            .setWidth(140)
            .listenForInput(this.sliderHandler.bind(this))
            .addAction("acBaseTagSize")
            .addClass("slider")

        y += 40
        let s = new ShapeEditor(
            "",
            false,
            this.cntDefaultSettings.id
        ).fixLocation(x, y)
        s.activate(
            "Aircraft Defaults",
            true,
            this.displaySettings.acStrokeColor,
            this.displaySettings.acStrokeWeight,
            this.displaySettings.acFillColor
        )
        y += 130
        //Background Color
        let c = new ColorInput(
            "",
            this.cntDefaultSettings.id,
            this.displaySettings.acTagFontColor
        )
            .fixLocation(x, y)
            .fixSize(40, 26)
            .addAction("acTagFontColor")
            .addClass("inputcolor")
            .listenForChanges(this.colorHandler.bind(this))
        new Label("", "Tag Font Color", this.cntDefaultSettings.id)
            .addClass("obj-label")
            .fixLocation(55, y + 5)
            .labelFor(c.id)
        y += 32

        return y
    }
    addNavaidsSection(y) {
        //CONFIGURE NAVAIDS SECTION
        let x = 0

        new Label("", "Navaid", this.cntDefaultSettings.id)
            .addClass("title")
            .fixLocation(x, y)

        y += 30
        new Label("", "Default Size", this.cntDefaultSettings.id)
            .addClass("obj-label")
            .fixLocation(10, y)
        new Slider(
            "",
            0.1,
            10,
            0.1,
            this.displaySettings.baseFixSize,
            this.cntDefaultSettings.id
        )
            .fixLocation(10, y + 15)
            .setWidth(140)
            .listenForInput(this.sliderHandler.bind(this))
            .addAction("baseFixSize")
            .addClass("slider")

        y += 40
        let s = new ShapeEditor(
            "",
            false,
            this.cntDefaultSettings.id
        ).fixLocation(x, y)
        s.activate(
            "Navaid Defaults",
            true,
            this.displaySettings.fixStrokeColor,
            this.displaySettings.fixStrokeWeight,
            this.displaySettings.fixFillColor
        )

        //Fix Size
        y += 130
        return y
    }
    addRunwaySection(y) {
        let x = 5
        new Label("", "Runway", this.cntDefaultSettings.id)
            .addClass("title")
            .fixLocation(x, y)
        y += 30
        let s = new ShapeEditor(
            "",
            false,
            this.cntDefaultSettings.id
        ).fixLocation(x, y)
        s.activate(
            "Runway Defaults",
            true,
            this.displaySettings.rwyStrokeColor,
            this.displaySettings.rwyStrokeWeight,
            this.displaySettings.rwyFillColor
        )
        y += 130
        return y
    }
    addApproachSection(y) {
        let x = 5
        new Label("", "Approach", this.cntDefaultSettings.id)
            .addClass("title")
            .fixLocation(x, y)

        y += 30
        let s = new ShapeEditor(
            "",
            false,
            this.cntDefaultSettings.id
        ).fixLocation(x, y)
        s.activate(
            "Approach Defaults",
            false,
            this.displaySettings.approachStrokeColor,
            this.displaySettings.approachStrokeWeight
        )
        y += 130
        return y
    }
    addAirwaySection(y) {
        let x = 5
        new Label("", "Airway", this.cntDefaultSettings.id)
            .addClass("title")
            .fixLocation(x, y)

        y += 30
        let s = new ShapeEditor(
            "",
            false,
            this.cntDefaultSettings.id
        ).fixLocation(x, y)
        s.activate(
            "Airway Defaults",
            false,
            this.displaySettings.airwayStrokeColor,
            this.displaySettings.airwayStrokeWeight
        )
        y += 130
        return y
    }
    addSUASection(y) {
        let x = 5
        new Label("", "SUA", this.cntDefaultSettings.id)
            .addClass("title")
            .fixLocation(x, y)

        y += 30
        let s = new ShapeEditor(
            "",
            false,
            this.cntDefaultSettings.id
        ).fixLocation(x, y)
        s.activate(
            "SUA Defaults",
            true,
            this.displaySettings.suaStrokeColor,
            this.displaySettings.suaStrokeWeight,
            this.displaySettings.suaFillColor
        )
        y += 130
        return y
    }
    addShapeSection(y) {
        let x = 5
        new Label("", "Shapes", this.cntDefaultSettings.id)
            .addClass("title")
            .fixLocation(x, y)

        y += 30
        let s = new ShapeEditor(
            "",
            false,
            this.cntDefaultSettings.id
        ).fixLocation(x, y)
        s.activate(
            "Shape Defaults",
            true,
            this.displaySettings.shapeStrokeColor,
            this.displaySettings.shapeStrokeWeight,
            this.displaySettings.shapeFillColor
        )
        y += 130
        return y
    }
    clickHandler(details) {
        //console.log(details)
        if (details.action == "wnSettings:close") {
            this.hide()
        } else if (details.action == "btnInterface") {
            this.btnInterface.addClass("min-selected")
            this.btnDisplaySettings.removeClass("min-selected")
            this.btnDefaultSettings.removeClass("min-selected")
            this.btnTools.removeClass("min-selected")
            this.fixSize(300, 160)
            this.cntInterfaceSettings.show()
            this.cntDisplaySettings.hide()
            this.cntDefaultSettings.hide()
            this.cntTools.hide()
        } else if (details.action == "btnDisplaySettings") {
            this.btnInterface.removeClass("min-selected")
            this.btnDisplaySettings.addClass("min-selected")
            this.btnDefaultSettings.removeClass("min-selected")
            this.btnTools.removeClass("min-selected")
            this.fixSize(300, 275)
            this.cntInterfaceSettings.hide()
            this.cntDisplaySettings.show()
            this.cntDefaultSettings.hide()
            this.cntTools.hide()
        } else if (details.action == "btnDefaultSettings") {
            this.btnInterface.removeClass("min-selected")
            this.btnDisplaySettings.removeClass("min-selected")
            this.btnDefaultSettings.addClass("min-selected")
            this.btnTools.removeClass("min-selected")
            this.fixSize(300, 375)
            this.cntInterfaceSettings.hide()
            this.cntDisplaySettings.hide()
            this.cntDefaultSettings.show()
            this.cntTools.hide()
        } else if (details.action == "btnTools") {
            this.btnInterface.removeClass("min-selected")
            this.btnDisplaySettings.removeClass("min-selected")
            this.btnDefaultSettings.removeClass("min-selected")
            this.btnTools.addClass("min-selected")
            this.fixSize(300, 285)
            this.cntInterfaceSettings.hide()
            this.cntDisplaySettings.hide()
            this.cntDefaultSettings.hide()
            this.cntTools.show()
        }
    }
    changeHandler(details) {
        if (details.action == "langDropdown") {
            changeLanguage(Number(details.sender.getSelection().index))
        } else {
            //console.log(details)
            dispatchMessage(MSGSETTINGS, details.action, details.value)
        }
    }
    toolsHandler(details) {
        dispatchMessage(MSGTOOLS, details.action, details.value)
    }
    colorHandler(details) {
        dispatchMessage(MSGSETTINGS, details.action, details.value)
    }
    sliderHandler(details) {
        dispatchMessage(MSGSETTINGS, details.action, Number(details.value))
    }
}
class QuickSettingsWindow extends Div {
    constructor(id, parentid = null) {
        super(id, parentid)

        this.fixSize(380, 26)
        this.state = "full"
        this.addButtons(id)

        this.showOverflow()
    }
    addButtons(id) {
        let btnSize = 24
        let dist = 32
        //explainLabel
        this.lblExplain = new Label("", "Settings", id)
            .hide()
            .addClass("info-caption")
            .wrap(false)

        //SETTINGS- LABEL and BUTTON
        let x = 0
        let y = 0
        new BasicButton("btnSettings", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, y)
            .addClass("imagebutton")
            .bgImage("images/ui/settings.svg")
            .addAction({ detail: "btnSettings", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )
        //EDIT
        x += dist
        new BasicButton("btnEdit", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, this.fullSize - btnSize)
            .addClass("imagebutton")
            .bgImage("images/ui/edit.svg")
            .addAction({ detail: "btnEdit", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )
        //ANIMATE
        x += dist
        new BasicButton("btnAnimation", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, this.fullSize - btnSize)
            .addClass("imagebutton")
            .bgImage("images/ui/animate.svg")
            .addAction({ detail: "btnAnimate", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //DARK LIGHT mode
        x += dist
        new BasicButton("btnDarkmode", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, y)
            .addClass("imagebutton")
            .bgImage("images/ui/darkmode.svg")
            .bgImageFit()
            .addAction({ detail: "darkMode", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //Toggle Mini Nav Panel
        x += dist
        new BasicButton("btnToggleMiniNav", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, this.fullSize - btnSize)
            .addClass("imagebutton")
            .bgImage("images/ui/mini-nav.png")
            .bgImageFit()
            .addAction({ detail: "toggleMiniNav", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //Toggle Grid
        x += dist
        new BasicButton("btnToggleGrid", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, this.fullSize - btnSize)
            .addClass("imagebutton")
            .bgImage("images/ui/grid.png")
            .bgImageFit()
            .addAction({ detail: "gridToggle", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //Show/Hide Labels
        x += dist
        new BasicButton("btnToggleLabel", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, this.fullSize - btnSize)
            .addClass("imagebutton")
            .bgImage("images/ui/label.svg")
            .bgImageFit()
            .addAction({ detail: "labelToggle", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //PTL Toggle
        x += dist
        new BasicButton("btnTogglePTL", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, this.fullSize - btnSize)
            .addClass("imagebutton")
            .bgImage("images/ui/ptl.png")
            .bgImageFit()
            .applyStyle("background-size", "18px, 18px")
            .applyStyle("background-position-y", "3px")
            .applyStyle("background-position-x", "3px")
            .addAction({ detail: "ptlToggle", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //RTE Toggle
        x += dist
        new BasicButton("btnToggleRTE", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, this.fullSize - btnSize)
            .addClass("imagebutton")
            .bgImage("images/ui/rte.png")
            .bgImageFit()
            .addAction({ detail: "rteToggle", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .applyStyle("background-position-y", "5px")
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //HLO Toggle
        x += dist
        new BasicButton("btnToggleHLO", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, this.fullSize - btnSize)
            .addClass("imagebutton")
            .bgImage("images/ui/hlo.png")
            .bgImageFit()
            .applyStyle("background-size", "18px, 18px")
            .applyStyle("background-position-y", "3px")
            .addAction({ detail: "hloToggle", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //SEP Toggle
        x += dist
        new BasicButton("btnToggleSEP", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, this.fullSize - btnSize)
            .addClass("imagebutton")
            .bgImage("images/ui/sep.png")
            .bgImageFit()
            .applyStyle("background-size", "18px, 18px")
            .applyStyle("background-position-y", "3px")
            .applyStyle("background-position-x", "3px")
            .addAction({ detail: "sepToggle", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //SCA Toggle
        x += dist
        this.btnScan = new BasicButton("btnToggleSCA", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, this.fullSize - btnSize)
            .addClass("imagebutton")
            .bgImage("images/ui/sca.png")
            .bgImageFit()
            .addAction({ detail: "scaToggle", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //Wind
        this.btnWind = new BasicButton("btnToggleWind", "", id)
            .fixSize(btnSize + 4, btnSize)
            .fixLocation(x, this.fullSize - btnSize)
            .addClass("imagebutton")
            .bgImage("images/ui/wind.png")
            .bgImageFit()
            .applyStyle("background-size", "20px, 20px")
            .applyStyle("background-position-y", "5px")
            .applyStyle("background-position-x", "3px")
            .addAction({ detail: "windToggle", x: x })
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )
    }

    btnHandler(details) {
        if (details.action.detail == "btnSettings") {
            this.lblExplain.hide()
            dispatchMessage(MSGUI, "dispSettingsWindow")
        } else if (details.action.detail == "darkMode") {
            dispatchMessage(MSGUI, "toggleDarkMode")
        } else if (details.action.detail == "gridToggle") {
            dispatchMessage(MSGUI, "gridToggle")
        } else if (details.action.detail == "labelToggle") {
            dispatchMessage(MSGUI, "labelToggle")
        } else if (details.action.detail == "btnEdit") {
            dispatchMessage(MSGUI, "changeAppMode", EDITMODE)
        } else if (details.action.detail == "btnAnimate") {
            dispatchMessage(MSGUI, "changeAppMode", ANIMATEMODE)
        } else if (details.action.detail == "windToggle") {
            dispatchMessage(MSGUI, "windEditorWindow")
        } else if (details.action.detail == "toggleMiniNav") {
            dispatchMessage(MSGUI, "miniNavWindow")
        } else if (details.action.detail == "ptlToggle") {
            dispatchMessage(MSGTOOLS, "toggler", "bShowPTL")
        } else if (details.action.detail == "rteToggle") {
            dispatchMessage(MSGTOOLS, "toggler", "bShowRoute")
        } else if (details.action.detail == "hloToggle") {
            dispatchMessage(MSGTOOLS, "toggler", "bShowHalo")
        } else if (details.action.detail == "sepToggle") {
            dispatchMessage(MSGTOOLS, "toggler", "bShowSep")
        } else if (details.action.detail == "scaToggle") {
            dispatchMessage(MSGTOOLS, "toggler", "bShowScan")
        }
    }

    enterHandler(details) {
        this.lblExplain.fixLocation(details.action.x + 30, 30)
        if (details.action.detail == "btnSettings") {
            this.lblExplain.updateCaption("Settings").show()
        } else if (details.action.detail == "darkMode") {
            this.lblExplain.updateCaption("Dark/Light Mode").show()
        } else if (details.action.detail == "gridToggle") {
            this.lblExplain.updateCaption("Toggle Grid").show()
        } else if (details.action.detail == "labelToggle") {
            this.lblExplain.updateCaption("Toggle Labels").show()
        } else if (details.action.detail == "btnEdit") {
            this.lblExplain.updateCaption("Edit Mode").show()
        } else if (details.action.detail == "btnAnimate") {
            this.lblExplain.updateCaption("Run Mode").show()
        } else if (details.action.detail == "windToggle") {
            this.lblExplain.updateCaption("Wind Editor").show()
        } else if (details.action.detail == "toggleMiniNav") {
            this.lblExplain.updateCaption("Toggle Nav Panel").show()
        } else if (details.action.detail == "ptlToggle") {
            this.lblExplain.updateCaption("Toggle Prediected Track Line").show()
        } else if (details.action.detail == "rteToggle") {
            this.lblExplain.updateCaption("Toggle Route Display").show()
        } else if (details.action.detail == "hloToggle") {
            this.lblExplain.updateCaption("Toggle HALO").show()
        } else if (details.action.detail == "sepToggle") {
            this.lblExplain.updateCaption("Toggle Separation Display").show()
        } else if (details.action.detail == "scaToggle") {
            this.lblExplain.updateCaption("Toggle Aircraft Scans").show()
        }
    }
    leaveHandler(details) {
        this.lblExplain.hide()
    }
    setMode(mode) {
        if (mode == EDITMODE) {
            this.btnWind.show()
            this.btnScan.hide()
        } else {
            this.btnWind.hide()
            this.btnScan.show()
        }
        return this
    }
}
class VerticalAddWindow extends Div {
    constructor(id, parentid = null) {
        super(id, parentid)
        this.autoOverflow()
        this.stkMgrLeft = new StackManager("", LEFTBARWIDTH - 15, id)
        this.stkMgrLeft.paneClosedHeight = 40
        this.addInstrPane()
        this.addFixPane()
        this.addAirportItemsPane()
        this.addShapesPane()
        this.addAircraftPane()
    }
    onResize(w, h) {
        this.fixSize(LEFTBARWIDTH, h)
    }
    addInstrPane() {
        //add an info message
        this.infoLabel = new Label("", "Drag and drop items to the canvas", "")
            .fixLocation(LEFTBARWIDTH, 45)
            .addClass("info-caption")
            .hide()
        let pn = this.stkMgrLeft.addPane("", "")

        new Image("", pn.id, "/images/ui/info.svg")
            .fixLocation(5, 2)
            .fixSize(25, 25)
            .addAction("btnInfo")
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )
        pn.changeClosedHeight(28)

        pn.hideToggleButton()
    }
    addFixPane() {
        let pn = this.stkMgrLeft.addPane("", "")
        pn.chgButton
            .bgImage("/images/ui/nav.png")
            .fixLocation(0, 0)
            .fixSize(45, 40)
            .addClass("imagebutton3")
            .applyStyle("background-size", "38px, 40px")
            .applyStyle("background-position-x", "2px")
            .applyStyle("background-position-y", "2px")
            .addAction("btnFix")
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        let x = 3
        let y = 40
        //add all the fixes
        for (let i = 0; i < director.aFixImage.length; i++) {
            let p = director.aFixImage[i]
            let img = new Image("", pn.id, p.url)
                .fixLocation(x, y)
                .fixSize(32, 32)
                .setDraggable(true)
                .addClass("draggable")
                .addAction({ type: "fix", index: i })
                .enableDragTracking(
                    this.dragStart.bind(this),
                    this.dragEnd.bind(this)
                )
            y += 38
        }
        pn.openHeight = 460
        //pn.changeState()
    }
    addAirportItemsPane() {
        let pn = this.stkMgrLeft.addPane("", "")
        pn.chgButton
            .bgImage("/images/ui/tower.png")
            .fixLocation(0, 0)
            .fixSize(45, 40)
            .addClass("imagebutton3")
            .applyStyle("background-size", "30px, 40px")
            .applyStyle("background-position-x", "2px")
            .applyStyle("background-position-y", "2px")
            .addAction("btnAirport")
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        let x = 0
        let y = 45
        //RUNWAY
        let p = director.aAirportImage[0]
        let img = new Image("", pn.id, p.url)
            .fixLocation(x, y)
            .fixSize(40, 15)
            .setDraggable(true)
            .addClass("draggable")
            .addAction({ type: "runway" })
            .enableDragTracking(
                this.dragStart.bind(this),
                this.dragEnd.bind(this)
            )
        y += 22
        //APPROACH
        p = director.aAirportImage[1]
        img = new Image("", pn.id, p.url)
            .fixLocation(x, y)
            .fixSize(40, 15)
            .setDraggable(true)
            .addClass("draggable")
            .addAction({ type: "approach" })
            .enableDragTracking(
                this.dragStart.bind(this),
                this.dragEnd.bind(this)
            )
        y += 22
        p = director.aAirportImage[2]
        img = new Image("", pn.id, p.url)
            .fixLocation(x, y)
            .fixSize(40, 17)
            .setDraggable(true)
            .addClass("draggable")
            .addAction({ type: "airway" })
            .enableDragTracking(
                this.dragStart.bind(this),
                this.dragEnd.bind(this)
            )

        y += 30
        p = director.aAirportImage[3]
        img = new Image("", pn.id, p.url)
            .fixLocation(x, y)
            .fixSize(32, 32)
            .setDraggable(true)
            .addClass("draggable")
            .addAction({ type: "sua" })
            .enableDragTracking(
                this.dragStart.bind(this),
                this.dragEnd.bind(this)
            )

        pn.openHeight = 155
        //pn.changeState()
    }
    addShapesPane() {
        let pn = this.stkMgrLeft.addPane("", "")
        pn.chgButton
            .bgImage("/images/ui/shapes.png")
            .fixLocation(0, 0)
            .fixSize(45, 40)
            .addClass("imagebutton3")
            .applyStyle("background-size", "40px, 40px")
            .applyStyle("background-position-x", "5px")
            .applyStyle("background-position-y", "2px")
            .addAction("btnShapes")
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        let x = 0
        let y = 45
        //RUNWAY
        let p = director.aShapeImage[0]
        let img = new Image("", pn.id, p.url)
            .fixLocation(x + 3, y)
            .fixSize(36, 9)
            .setDraggable(true)
            .addClass("draggable")
            .addAction({ type: "line" })
            .enableDragTracking(
                this.dragStart.bind(this),
                this.dragEnd.bind(this)
            )
        y += 22
        p = director.aShapeImage[1]
        img = new Image("", pn.id, p.url)
            .fixLocation(x + 5, y)
            .fixSize(28, 28)
            .setDraggable(true)
            .addClass("draggable")
            .addAction({ type: "circle" })
            .enableDragTracking(
                this.dragStart.bind(this),
                this.dragEnd.bind(this)
            )

        y += 32
        p = director.aShapeImage[2]
        img = new Image("", pn.id, p.url)
            .fixLocation(x + 2, y)
            .fixSize(36, 36)
            .setDraggable(true)
            .addClass("draggable")
            .addAction({ type: "polygon" })
            .enableDragTracking(
                this.dragStart.bind(this),
                this.dragEnd.bind(this)
            )
        y += 35
        p = director.aShapeImage[3]
        img = new Image("", pn.id, p.url)
            .fixLocation(x + 2, y)
            .fixSize(32, 46)
            .setDraggable(true)
            .addClass("draggable")
            .addAction({ type: "text" })
            .enableDragTracking(
                this.dragStart.bind(this),
                this.dragEnd.bind(this)
            )
        pn.openHeight = 185
        //pn.changeState()
    }
    addAircraftPane() {
        let pn = this.stkMgrLeft.addPane("", "")
        pn.chgButton
            .bgImage("/images/ui/AC.png")
            .fixLocation(0, 0)
            .fixSize(45, 40)
            .addClass("imagebutton3")
            .applyStyle("background-size", "40px, 40px")
            .applyStyle("background-position-x", "-1px")
            .applyStyle("background-position-y", "0px")
            .addAction("btnAircraft")
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        let x = 0
        let y = 45

        //add all the fixes
        for (let i = 0; i < director.aACImage.length; i++) {
            let p = director.aACImage[i]
            let img = new Image("", pn.id, p.url)
                .fixLocation(x, y)
                .fixSize(36, 34)
                .setDraggable(true)
                .addClass("draggable")
                .addAction({ type: "aircraft", index: i })
                .enableDragTracking(
                    this.dragStart.bind(this),
                    this.dragEnd.bind(this)
                )
            y += 38
        }
        pn.openHeight = y
        pn.changeState()
    }
    enterHandler(details) {
        //console.group(details)
        if (details.action == "btnInfo") {
            this.infoLabel.updateCaption("Drag and drop items to the canvas")
            this.infoLabel.setY(details.sender.parent.y + 40)
            this.infoLabel.show()
        } else if (details.action == "btnFix") {
            this.infoLabel.updateCaption("Navaid")
            this.infoLabel.setY(details.sender.parent.y)
            this.infoLabel.show()
        } else if (details.action == "btnAirport") {
            this.infoLabel.updateCaption("Airport/Airspace Related")
            this.infoLabel.setY(details.sender.parent.y)
            this.infoLabel.show()
        } else if (details.action == "btnShapes") {
            this.infoLabel.updateCaption("Shapes and Text")
            this.infoLabel.setY(details.sender.parent.y)
            this.infoLabel.show()
        }
    }
    leaveHandler(details) {
        this.infoLabel.hide()
    }
    dragStart(details) {
        $(details.draggedItemID).setOpacity(0.5)
        //console.log(details);
    }
    dragEnd(details) {
        $(details.draggedItemID).setOpacity(1)
        //console.log(details);
    }
}
class ShapeEditor extends Div {
    constructor(id, bVertical, parentid = null) {
        super(id, parentid)
        //this.bgColor('#FFFFFF50')
        this.source = null
        this.bFillControls = true
        this.bVertical = bVertical
        this.panelWidth = 80
        this.sizeMe()
        let y = this.addStrokeSection(this.id)
        this.addFillSection(this.id, y)
    }
    addStrokeSection(id) {
        let x = 0
        let y = 0
        new Label("", "Stroke", id)
            .addClass("obj-label")
            .addClass("boldit")
            .addClass("underlineit")
            .fixLocation(x, y)

        x += 5
        y += 15
        new Label("", "Color", id).addClass("obj-label").fixLocation(x, y)
        y += 14
        this.clrInputStroke = new ColorInput("", id, "red")
            .fixLocation(x + 5, y)
            .fixSize(40, 26)
            .addAction("strokeColor")
            .addClass("inputcolor")
            .listenForChanges(this.changeHandler.bind(this))

        y += 28
        new Label("", "Opacity", id).addClass("obj-label").fixLocation(x, y)
        y += 15
        this.sldStrokeOpacity = new Slider("", 0, 255, 1, 255, id)
            .fixLocation(x + 5, y)
            .setWidth(this.panelWidth - 20)
            .listenForInput(this.changeHandler.bind(this))
            .addAction("strokeOpacity")
            .addClass("slider")

        y += 12
        new Label("", "Weight", id).addClass("obj-label").fixLocation(x, y)
        y += 15
        this.sldStrokeWidth = new Slider("", 0, 10, 1, 2, id)
            .fixLocation(x + 5, y)
            .setWidth(this.panelWidth - 20)
            .listenForInput(this.changeHandler.bind(this))
            .addAction("strokeWidth")
            .addClass("slider")

        return y + 20
    }
    addFillSection(id, top) {
        this.cntFill = new Div("", id)
        if (this.bVertical) {
            this.cntFill.fixLocation(0, top)
        } else {
            this.cntFill.fixLocation(this.panelWidth, 0)
        }
        this.cntFill.fixSize(80, 115)
        let x = 0
        let y = 0
        new Label("", "Fill", this.cntFill.id)
            .addClass("obj-label")
            .addClass("boldit")
            .addClass("underlineit")
            .fixLocation(x, y)

        x += 5
        y += 15
        new Label("", "Color", this.cntFill.id)
            .addClass("obj-label")
            .fixLocation(x, y)
        y += 14
        this.clrInputFill = new ColorInput("", this.cntFill.id, "red")
            .fixLocation(x + 5, y)
            .fixSize(40, 26)
            .addAction("fillColor")
            .addClass("inputcolor")
            .listenForChanges(this.changeHandler.bind(this))

        y += 28
        new Label("", "Opacity", this.cntFill.id)
            .addClass("obj-label")
            .fixLocation(x, y)
        y += 15
        this.sldFillOpacity = new Slider("", 0, 255, 1, 255, this.cntFill.id)
            .fixLocation(x + 5, y)
            .setWidth(this.panelWidth - 20)
            .listenForInput(this.changeHandler.bind(this))
            .addAction("fillOpacity")
            .addClass("slider")
    }
    changeHandler(details) {
        //console.log(details)
        if (details.action == "strokeWidth") {
            dispatchMessage(MSGSHAPECONTROLS, this.source, {
                type: "strokeWeight",
                value: Number(details.value),
            })
        } else if (
            details.action == "strokeOpacity" ||
            details.action == "strokeColor"
        ) {
            let color =
                this.clrInputStroke.value +
                HEX(Number(this.sldStrokeOpacity.value))
            dispatchMessage(MSGSHAPECONTROLS, this.source, {
                type: "strokeColor",
                value: color,
            })
        } else {
            let color =
                this.clrInputFill.value + HEX(Number(this.sldFillOpacity.value))
            dispatchMessage(MSGSHAPECONTROLS, this.source, {
                type: "fillColor",
                value: color,
            })
        }
    }
    activate(source, bFillControls, strokeColor, strokeWidth, fillColor) {
        //console.log(source, bFillControls, strokeColor, strokeWidth, fillColor)
        this.source = source
        this.bFillControls = bFillControls
        //set the controls to the values
        let col1 = parseColorString(strokeColor)
        this.clrInputStroke.value = "#" + col1.r + col1.g + col1.b
        this.sldStrokeOpacity.value = Hex2Dec(col1.o)
        this.sldStrokeWidth.value = strokeWidth

        if (this.bFillControls) {
            col1 = parseColorString(fillColor)
            this.clrInputFill.value = "#" + col1.r + col1.g + col1.b
            this.sldFillOpacity.value = Hex2Dec(col1.o)
        }
        this.sizeMe()
        this.show()
    }
    sizeMe() {
        //console.log(this.bFillControls, this.bVertical)
        if (this.bFillControls) {
            if (this.bVertical) {
                this.fixSize(80, 210)
            } else {
                this.fixSize(160, 115)
            }
        } else {
            this.fixSize(80, 115)
        }
    }
}
class WindEditor extends DraggableWindow {
    constructor(id, closeImgURL, parentid = null) {
        super(id, closeImgURL, parentid)
        let uid = this.id
        //console.log(uid)
        this.windCards = []
        this.cardHeight = 30

        this.fixSize(380, 85)
            .assignClasses("wn-draggable-main", "wn-titlebar", "imagebutton")
            .addAction("wnWindEditor")
            .getCloseNotifications(this.clickHandler.bind(this))
            .hide()

        let x = 5
        let y = 30
        new Label("", "ALT", id)
            .addClass("obj-label")
            .addClass("boldit")
            .addClass("underlineit")
            .fixLocation(x + 10, y)

        this.inpAlt = new NumberInput("", uid)
            .fixLocation(x, y + 15)
            .setParms(0, 600, 10)

        x += 75
        new Label("", "DIR", id)
            .addClass("obj-label")
            .addClass("boldit")
            .addClass("underlineit")
            .fixLocation(x + 10, y)
        this.inpDir = new NumberInput("", uid)
            .fixLocation(x, y + 15)
            .setParms(0, 360, 5)

        x += 75
        new Label("", "SPD", id)
            .addClass("obj-label")
            .addClass("boldit")
            .addClass("underlineit")
            .fixLocation(x + 10, y)
        this.inpSpd = new NumberInput("", uid)
            .fixLocation(x, y + 15)
            .setParms(0, 240, 5)

        x += 75
        new BasicButton("", "Add Layer", uid)
            .fixLocation(x, y + 12)
            .fixSize(140, 28)
            .listenForClicks(this.clickHandler.bind(this))
            .addAction("addLayer")
            .addClass("basicbutton1")

        this.reset()
    }
    clickHandler(details) {
        if (details.action == "wnWindEditor:close") {
            this.hide()
        } else if (details.action == "addLayer") {
            //console.log("add layer")
            let w = {
                alt: this.inpAlt.value,
                dir: this.inpDir.value,
                spd: this.inpSpd.value,
            }
            dispatchMessage(MSGWINDCHANGE, "add", w)
            this.reset()
        }
    }
    reset() {
        this.inpAlt.setValue(0)
        this.inpDir.setValue(0)
        this.inpSpd.setValue(0)
    }
    updateWinds(wind) {
        while (wind.layers.length > this.windCards.length) {
            this.windCards.push(new WindCard("", this.id, this.cardHeight))
        }
        while (wind.layers.length < this.windCards.length) {
            let p = this.windCards.pop()
            p.destruct()
        }
        //update all the cards
        let x = 50
        let y = 85
        for (let i = 0; i < wind.layers.length; i++) {
            let w = wind.layers[i]
            let d = String(w.dir)
            while (d.length < 3) {
                d = "0" + d
            }
            d += "\u00B0"
            let tx = "FL" + w.alt + ":   " + d + "/" + w.spd
            this.windCards[i].fixLocation(x, y)
            this.windCards[i].label.updateCaption(tx)
            this.windCards[i].index = i
            y += this.cardHeight + 5
        }
        this.setHeight(85 + wind.layers.length * (this.cardHeight + 5) + 10)
    }
}
class WindCard extends Div {
    constructor(id, parentid, cardHeight) {
        super(id, parentid)
        let uid = this.id
        //console.log(uid)
        this.fixSize(225, cardHeight).addClass("card")
        this.label = new Label("", "", uid)
            .fixLocation(30, 3)
            .addClass("card-label")
        this.btnDelete = new BasicButton("", "", uid)
            .fixSize(22, 22)
            .fixLocation(5, 2)
            .addClass("imagebutton2")
            .bgImage("images/ui/delete.png")
            .addAction("btnDelete")
            .listenForClicks(this.btnHandler.bind(this))
    }
    destruct() {
        this.btnDelete.destroy()
        this.label.destroy()
        this.destroy()
    }
    btnHandler() {
        //console.log("add delete functionality")
        dispatchMessage(MSGWINDCHANGE, "delete", this.index)
    }
}
class TimeControlWindow extends Div {
    constructor(id, parentid = null) {
        super(id, parentid)
        this.fixSize(325, 75).addClass("bottom-dialog")

        new Label("", "Time Control", this.id)
            .addClass("obj-label2")
            .fontSize(16)
            .centerH()
        //create the 6 buttons
        let x = 5
        let y = 20
        for (let i = -3; i < 4; i++) {
            if (i == 0) continue
            let fName = String(Math.abs(i)) + "x"
            if (i < 0) fName = "m" + fName
            let url = "images/ui/" + fName + ".png"
            let t = 0
            if (i == -3) {
                t = -30
            } else if (i == -2) {
                t = -10
            } else if (i == -1) {
                t = -1
            } else if (i == 1) {
                t = 1
            } else if (i == 2) {
                t = 10
            } else {
                t = 30
            }

            new HoldButton(
                "",
                "panTime",
                t,
                this.panHandler.bind(this),
                "",
                this.id
            )
                .addClass("panbutton")
                .bgImage(url)
                .fixSize(50, 18)
                .fixLocation(x, y)
            x += 52
        }
        //add buttons
        new BasicButton("", "Reset", this.id)
            .addClass("basicbutton1")
            .fixLocation(5, 45)
            .fixSize(102, 24)
            .addAction("resetToZero")
            .listenForClicks(this.clickHandler.bind(this))
        new BasicButton("", "Set Zero", this.id)
            .addClass("basicbutton1")
            .fixLocation(213, 45)
            .fixSize(102, 24)
            .addAction("setZero")
            .listenForClicks(this.clickHandler.bind(this))

        //create the time display
        this.lblTime = new Label("", "0:00:00", this.id)
            .addClass("obj-label2")
            .fontSize(22)
            .setY(45)
            .centerH()
    }
    clickHandler(details) {
        dispatchMessage(MSGTIMING, details.action, null)
    }
    panHandler(details) {
        dispatchMessage(MSGTIMING, "pan-time", details.value)
    }
    updateDisplay(val) {
        this.lblTime.updateCaption(val)
    }
}
class MiniNavPanel extends Div {
    constructor(id, parentID = null) {
        super(id, parentID)
        this.fixSize(0, 0).fixLocation(60, 10).showOverflow()
        let btnSize = 20
        let x = 0
        let y = 0
        let space = 6

        new HoldButton("", "panUP", 0, this.holdHandler.bind(this), "", id)
            .addClass("imagebutton2")
            .bgImage("images/ui/pan_up.png")
            .fixSize(btnSize, btnSize)
            .fixLocation(x + btnSize, y + space)

        new HoldButton("", "panLEFT", 0, this.holdHandler.bind(this), "", id)
            .addClass("imagebutton2")
            .bgImage("images/ui/pan_left.png")
            .fixSize(btnSize, btnSize)
            .fixLocation(x, y + btnSize / 2 + space)

        new HoldButton("", "panRIGHT", 0, this.holdHandler.bind(this), "", id)
            .addClass("imagebutton2")
            .bgImage("images/ui/pan_right.png")
            .fixSize(btnSize, btnSize)
            .fixLocation(x + btnSize * 2, y + btnSize / 2 + space)

        new HoldButton("", "panDOWN", 0, this.holdHandler.bind(this), "", id)
            .addClass("imagebutton2")
            .bgImage("images/ui/pan_down.png")
            .fixSize(btnSize, btnSize)
            .fixLocation(x + btnSize, y + btnSize + space)

        btnSize = 24
        x = 60
        y = 0
        new HoldButton("", "zoomIn", 0, this.holdHandler.bind(this), "", id)
            .addClass("imagebutton2")
            .bgImage("images/ui/zoom_in.png")
            .fixSize(btnSize, btnSize)
            .fixLocation(x, y)
        new HoldButton("", "zoomOut", 0, this.holdHandler.bind(this), "", id)
            .addClass("imagebutton2")
            .bgImage("images/ui/zoom_out.png")
            .fixSize(btnSize, btnSize)
            .fixLocation(x, y + btnSize)
    }
    holdHandler(details) {
        if (details.action == "zoomOut") {
            Pos2d.zoomIn()
        } else if (details.action == "zoomIn") {
            Pos2d.zoomOut()
        } else if (details.action == "panUP") {
            Pos2d.pan(0, 0.1)
        } else if (details.action == "panLEFT") {
            Pos2d.pan(0.1, 0)
        } else if (details.action == "panRIGHT") {
            Pos2d.pan(-0.1, 0)
        } else if (details.action == "panDOWN") {
            Pos2d.pan(0, -0.1)
        } else {
            console.log(details)
        }
        dispatchMessage(MSGREDRAW, true)
    }
}

//*------------------------Object Editing Subpanels
class ItemEditor extends Div {
    constructor(id, parentid = null) {
        super(id, parentid)
        this.masterWidth = 180
        this.fixSize(this.masterWidth, 500).addClass("stack-pane")
        new Label("", "Editor", this.id)
            .addClass("obj-label2")
            .fontSize(16)
            .fixLocation(0, 2)
        this.closedHeight = 20
        this.currentPanelHeight = 20
        this.maxHeight = 500
        //create subpanels
        this.aSubpanels = []
        this.activeSubpanel = -1
        this.aSubpanels.push(
            new FixEditorSubpanel("", this.id, this.masterWidth).fixLocation(
                0,
                this.closedHeight
            )
        )
        this.aSubpanels.push(
            new RunwayEditorSubpanel("", this.id, this.masterWidth).fixLocation(
                0,
                this.closedHeight
            )
        )
        this.aSubpanels.push(
            new ApproachEditorSubpanel(
                "",
                this.id,
                this.masterWidth
            ).fixLocation(0, this.closedHeight)
        )
        this.aSubpanels.push(
            new AirwayEditorSubpanel("", this.id, this.masterWidth).fixLocation(
                0,
                this.closedHeight
            )
        )
        this.aSubpanels.push(
            new SUAEditorSubpanel("", this.id, this.masterWidth).fixLocation(
                0,
                this.closedHeight
            )
        )
        this.aSubpanels.push(
            new LineEditorSubpanel("", this.id, this.masterWidth).fixLocation(
                0,
                this.closedHeight
            )
        )
        this.aSubpanels.push(
            new CircleEditorSubpanel("", this.id, this.masterWidth).fixLocation(
                0,
                this.closedHeight
            )
        )
        this.aSubpanels.push(
            new PolygonEditorSubpanel(
                "",
                this.id,
                this.masterWidth
            ).fixLocation(0, this.closedHeight)
        )
        this.aSubpanels.push(
            new TextEditorSubpanel("", this.id, this.masterWidth).fixLocation(
                0,
                this.closedHeight
            )
        )
        this.aSubpanels.push(
            new AircraftEditorSubpanel(
                "",
                this.id,
                this.masterWidth
            ).fixLocation(0, this.closedHeight)
        )
        this.scrollOverflowY()
        this.activate(null)
    }
    onResize(w, h) {
        this.fixLocation(w - this.masterWidth, 0)
        this.maxHeight = h
        this.resetHeight()
    }
    activate(item) {
        if (!item) {
            this.activeSubpanel = -1
        } else if (item.type == "fix") {
            this.activeSubpanel = 0
        } else if (item.type == "runway") {
            this.activeSubpanel = 1
        } else if (item.type == "approach") {
            this.activeSubpanel = 2
        } else if (item.type == "airway") {
            this.activeSubpanel = 3
        } else if (item.type == "sua") {
            this.activeSubpanel = 4
        } else if (item.type == "line") {
            this.activeSubpanel = 5
        } else if (item.type == "circle") {
            this.activeSubpanel = 6
        } else if (item.type == "polygon") {
            this.activeSubpanel = 7
        } else if (item.type == "text") {
            this.activeSubpanel = 8
        } else if (item.type == "aircraft") {
            this.activeSubpanel = 9
        } else {
            console.log(item.type)
            this.activeSubpanel = -1
        }
        this.displayPanel(this.activeSubpanel, item)
    }
    displayPanel(index, item) {
        let h = this.closedHeight

        for (let i = 0; i < this.aSubpanels.length; i++) {
            this.aSubpanels[i].hide()
            if (i == index) {
                h += this.aSubpanels[index].activate(item)
            }
        }

        this.currentPanelHeight = h
        this.resetHeight()
    }
    resetHeight() {
        if (this.currentPanelHeight > this.maxHeight) {
            this.fixSize(this.masterWidth, this.maxHeight)
        } else {
            this.fixSize(this.masterWidth, this.currentPanelHeight)
        }
    }

    processAirwayRouteChange() {
        this.aSubpanels[3].updateRoutePoints()
    }
}
class FixEditorSubpanel extends Div {
    constructor(id, parentid, width) {
        super(id, parentid)
        this.masterWidth = width
        //this.fixSize(this.masterWidth, 275)
        this.fullSize = 325
        this.partSize = 210
        //-------------------------------------Object Type Label
        let y = 0
        let x = 5
        new Label("", "Object Type", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        new Label("", "Navaid", this.id)
            .fixLocation(x + 7, y + 12)
            .addClass("obj-label2")

        //---------------------------------------------DESIGNATOR
        y += 30
        new Label("", "Designator", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpDesignator = new TextInput("", "", this.id)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth - 50, 24)
            .addClass("number-input")
            .addAction("changeDesignator")
            .listenForInput(this.changeHandler.bind(this))

        //---------------------------------------------Display Layer
        y += 40
        new Label("", "Display Layer", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpLayerLabel = new NumberInput("", this.id)
            .setParms(0, 255, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeLayer")
            .listenForInput(this.changeHandler.bind(this))

        //---------------------------------------------Fix Size Override

        y += 36
        new Label("", "Override Default Size", this.id)
            .addClass("obj-label")
            .fixLocation(x, y)
        this.inpFixSize = new Slider("", 0.05, 20, 0.05, 5, this.id)
            .fixLocation(x + 7, y + 26)
            .setWidth(this.masterWidth - 24)
            .listenForInput(this.changeHandler.bind(this))
            .addAction("adjustFixSize")
            .addClass("slider")

        //---------------------------------------------Shape Editor
        y += 40
        this.fixShapeEditor = new ShapeEditor("", false, this.id).fixLocation(
            x,
            y
        )
        //Delete button
        //---------------------------------------------Delete button
        y += 125
        this.btnDelete = new BasicButton("", "Delete", this.id)
            .addClass("basicbutton1")
            .fixLocation(20, y)
            .fixSize(this.masterWidth - 40, 24)
            .addAction("delete")
            .listenForClicks(this.clickHandler.bind(this))
    }
    changeHandler(details) {
        //console.log(details)
        dispatchMessage(MSGOBJECTEDIT, details.action, details.value)
    }
    clickHandler(details) {
        if (details.action == "delete") {
            dispatchMessage(MSGDELETE, null, null)
        } else {
            console.log(details)
        }
    }
    activate(item) {
        this.show()
        this.inpDesignator.updateCaption(item.desig)
        this.inpLayerLabel.value = item.layer
        this.inpFixSize.value = item.size
        if (item.fixType == "bmp") {
            this.btnDelete.fixLocation(20, 155)
            this.fixShapeEditor.hide()
            this.fixSize(this.masterWidth, this.partSize)
            return this.partSize
        } else {
            this.btnDelete.fixLocation(20, 270)
            this.fixShapeEditor.show()
            this.fixShapeEditor.activate(
                item,
                true,
                item.strokeColor,
                item.strokeWeight,
                item.fillColor
            )
            this.fixSize(this.masterWidth, this.fullSize)
            return this.fullSize
        }
    }
}
class RunwayEditorSubpanel extends Div {
    constructor(id, parentid, width) {
        super(id, parentid)
        this.masterWidth = width
        this.fixSize(this.masterWidth, 275)
        this.masterHeight = 255
        //-------------------------------------Object Type Label
        let y = 0
        let x = 5
        new Label("", "Object Type", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        new Label("", "Runway", this.id)
            .fixLocation(x + 7, y + 12)
            .addClass("obj-label2")

        //---------------------------------------------Display Layer
        y += 30
        new Label("", "Display Layer", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpLayerLabel = new NumberInput("", this.id)
            .setParms(0, 255, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeLayer")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------Shape Editor
        y += 40
        this.rwyShapeEditor = new ShapeEditor("", false, this.id).fixLocation(
            x,
            y
        )
        //---------------------------------------------Delete button
        y += 125
        new BasicButton("", "Delete", this.id)
            .addClass("basicbutton1")
            .fixLocation(20, y)
            .fixSize(this.masterWidth - 40, 24)
            .addAction("delete")
            .listenForClicks(this.clickHandler.bind(this))
    }
    changeHandler(details) {
        //console.log(details)
        dispatchMessage(MSGOBJECTEDIT, details.action, details.value)
    }
    clickHandler(details) {
        if (details.action == "delete") {
            dispatchMessage(MSGDELETE, null, null)
        } else {
            console.log(details)
        }
    }
    activate(item) {
        this.show()
        this.inpLayerLabel.value = item.layer

        this.rwyShapeEditor.activate(
            item,
            true,
            item.strokeColor,
            item.strokeWeight,
            item.fillColor
        )
        return this.masterHeight
    }
}
class ApproachEditorSubpanel extends Div {
    constructor(id, parentid, width) {
        super(id, parentid)
        this.masterWidth = width
        this.fixSize(this.masterWidth, 275)
        this.masterHeight = 255
        //-------------------------------------Object Type Label
        let y = 0
        let x = 5
        new Label("", "Object Type", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        new Label("", "Approach", this.id)
            .fixLocation(x + 7, y + 12)
            .addClass("obj-label2")

        //---------------------------------------------Display Layer
        y += 30
        new Label("", "Display Layer", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpLayerLabel = new NumberInput("", this.id)
            .setParms(0, 255, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeLayer")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------Shape Editor
        y += 40
        this.approachShapeEditor = new ShapeEditor(
            "",
            false,
            this.id
        ).fixLocation(x, y)
        //---------------------------------------------Delete button
        y += 125
        new BasicButton("", "Delete", this.id)
            .addClass("basicbutton1")
            .fixLocation(20, y)
            .fixSize(this.masterWidth - 40, 24)
            .addAction("delete")
            .listenForClicks(this.clickHandler.bind(this))
    }
    changeHandler(details) {
        //console.log(details)
        dispatchMessage(MSGOBJECTEDIT, details.action, details.value)
    }
    clickHandler(details) {
        if (details.action == "delete") {
            dispatchMessage(MSGDELETE, null, null)
        } else {
            console.log(details)
        }
    }
    activate(item) {
        this.show()
        this.inpLayerLabel.value = item.layer

        this.approachShapeEditor.activate(
            item,
            false,
            item.strokeColor,
            item.strokeWeight,
            item.fillColor
        )
        return this.masterHeight
    }
}
class AirwayEditorSubpanel extends Div {
    constructor(id, parentid, width) {
        super(id, parentid)
        this.masterWidth = width
        this.masterHeight = 375
        this.fixSize(this.masterWidth, this.masterHeight)
        //-------------------------------------Object Type Label
        let y = 0
        let x = 5
        new Label("", "Object Type", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        new Label("", "Airway", this.id)
            .fixLocation(x + 7, y + 12)
            .addClass("obj-label2")

        //---------------------------------------------Display Layer
        y += 30
        new Label("", "Display Layer", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpLayerLabel = new NumberInput("", this.id)
            .setParms(0, 255, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeLayer")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------Number of Vertices
        y += 40
        new Label("", "# Route Points", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpNumPointsLabel = new NumberInput("", this.id)
            .setParms(2, 16, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("numberPoints")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------Route Editor
        y += 40
        new Label("", "Route", this.id).fixLocation(x, y).addClass("obj-label")
        this.txtRoute = new Label("", "", this.id)
            .fixLocation(x, y + 15)
            .addClass("obj-label")
            .fontSize(13)
            .bold()
        //---------------------------------------------Shape Editor
        y += 80
        this.airwayShapeEditor = new ShapeEditor(
            "",
            false,
            this.id
        ).fixLocation(x, y)
        //---------------------------------------------Delete button
        y += 125
        new BasicButton("", "Delete", this.id)
            .addClass("basicbutton1")
            .fixLocation(20, y)
            .fixSize(this.masterWidth - 40, 24)
            .addAction("delete")
            .listenForClicks(this.clickHandler.bind(this))
    }
    changeHandler(details) {
        //console.log(details)
        dispatchMessage(MSGOBJECTEDIT, details.action, details.value)
    }
    clickHandler(details) {
        if (details.action == "delete") {
            dispatchMessage(MSGDELETE, null, null)
        } else {
            console.log(details)
        }
    }
    activate(item) {
        this.show()
        this.source = item
        this.inpLayerLabel.value = item.layer
        this.txtRoute.updateCaption(item.fixString)
        this.inpNumPointsLabel.value = item.aVertices.length

        this.airwayShapeEditor.activate(
            item,
            false,
            item.strokeColor,
            item.strokeWeight,
            null
        )
        return this.masterHeight
    }
    updateRoutePoints() {
        this.txtRoute.updateCaption(this.source.fixString)
    }
}
class SUAEditorSubpanel extends Div {
    constructor(id, parentid, width) {
        super(id, parentid)
        this.masterWidth = width
        this.masterHeight = 165
        this.fixSize(this.masterWidth, this.masterHeight)
        //-------------------------------------Object Type Label
        let y = 0
        let x = 5
        new Label("", "Object Type", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        new Label("", "SUA", this.id)
            .fixLocation(x + 7, y + 12)
            .addClass("obj-label2")

        //---------------------------------------------Display Layer
        y += 30
        new Label("", "Display Layer", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpLayerLabel = new NumberInput("", this.id)
            .setParms(0, 255, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeLayer")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------Number of Vertices
        y += 40
        new Label("", "# Vertices", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpNumPointsLabel = new NumberInput("", this.id)
            .setParms(3, 64, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("numberPoints")
            .listenForInput(this.changeHandler.bind(this))

        //---------------------------------------------Delete button
        y += 40
        new BasicButton("", "Delete", this.id)
            .addClass("basicbutton1")
            .fixLocation(20, y)
            .fixSize(this.masterWidth - 40, 24)
            .addAction("delete")
            .listenForClicks(this.clickHandler.bind(this))
    }
    changeHandler(details) {
        //console.log(details)
        dispatchMessage(MSGOBJECTEDIT, details.action, details.value)
    }
    clickHandler(details) {
        if (details.action == "delete") {
            dispatchMessage(MSGDELETE, null, null)
        } else {
            console.log(details)
        }
    }
    activate(item) {
        this.show()
        this.source = item
        this.inpLayerLabel.value = item.layer
        this.inpNumPointsLabel.value = item.aVertices.length
        return this.masterHeight
    }
}
class LineEditorSubpanel extends Div {
    constructor(id, parentid, width) {
        super(id, parentid)
        this.masterWidth = width
        this.masterHeight = 300
        this.fixSize(this.masterWidth, this.masterHeight)
        //-------------------------------------Object Type Label
        let y = 0
        let x = 5
        new Label("", "Object Type", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        new Label("", "Line", this.id)
            .fixLocation(x + 7, y + 12)
            .addClass("obj-label2")

        //---------------------------------------------Display Layer
        y += 30
        new Label("", "Display Layer", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpLayerLabel = new NumberInput("", this.id)
            .setParms(0, 255, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeLayer")
            .listenForInput(this.changeHandler.bind(this))

        //---------------------------------------------Shape Editor
        y += 40
        this.lineShapeEditor = new ShapeEditor("", false, this.id).fixLocation(
            x,
            y
        )
        //---------------------------------------------Dash Pattern
        y += 125
        new Label("", "Dash Pattern", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")

        this.inpDash0 = new NumberInput("", this.id)
            .setParms(1, 64, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(40, 18)
            .addClass("number-input")
            .addAction("changeDash0")
            .listenForInput(this.changeHandler.bind(this))
        this.inpDash1 = new NumberInput("", this.id)
            .setParms(0, 64, 1)
            .fixLocation(x + 55, y + 15)
            .fixSize(40, 18)
            .addClass("number-input")
            .addAction("changeDash1")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------Delete button
        y += 45
        new BasicButton("", "Delete", this.id)
            .addClass("basicbutton1")
            .fixLocation(20, y)
            .fixSize(this.masterWidth - 40, 24)
            .addAction("delete")
            .listenForClicks(this.clickHandler.bind(this))
    }
    changeHandler(details) {
        //console.log(details)
        dispatchMessage(MSGOBJECTEDIT, details.action, details.value)
    }
    clickHandler(details) {
        if (details.action == "delete") {
            dispatchMessage(MSGDELETE, null, null)
        } else {
            console.log(details)
        }
    }
    activate(item) {
        this.show()
        this.source = item
        this.inpLayerLabel.value = item.layer
        this.inpDash0.value = item.dashPattern[0]
        this.inpDash1.value = item.dashPattern[1]

        this.lineShapeEditor.activate(
            item,
            false,
            item.strokeColor,
            item.strokeWeight,
            null
        )
        return this.masterHeight
    }
}
class CircleEditorSubpanel extends Div {
    constructor(id, parentid, width) {
        super(id, parentid)
        this.masterWidth = width
        this.masterHeight = 330
        this.fixSize(this.masterWidth, this.masterHeight)
        //-------------------------------------Object Type Label
        let y = 0
        let x = 5
        new Label("", "Object Type", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        new Label("", "Circle", this.id)
            .fixLocation(x + 7, y + 12)
            .addClass("obj-label2")

        //---------------------------------------------Display Layer
        y += 30
        new Label("", "Display Layer", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpLayerLabel = new NumberInput("", this.id)
            .setParms(0, 255, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeLayer")
            .listenForInput(this.changeHandler.bind(this))

        //--------------------------------------------Radius
        y += 30
        new Label("", "Radius", this.id).fixLocation(x, y).addClass("obj-label")
        this.inpRadius = new NumberInput("", this.id)
            .setParms(0, 100, 0.1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeRadius")
            .listenForInput(this.changeHandler.bind(this))

        //---------------------------------------------Shape Editor
        y += 40
        this.shapeEditor = new ShapeEditor("", false, this.id).fixLocation(x, y)
        //---------------------------------------------Dash Pattern
        y += 125
        new Label("", "Dash Pattern", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")

        this.inpDash0 = new NumberInput("", this.id)
            .setParms(1, 64, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(40, 18)
            .addClass("number-input")
            .addAction("changeDash0")
            .listenForInput(this.changeHandler.bind(this))
        this.inpDash1 = new NumberInput("", this.id)
            .setParms(0, 64, 1)
            .fixLocation(x + 55, y + 15)
            .fixSize(40, 18)
            .addClass("number-input")
            .addAction("changeDash1")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------Delete button
        y += 45
        new BasicButton("", "Delete", this.id)
            .addClass("basicbutton1")
            .fixLocation(20, y)
            .fixSize(this.masterWidth - 40, 24)
            .addAction("delete")
            .listenForClicks(this.clickHandler.bind(this))
    }
    changeHandler(details) {
        //console.log(details)
        dispatchMessage(MSGOBJECTEDIT, details.action, details.value)
    }
    clickHandler(details) {
        if (details.action == "delete") {
            dispatchMessage(MSGDELETE, null, null)
        } else {
            console.log(details)
        }
    }
    activate(item) {
        this.show()
        this.source = item
        this.inpLayerLabel.value = item.layer
        this.inpRadius.value = item.radius
        this.inpDash0.value = item.dashPattern[0]
        this.inpDash1.value = item.dashPattern[1]

        this.shapeEditor.activate(
            item,
            true,
            item.strokeColor,
            item.strokeWeight,
            item.fillColor
        )
        return this.masterHeight
    }
}
class PolygonEditorSubpanel extends Div {
    constructor(id, parentid, width) {
        super(id, parentid)
        this.masterWidth = width
        this.masterHeight = 340
        this.fixSize(this.masterWidth, this.masterHeight)
        //-------------------------------------Object Type Label
        let y = 0
        let x = 5
        new Label("", "Object Type", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        new Label("", "Polygon", this.id)
            .fixLocation(x + 7, y + 12)
            .addClass("obj-label2")

        //---------------------------------------------Display Layer
        y += 30
        new Label("", "Display Layer", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpLayerLabel = new NumberInput("", this.id)
            .setParms(0, 255, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeLayer")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------Number of Vertices
        y += 40
        new Label("", "# Vertices", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpNumPointsLabel = new NumberInput("", this.id)
            .setParms(3, 64, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("numberPoints")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------Shape Editor
        y += 40
        this.shapeEditor = new ShapeEditor("", false, this.id).fixLocation(x, y)
        //---------------------------------------------Dash Pattern
        y += 125
        new Label("", "Dash Pattern", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")

        this.inpDash0 = new NumberInput("", this.id)
            .setParms(1, 64, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(40, 18)
            .addClass("number-input")
            .addAction("changeDash0")
            .listenForInput(this.changeHandler.bind(this))
        this.inpDash1 = new NumberInput("", this.id)
            .setParms(0, 64, 1)
            .fixLocation(x + 55, y + 15)
            .fixSize(40, 18)
            .addClass("number-input")
            .addAction("changeDash1")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------Delete button
        y += 40
        new BasicButton("", "Delete", this.id)
            .addClass("basicbutton1")
            .fixLocation(20, y)
            .fixSize(this.masterWidth - 40, 24)
            .addAction("delete")
            .listenForClicks(this.clickHandler.bind(this))
    }
    changeHandler(details) {
        //console.log(details)
        dispatchMessage(MSGOBJECTEDIT, details.action, details.value)
    }
    clickHandler(details) {
        if (details.action == "delete") {
            dispatchMessage(MSGDELETE, null, null)
        } else {
            console.log(details)
        }
    }
    activate(item) {
        this.show()
        this.source = item
        this.inpLayerLabel.value = item.layer
        this.inpNumPointsLabel.value = item.aVertices.length
        this.inpDash0.value = item.dashPattern[0]
        this.inpDash1.value = item.dashPattern[1]

        this.shapeEditor.activate(
            item,
            true,
            item.strokeColor,
            item.strokeWeight,
            item.fillColor
        )
        return this.masterHeight
    }
}
class TextEditorSubpanel extends Div {
    constructor(id, parentid, width) {
        super(id, parentid)
        this.masterWidth = width
        this.masterHeight = 300
        this.fixSize(this.masterWidth, this.masterHeight)
        //-------------------------------------Object Type Label
        let y = 0
        let x = 5
        new Label("", "Object Type", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        new Label("", "Text", this.id)
            .fixLocation(x + 7, y + 12)
            .addClass("obj-label2")

        //---------------------------------------------Display Layer
        y += 30
        new Label("", "Display Layer", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpLayerLabel = new NumberInput("", this.id)
            .setParms(0, 255, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeLayer")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------DESIGNATOR
        y += 40
        new Label("", "Text", this.id).fixLocation(x, y).addClass("obj-label")
        this.inpLabelText = new TextArea("", "", this.id)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth - 20, 50)
            .addClass("text-input")
            .addAction("changeLabelText")
            .listenForInput(this.changeHandler.bind(this))
        //--------------------------------------------Font Size
        y += 70
        new Label("", "Font Size", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpFontSize = new NumberInput("", this.id)
            .setParms(6, 120, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeFontSize")
            .listenForInput(this.changeHandler.bind(this))
        //--------------------------------------------Font Color
        y += 40
        new Label("", "Font Color", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.clrFont = new ColorInput("", this.id, "red")
            .fixLocation(x + 5, y + 15)
            .fixSize(40, 26)
            .addAction("colorFont")
            .addClass("inputcolor")
            .listenForChanges(this.changeHandler.bind(this))
        //---------------------------------------------Delete button
        y += 50
        new BasicButton("", "Delete", this.id)
            .addClass("basicbutton1")
            .fixLocation(20, y)
            .fixSize(this.masterWidth - 40, 24)
            .addAction("delete")
            .listenForClicks(this.clickHandler.bind(this))
    }
    changeHandler(details) {
        //console.log(details)
        dispatchMessage(MSGOBJECTEDIT, details.action, details.value)
    }
    clickHandler(details) {
        if (details.action == "delete") {
            dispatchMessage(MSGDELETE, null, null)
        } else {
            console.log(details)
        }
    }
    activate(item) {
        this.show()
        this.source = item
        this.inpLayerLabel.value = item.layer
        this.inpFontSize.value = item.fontSize
        this.clrFont.value = item.fontColor
        this.inpLabelText.value = item.text

        return this.masterHeight
    }
}
class AircraftEditorSubpanel extends Div {
    constructor(id, parentid, width) {
        super(id, parentid)
        this.masterWidth = width
        this.masterHeight = 440

        this.fixSize(this.masterWidth, this.masterHeight)
        //create an inner item so we can scrol
        this.scrollOverflowY()

        //-------------------------------------Object Type Label
        let y = 0
        let x = 5
        new Label("", "Object Type", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        new Label("", "Aircraft", this.id)
            .fixLocation(x + 7, y + 12)
            .addClass("obj-label2")

        //---------------------------------------------Display Layer
        y += 30
        new Label("", "Display Layer", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpLayerLabel = new NumberInput("", this.id)
            .setParms(0, 255, 1)
            .fixLocation(x + 7, y + 15)
            .fixSize(this.masterWidth / 2 - 24, 18)
            .addClass("number-input")
            .addAction("changeLayer")
            .listenForInput(this.changeHandler.bind(this))
        //---------------------------------------------Fix Size Override
        y += 36
        new Label("", "Target Size Multiplier", this.id)
            .addClass("obj-label")
            .fixLocation(x, y)
        this.inpTargetSize = new Slider("", 0.25, 5, 0.25, 1, this.id)
            .fixLocation(x + 7, y + 15)
            .setWidth(this.masterWidth - 24)
            .listenForInput(this.changeHandler.bind(this))
            .addAction("adjustTargetSize")
            .addClass("slider")
        //---------------------------------------------Fix Size Override
        y += 36
        new Label("", "Data Tag Size Multiplier", this.id)
            .addClass("obj-label")
            .fixLocation(x, y)
        this.inpTagSize = new Slider("", 0.25, 5, 0.25, 1, this.id)
            .fixLocation(x + 7, y + 15)
            .setWidth(this.masterWidth - 24)
            .listenForInput(this.changeHandler.bind(this))
            .addAction("adjustTagSize")
            .addClass("slider")

        //---------------------------------------------Shape Editor
        y += 40
        this.acShapeEditor = new ShapeEditor("", false, this.id).fixLocation(
            x,
            y
        )

        //---------------------------------------------Flight Details
        y += 130
        new Label("", "Flight Editor", this.id)
            .addClass("obj-label")
            .addClass("boldit")
            .addClass("underlineit")
            .fixLocation(x, y)

        //---------------------------------------------AC IDENT
        y += 18
        new Label("", "Ident", this.id).fixLocation(x, y).addClass("obj-label")
        this.inpIdent = new TextInput("", "", this.id)
            .fixLocation(x, y + 15)
            .fixSize(80, 20)
            .addClass("text-input")
            .addAction("changeIdent")
            .listenForInput(this.flightDetailsChange.bind(this))
        //---------------------------------------------AC Type
        x += 90
        new Label("", "Type", this.id).fixLocation(x, y).addClass("obj-label")
        this.selType = new SelectionBox("", this.id)
            .fixLocation(x, y + 15)
            .addClass("text-input")
            .fixSize(80, 20)
            .addAction("changeType")
            .listenForChanges(this.flightDetailsChange.bind(this))
        for (let i = 0; i < director.aACType.length; i++) {
            this.selType.addOption(i, director.aACType[i].ACType)
        }
        //---------------------------------------------AC IDENT
        x -= 90
        y += 38
        new Label("", "Altitude", this.id)
            .fixLocation(x, y)
            .addClass("obj-label")
        this.inpAltitude = new NumberInput("", this.id)
            .fixLocation(x, y + 15)
            .fixSize(80, 20)
            .addClass("number-input")
            .addAction("changeAltitude")
            .listenForInput(this.flightDetailsChange.bind(this))

        //---------------------------------------------Delete button
        y += 44
        this.btnFP = new BasicButton("", "Route Details", this.id)
            .addClass("basicbutton1")
            .fixLocation(20, y)
            .fixSize(this.masterWidth - 40, 24)
            .addAction("details")
            .listenForClicks(this.clickHandler.bind(this))

        //---------------------------------------------Delete button
        y += 32
        this.btnDelete = new BasicButton("", "Delete", this.id)
            .addClass("basicbutton1")
            .fixLocation(20, y)
            .fixSize(this.masterWidth - 40, 24)
            .addAction("delete")
            .listenForClicks(this.clickHandler.bind(this))
    }
    changeHandler(details) {
        // console.log("ac changeHandler")
        // console.log(details)
        dispatchMessage(MSGOBJECTEDIT, details.action, details.value)
    }
    flightDetailsChange(details) {
        dispatchMessage(MSGFLIGHTEDIT, details.action, details.value)
    }
    clickHandler(details) {
        // console.log("ac clickHandler")
        if (details.action == "delete") {
            dispatchMessage(MSGDELETE, null, null)
        } else if (details.action == "details") {
            dispatchMessage(MSGUI, "activateFPEditor", null)
        } else {
            console.log(details)
        }
    }

    activate(item) {
        this.show()
        this.source = item
        this.inpLayerLabel.value = item.layer
        this.inpTargetSize.value = item.targetSizeMult
        this.inpTagSize.value = item.tagSizeMult
        this.acShapeEditor.activate(
            item,
            true,
            item.strokeColor,
            item.strokeWeight,
            item.fillColor
        )

        this.inpIdent.value = item.ident
        this.selType.selectOption(item.typeIndex)
        //set the parms for the altitude input box and the value
        this.inpAltitude.setParms(0, item.alt.maxAlt, 10)
        this.inpAltitude.setValue(item.alt.curAlt)

        return this.masterHeight
    }
}
class FPEditor extends DraggableWindow {
    constructor(id, closeImgURL, parentid = null) {
        super(id, closeImgURL, parentid)
        let uid = this.id
        //console.log(uid)

        this.fixSize(300, 125)
            .assignClasses("wn-draggable-main", "wn-titlebar", "imagebutton")
            .addAction(id)
            .getCloseNotifications(this.clickHandler.bind(this))
            .hide()

        this.source = null
    }
    clickHandler(details) {
        console.log(details)
        if (details.action == "wnFPEditor:close") {
            this.hide()
            dispatchMessage(MSGUI, "finishFPEditor", null)
        }
    }
    activate(ac) {
        console.log("activating FPEditor")
        this.show()
    }
}
//*------------------------Map Item Classes
class MapItem {
    constructor(displayContainer, displayList, type) {
        this.type = type
        this.displayContainer = displayContainer
        this.containerID = displayContainer.cntSVG.id
        this.layer = 10
        this.aDragHandles = []
        this.index = displayList.length
        displayList.push(this)
        this.iconBaseClass = "svgDisplayObject"
        if (type == "airway" || type == "line") {
            this.iconBaseClass = "svgLine"
            this.icon = new svgPolyline("", this.displayContainer.cntSVG.id)
        } else if (type == "fix") {
            this.icon = new svgRectangle("", displayContainer.cntSVG.id)
        } else if (type == "circle") {
            this.icon = new svgCircle("", displayContainer.cntSVG.id)
        } else {
            this.icon = new svgPolygon("", this.displayContainer.cntSVG.id)
        }
        this.icon.addClass(this.iconBaseClass)
    }
    destructor() {
        this.icon.destroy()
        this.aDragHandles.forEach((item) => item.destroy())
    }
    adjustSVGZ() {
        this.icon.changeParent(this.containerID)
        this.aDragHandles.forEach((item) => item.changeParent(this.containerID))
    }
    draw(itemSelected) {
        if (this == itemSelected) {
            this.icon.changeClass("highlight")
            this.showDragHandles()
        } else {
            this.icon.changeClass(this.iconBaseClass)
            this.hideDragHandles()
        }
    }
    showDragHandles() {
        this.aDragHandles.forEach((item) => item.show())
    }
    hideDragHandles() {
        this.aDragHandles.forEach((item) => item.hide())
    }
    changeLayer(l) {
        this.layer = l
        this.icon.setZ(l)
        this.aDragHandles.forEach((item) => item.setZ(l))
    }
}
class Fix extends MapItem {
    static fixNumber = 0
    constructor(f, dispX, dispY, settings, displayContainer, displayList) {
        super(displayContainer, displayList, "fix")
        //console.log(f);
        this.fixType = f.fixType
        let p = Pos2d.posFromDisplay(dispX, dispY)
        this.pos = new Pos2d(p.x, p.y)

        //save settings so we have access to the bShowLabels and label color
        this.settings = settings
        this.bShowLabel = false

        if (this.fixType == "bmp") {
            this.img = f.img
        } else {
            this.img = null
            this.strokeColor = settings.fixStrokeColor
            this.fillColor = settings.fixFillColor
            this.strokeWeight = settings.fixStrokeWeight
        }
        this.size = settings.baseFixSize / 2
        this.bOverrideSize = false
        //*-------create Vertices

        //Assign a designator
        Fix.fixNumber++
        let tNum = String(Fix.fixNumber)
        if (tNum.length == 1) tNum = "00" + tNum
        else if (tNum.length == 2) tNum = "0" + tNum
        this.desig = "FIX" + tNum

        //assign and index value and add to Display object array
    }
    destructor() {
        this.icon.destroy()
        this.pos = null
        this.aIconVertices = null
    }
    overrideSize(sz) {
        this.sizw = sz / 2
        this.bOverrideSize = true
        this.updateVertices()
        main.triggerRedraw(false)
    }
    updateSize(sz) {
        if (!this.bOverrideSize) {
            this.size = sz / 2
            //this.updateVertices()
        }
    }
    moveItem(dX, dY) {
        if (director.bEditingFlightPlan) return
        //console.log(details);
        this.pos.display.x += dX
        this.pos.display.y += dY
        this.pos.updatePosFromDisplay()
        //appData.itemSelected = this;
        dispatchMessage(MSGREDRAW, true)
    }
    draw(itemSelected) {
        super.draw(itemSelected)
        this.pos.updateDisplay()

        let cv = this.displayContainer.canvas
        //draw the image on the canvas
        let dSize = Pos2d.getDisplayDistance(this.size)
        if (this.fixType == "bmp") {
            cv.ctx.drawImage(
                this.img,
                this.pos.display.x - dSize,
                this.pos.display.y - dSize,
                dSize * 2,
                dSize * 2
            )
        } else {
            cv.strokeStyle(this.strokeColor)
            cv.weight = this.strokeWeight
            cv.fillStyle(this.fillColor)
            if (this.fixType == "square") {
                cv.rectangle(
                    this.pos.display.x,
                    this.pos.display.y,
                    dSize * 2,
                    dSize * 2,
                    true
                )
            } else if (this.fixType == "circle") {
                cv.circle(this.pos.display, dSize, true)
            } else if (this.fixType == "triangle") {
                let ctx = cv.ctx
                ctx.beginPath()
                ctx.moveTo(
                    this.pos.display.x - dSize,
                    this.pos.display.y + dSize
                )
                ctx.lineTo(this.pos.display.x, this.pos.display.y - dSize)
                ctx.lineTo(
                    this.pos.display.x + dSize,
                    this.pos.display.y + dSize
                )
                ctx.closePath()
                ctx.stroke()
                ctx.fill()
            } else if (this.fixType == "diamond") {
                let ctx = cv.ctx
                ctx.beginPath()
                ctx.moveTo(this.pos.display.x - dSize * 0.7, this.pos.display.y)
                ctx.lineTo(this.pos.display.x, this.pos.display.y - dSize)
                ctx.lineTo(this.pos.display.x + dSize * 0.7, this.pos.display.y)
                ctx.lineTo(this.pos.display.x, this.pos.display.y + dSize)
                ctx.closePath()
                ctx.stroke()
                ctx.fill()
            } else if (this.fixType == "star") {
                let ctx = cv.ctx
                let x = this.pos.display.x
                let y = this.pos.display.y
                let s = dSize * 0.2
                ctx.beginPath()
                ctx.moveTo(x - dSize, y)
                ctx.lineTo(x - s, y - s)
                ctx.lineTo(x, y - dSize)
                ctx.lineTo(x + s, y - s)
                ctx.lineTo(x + dSize, y)
                ctx.lineTo(x + s, y + s)
                ctx.lineTo(x, y + dSize)
                ctx.lineTo(x - s, y + s)
                ctx.closePath()
                ctx.stroke()
                ctx.fill()
            }
        }
        this.icon.setSize(dSize * 2, dSize * 2)
        this.icon.locate(this.pos.display)

        //show fix designator if needed
        if (this.bShowLabel || this.settings.bShowLabels) {
            let fontSize = this.settings.labelFontSize * (Pos2d.zoom / 15)
            cv.fillStyle(this.settings.labelFontColor)
            cv.drawText(
                this.desig,
                fontSize,
                this.pos.display.x,
                this.pos.display.y - dSize * 1.5,
                false
            )
        }
    }
}
class Runway extends MapItem {
    constructor(
        dispX,
        dispY,
        dispW,
        dispH,
        settings,
        displayContainer,
        displayList
    ) {
        super(displayContainer, displayList, "runway")
        let p = Pos2d.posFromDisplay(dispX, dispY)
        this.pos = new Pos2d(p.x, p.y)
        this.length = Pos2d.getWorldDistance(dispW) / 2
        this.width = Pos2d.getWorldDistance(dispH) / 2
        //Assign a layer

        //create corner vertices and drag handles
        this.aIconVertices = []
        this.aControlPoints = []
        for (let i = 0; i < 4; i++) {
            this.aIconVertices.push(new Pos2d())
            this.aControlPoints.push(new Pos2d())
            this.icon.addPoint()
            let c = new svgCircle("", this.displayContainer.cntSVG.id)
            c.addClass("dragHandle")
            c.setRadius(4)
            c.type = "dragHandle"
            c.index = i
            c.containingObject = this
            c.addAction("dragHandle")
            this.aDragHandles.push(c)
        }
        //set the runway rotation
        this.heading = 90
        this.updateVertices()

        //set initial colors
        this.strokeWeight = settings.rwyStrokeWeight
        this.strokeColor = settings.rwyStrokeColor
        this.fillColor = settings.rwyFillColor
    }
    updateVertices() {
        //update control points
        this.aControlPoints[0].update(0, this.length)
        this.aControlPoints[1].update(this.width, 0)
        this.aControlPoints[2].update(0, -this.length)
        this.aControlPoints[3].update(-this.width, 0)
        for (let i = 0; i < this.aControlPoints.length; i++) {
            let item = this.aControlPoints[i]
            item.rotate2d(-this.heading, true)
            item.increment(this.pos)
            item.updateDisplay()
            this.aDragHandles[i].locate(item.display)
        }

        this.aIconVertices[0].update(this.width, this.length)
        this.aIconVertices[1].update(this.width, -this.length)
        this.aIconVertices[2].update(-this.width, -this.length)
        this.aIconVertices[3].update(-this.width, this.length)
        this.aIconVertices.forEach((item) => {
            item.rotate2d(-this.heading, true)
            item.increment(this.pos)
            item.updateDisplay()
        })

        for (let i = 0; i < 4; i++) {
            this.aIconVertices[i].updateDisplay()
            this.icon.update(
                i,
                this.aIconVertices[i].display.x,
                this.aIconVertices[i].display.y
            )
        }
    }
    moveItem(dX, dY) {
        if (director.bEditingFlightPlan) return
        //console.log(details);
        this.pos.display.x += dX
        this.pos.display.y += dY
        this.pos.updatePosFromDisplay()
        this.updateVertices()
        //appData.itemSelected = this;
        dispatchMessage(MSGREDRAW, true)
    }
    dragHandle(index, dX, dY) {
        //if affecting the width
        if (index == 1 || index == 3) {
            //get vector u which is the movement vector
            let u = new Vector(
                Pos2d.getWorldDistance(dX),
                Pos2d.getWorldDistance(-dY)
            )
            //get vector a which is the centreline of the runway
            let a = this.aControlPoints[index].minus(this.pos).normalize()
            //get the dot product
            let dot = u.dot(a)
            //note that norm a is 1, norm a^2 is 1.
            let projUonA = a.multiply(dot)
            let distChange = projUonA.length
            if (index == 1) {
                this.aControlPoints[1].increment(projUonA)
                this.aIconVertices[0].increment(projUonA)
                this.aIconVertices[1].increment(projUonA)
            } else {
                this.aControlPoints[3].increment(projUonA)
                this.aIconVertices[2].increment(projUonA)
                this.aIconVertices[3].increment(projUonA)
            }
            this.width =
                this.aControlPoints[1].minus(this.aControlPoints[3]).length / 2
            this.pos.x =
                (this.aControlPoints[1].x + this.aControlPoints[3].x) / 2
            this.pos.y =
                (this.aControlPoints[1].y + this.aControlPoints[3].y) / 2
            dispatchMessage(MSGREDRAW, true)
            return
        }
        //if dragging the runway end - can move and rotate
        let fixPt, movePt
        if (index == 0) {
            fixPt = this.aControlPoints[2]
            movePt = this.aControlPoints[0]
        } else {
            fixPt = this.aControlPoints[0]
            movePt = this.aControlPoints[2]
        }
        //move the point according to the mouse movement
        movePt.display.x += dX
        movePt.display.y += dY
        movePt.updatePosFromDisplay()
        //get location of runway centre
        this.pos.x = (movePt.x + fixPt.x) / 2
        this.pos.y = (movePt.y + fixPt.y) / 2
        //determine the heading from those two points
        let v = this.aControlPoints[0].minus(this.aControlPoints[2])
        this.length = v.length / 2
        this.heading = v.heading
        dispatchMessage(MSGREDRAW, true)
        //console.log(Math.round(this.heading));
    }
    draw(itemSelected) {
        super.draw(itemSelected)
        this.pos.updateDisplay()
        this.updateVertices()

        let cv = this.displayContainer.canvas
        let ctx = cv.ctx
        cv.weight = this.strokeWeight
        cv.strokeStyle(this.strokeColor)
        cv.fillStyle(this.fillColor)

        ctx.beginPath()
        ctx.moveTo(
            this.aIconVertices[0].display.x,
            this.aIconVertices[0].display.y
        )
        ctx.lineTo(
            this.aIconVertices[1].display.x,
            this.aIconVertices[1].display.y
        )
        ctx.lineTo(
            this.aIconVertices[2].display.x,
            this.aIconVertices[2].display.y
        )
        ctx.lineTo(
            this.aIconVertices[3].display.x,
            this.aIconVertices[3].display.y
        )
        ctx.closePath()
        ctx.stroke()
        ctx.fill()

        //draw centreline
        cv.weight = 1
        cv.setDashPattern(4, 2)
        cv.drawLinePoints(
            this.aControlPoints[0].display,
            this.aControlPoints[2].display
        )
        cv.clearDashPattern()
    }
}
class Approach extends MapItem {
    constructor(
        dispX,
        dispY,
        dispW,
        dispH,
        settings,
        displayContainer,
        displayList
    ) {
        super(displayContainer, displayList, "approach")
        let p = Pos2d.posFromDisplay(dispX, dispY)
        this.pos = new Pos2d(p.x, p.y)
        this.length = Pos2d.getWorldDistance(dispW) / 2
        this.width = Pos2d.getWorldDistance(dispH) / 2

        //create corner vertices and drag handles
        this.aIconVertices = []
        this.aControlPoints = []
        for (let i = 0; i < 4; i++) {
            this.aIconVertices.push(new Pos2d())
            this.aControlPoints.push(new Pos2d())
            this.icon.addPoint()
            let c = new svgCircle("", this.displayContainer.cntSVG.id)
            c.addClass("dragHandle")
            c.setRadius(4)
            c.type = "dragHandle"
            c.index = i
            c.containingObject = this
            c.addAction("dragHandle")
            this.aDragHandles.push(c)
        }
        //set the runway rotation
        this.heading = 90
        this.updateVertices()

        this.strokeWeight = settings.approachStrokeWeight
        this.strokeColor = settings.approachStrokeColor
    }
    updateVertices() {
        //update control points
        this.aControlPoints[0].update(0, this.length)
        this.aControlPoints[1].update(this.width, 0)
        this.aControlPoints[2].update(0, -this.length)
        this.aControlPoints[3].update(-this.width, 0)
        for (let i = 0; i < this.aControlPoints.length; i++) {
            let item = this.aControlPoints[i]
            item.rotate2d(-this.heading, true)
            item.increment(this.pos)
            item.updateDisplay()
            this.aDragHandles[i].locate(item.display)
        }

        this.aIconVertices[0].update(this.width, this.length)
        this.aIconVertices[1].update(this.width, -this.length)
        this.aIconVertices[2].update(-this.width, -this.length)
        this.aIconVertices[3].update(-this.width, this.length)
        this.aIconVertices.forEach((item) => {
            item.rotate2d(-this.heading, true)
            item.increment(this.pos)
            item.updateDisplay()
        })

        for (let i = 0; i < 4; i++) {
            this.aIconVertices[i].updateDisplay()
            this.icon.update(
                i,
                this.aIconVertices[i].display.x,
                this.aIconVertices[i].display.y
            )
        }
    }
    moveItem(dX, dY) {
        if (director.bEditingFlightPlan) return
        //console.log(details);
        this.pos.display.x += dX
        this.pos.display.y += dY
        this.pos.updatePosFromDisplay()
        this.updateVertices()
        //appData.itemSelected = this;
        dispatchMessage(MSGREDRAW, true)
    }
    dragHandle(index, dX, dY) {
        //if affecting the width
        if (index == 1 || index == 3) {
            //get vector u which is the movement vector
            let u = new Vector(
                Pos2d.getWorldDistance(dX),
                Pos2d.getWorldDistance(-dY)
            )
            //get vector a which is the centreline of the runway
            let a = this.aControlPoints[index].minus(this.pos).normalize()
            //get the dot product
            let dot = u.dot(a)
            //note that norm a is 1, norm a^2 is 1.
            let projUonA = a.multiply(dot)
            let distChange = projUonA.length
            if (index == 1) {
                this.aControlPoints[1].increment(projUonA)
                this.aIconVertices[0].increment(projUonA)
                this.aIconVertices[1].increment(projUonA)
            } else {
                this.aControlPoints[3].increment(projUonA)
                this.aIconVertices[2].increment(projUonA)
                this.aIconVertices[3].increment(projUonA)
            }
            this.width =
                this.aControlPoints[1].minus(this.aControlPoints[3]).length / 2
            this.pos.x =
                (this.aControlPoints[1].x + this.aControlPoints[3].x) / 2
            this.pos.y =
                (this.aControlPoints[1].y + this.aControlPoints[3].y) / 2
            dispatchMessage(MSGREDRAW, true)
            return
        }
        //if dragging the runway end - can move and rotate
        let fixPt, movePt
        if (index == 0) {
            fixPt = this.aControlPoints[2]
            movePt = this.aControlPoints[0]
        } else {
            fixPt = this.aControlPoints[0]
            movePt = this.aControlPoints[2]
        }
        //move the point according to the mouse movement
        movePt.display.x += dX
        movePt.display.y += dY
        movePt.updatePosFromDisplay()
        //get location of runway centre
        this.pos.x = (movePt.x + fixPt.x) / 2
        this.pos.y = (movePt.y + fixPt.y) / 2
        //determine the heading from those two points
        let v = this.aControlPoints[0].minus(this.aControlPoints[2])
        this.length = v.length / 2
        this.heading = v.heading
        dispatchMessage(MSGREDRAW, true)
        //console.log(Math.round(this.heading));
    }
    draw(itemSelected) {
        super.draw(itemSelected)
        this.pos.updateDisplay()
        this.updateVertices()

        let cv = this.displayContainer.canvas
        let ctx = cv.ctx
        cv.weight = this.strokeWeight
        cv.strokeStyle(this.strokeColor)
        //determine arrow point

        let vr1 = this.aControlPoints[0].display
        let vr2 = this.aControlPoints[2].display
        let v = new Point(vr1.x - vr2.x, vr1.y - vr2.y)
        v.x *= 0.1
        v.y *= 0.1
        let arPt = new Point(vr2.x + v.x, vr2.y + v.y)

        ctx.beginPath()
        ctx.moveTo(
            this.aControlPoints[0].display.x,
            this.aControlPoints[0].display.y
        )
        ctx.lineTo(
            this.aIconVertices[2].display.x,
            this.aIconVertices[2].display.y
        )
        ctx.lineTo(arPt.x, arPt.y)
        ctx.lineTo(
            this.aIconVertices[1].display.x,
            this.aIconVertices[1].display.y
        )
        ctx.lineTo(
            this.aControlPoints[0].display.x,
            this.aControlPoints[0].display.y
        )
        ctx.lineTo(arPt.x, arPt.y)
        ctx.closePath()
        ctx.stroke()
    }
}
class Airway extends MapItem {
    constructor(dispX, dispY, settings, displayContainer, displayList) {
        super(displayContainer, displayList, "airway")
        let p1 = Pos2d.posFromDisplay(dispX - 100, dispY)
        let p2 = Pos2d.posFromDisplay(dispX + 100, dispY)

        this.fixString =
            ROUND(p1.x, 2) +
            "/" +
            ROUND(p1.y, 2) +
            " " +
            ROUND(p2.x, 2) +
            "/" +
            ROUND(p2.y, 2)
        //this.fixString = "FIX001 FIX002 FIX003"
        this.aVertices = []

        this.updateFromFixString()

        this.strokeWeight = settings.airwayStrokeWeight
        this.strokeColor = settings.airwayStrokeColor
    }
    updateFromFixString(s) {
        let f = this.parseFixString(this.fixString)

        //first ensure the right number of vertices and drag handles
        while (this.aVertices.length < f.length) {
            this.icon.addPoint()
            this.aVertices.push(new Pos2d(0, 0))
            let c = new svgCircle("", this.displayContainer.cntSVG.id)
            c.addClass("dragHandle")
            c.setRadius(4)
            c.type = "dragHandle"
            c.index = this.aVertices.length
            c.containingObject = this
            c.addAction("dragHandle")
            this.aDragHandles.push(c)
        }
        while (this.aVertices.length > f.length) {
            this.icon.removePoint()
            this.aVertices.pop()
            let c = this.aDragHandles.pop()
            c.destroy()
        }
        //NOW, get the correct values into the vertices
        for (let i = 0; i < f.length; i++) {
            //console.log(f[i])
            this.aDragHandles[i].index = i
            if (f[i].type == "point") {
                //console.log(f[i])
                this.aVertices[i].update(Number(f[i].x), Number(f[i].y))
            } else {
                //we have a fix and the name should be in the display list
                let pos = director.getItemPosFromFixDesignator(f[i].ident)
                //console.log(pos)
                if (!pos) {
                    this.aVertices[i].update(0, 0)
                } else {
                    this.aVertices[i].update(pos.x, pos.y)
                }
            }
        }
    }
    updateFixStringFromVertices() {
        this.fixString = ""
        for (let i = 0; i < this.aVertices.length; i++) {
            let v = this.aVertices[i]
            //determine if it is inside the radius of a fix
            let near = director.getWithinFixRadius(v)

            if (near) {
                this.fixString += near
            } else {
                this.fixString += ROUND(v.x, 2) + "/" + ROUND(v.y, 2)
            }
            if (i < this.aVertices.length - 1) {
                this.fixString += " "
            }
        }
        dispatchMessage(MSGAIRWAYCHANGE, null, this.fixString)
    }
    changeNumberOfVertices(num) {
        let fixes = this.parseFixString(this.fixString)
        while (fixes.length > num) {
            fixes.pop()
        }
        if (num > fixes.length) {
            let i = 0
            //get world position of last fix
            let fix = fixes[fixes.length - 1]
            let x = 0
            let y = 0
            if (fix.type == "point") {
                x = fix.x
                y = fix.y
            } else {
                let pos = director.getItemPosFromFixDesignator(fix.ident)
                x = pos.x
                y = pos.y
            }

            //get relative distance for 25 pixels
            let xOffset = Pos2d.getWorldDistance(25)
            while (num > fixes.length) {
                i++
                let f = {
                    type: "point",
                    x: x + xOffset * i,
                    y: y,
                }
                fixes.push(f)
            }
        }
        this.assembleFixStringFromArray(fixes)
        this.updateFromFixString()
    }
    assembleFixStringFromArray(fixes) {
        //console.log(fixes)
        this.fixString = ""
        for (let i = 0; i < fixes.length; i++) {
            if (fixes[i].type == "point") {
                this.fixString += fixes[i].x + "/" + fixes[i].y
            } else {
                this.fixString += fixes[i].ident
            }
            if (i < fixes.length - 1) this.fixString += " "
        }
        //console.log(this.fixString)
    }
    parseFixString(s) {
        let pts = s.split(" ")
        let fixes = []
        for (let i = 0; i < pts.length; i++) {
            let p = pts[i]
            if (p.length < 1) continue
            let f = {}
            if (p.includes("/")) {
                f.type = "point"
                let coords = p.split("/")
                f.x = Number(ROUND(coords[0], 2))
                f.y = Number(ROUND(coords[1], 2))
            } else {
                f.type = "fix"
                f.ident = p
            }
            fixes.push(f)
        }
        return fixes
    }
    updateVertices() {
        for (let i = 0; i < this.aVertices.length; i++) {
            this.aVertices[i].updateDisplay()
            this.icon.update(
                i,
                this.aVertices[i].display.x,
                this.aVertices[i].display.y
            )
            this.aDragHandles[i].locate(this.aVertices[i].display)
        }
    }
    dragHandle(index, dX, dY) {
        let u = new Vector(
            Pos2d.getWorldDistance(dX),
            Pos2d.getWorldDistance(-dY)
        )
        this.aVertices[index].x += u.x
        this.aVertices[index].y += u.y
        this.updateFixStringFromVertices()
        dispatchMessage(MSGREDRAW, true)
    }
    moveItem() {
        //do nothing
    }
    draw(itemSelected) {
        super.draw(itemSelected)
        this.updateFromFixString()
        this.updateVertices()
        let cv = this.displayContainer.canvas
        let ctx = cv.ctx
        cv.weight = this.strokeWeight
        cv.strokeStyle(this.strokeColor)

        ctx.beginPath()
        ctx.moveTo(this.aVertices[0].display.x, this.aVertices[0].display.y)
        for (let i = 1; i < this.aVertices.length; i++) {
            ctx.lineTo(this.aVertices[i].display.x, this.aVertices[i].display.y)
        }
        ctx.stroke()
    }
}
class Sua extends MapItem {
    constructor(dispX, dispY, settings, displayContainer, displayList) {
        super(displayContainer, displayList, "sua")

        //create corner vertices and drag handles
        this.aVertices = []
        this.setupVertices(dispX, dispY)
        this.strokeWeight = settings.suaStrokeWeight
        this.strokeColor = settings.suaStrokeColor
        this.fillColor = settings.suaFillColor
        this.addCounter = 0
    }
    setupVertices(x, y) {
        let pts = []
        pts.push(new Vector(x, y))
        x += 50
        let u = new Vector(x, y)
        pts.push(u)
        let v = new Vector(50, 0)
        for (let i = 0; i < 3; i++) {
            v.rotate2d(72, true)
            let newV = u.plus(v)
            pts.push(newV)
            u = new Vector(newV.x, newV.y)
        }

        for (let i = 0; i < pts.length; i++) {
            //create vertex
            this.aVertices.push(Pos2d.newFromDisplay(pts[i].x, pts[i].y))
            //add corresponding point to icon
            this.icon.addPoint()
            //create a drag handle
            let c = new svgCircle("", this.displayContainer.cntSVG.id)
            c.addClass("dragHandle")
            c.setRadius(4)
            c.type = "dragHandle"

            c.containingObject = this
            c.addAction("dragHandle")
            this.aDragHandles.push(c)
        }
        for (let i = 0; i < this.aVertices.length; i++) {
            this.aDragHandles[i].index = i
        }
    }
    changeNumberOfVertices(num) {
        while (this.aVertices.length > num) {
            this.aVertices.pop()
            this.icon.removePoint()
            let a = this.aDragHandles.pop()
            a.destroy()
        }
        while (this.aVertices.length < num) {
            if (this.addCounter > this.aVertices.length - 1) {
                this.addCounter -= this.aVertices.length
            }
            let n1 = this.addCounter
            let n2 = this.addCounter + 1
            if (n2 >= this.aVertices.length) {
                n2 = 0
            }

            let x = (this.aVertices[n1].x + this.aVertices[n2].x) / 2
            let y = (this.aVertices[n1].y + this.aVertices[n2].y) / 2

            let v = new Pos2d(x, y)
            this.aVertices.splice(n2, 0, v)

            this.addCounter += 2

            this.icon.addPoint()
            //create a drag handle
            let c = new svgCircle("", this.displayContainer.cntSVG.id)
            c.addClass("dragHandle")
            c.setRadius(4)
            c.type = "dragHandle"
            c.containingObject = this
            c.addAction("dragHandle")
            this.aDragHandles.push(c)
        }

        for (let i = 0; i < this.aVertices.length; i++) {
            this.aDragHandles[i].index = i
        }
    }
    updateVertices() {
        for (let i = 0; i < this.aVertices.length; i++) {
            this.aVertices[i].updateDisplay()
            this.icon.update(
                i,
                this.aVertices[i].display.x,
                this.aVertices[i].display.y
            )
            this.aDragHandles[i].locate(this.aVertices[i].display)
            this.aDragHandles[i].index = i
        }
    }
    moveItem(dX, dY) {
        if (director.bEditingFlightPlan) return
        //console.log(details);
        this.aVertices.forEach((item) => {
            item.display.x += dX
            item.display.y += dY
            item.updatePosFromDisplay()
        })
        //appData.itemSelected = this;
        dispatchMessage(MSGREDRAW, true)
    }
    dragHandle(index, dX, dY) {
        let u = new Vector(
            Pos2d.getWorldDistance(dX),
            Pos2d.getWorldDistance(-dY)
        )
        this.aVertices[index].x += u.x
        this.aVertices[index].y += u.y
        dispatchMessage(MSGREDRAW, true)
    }
    draw(itemSelected) {
        super.draw(itemSelected)
        this.updateVertices()
        let cv = this.displayContainer.canvas
        let ctx = cv.ctx
        cv.weight = this.strokeWeight
        cv.strokeStyle(this.strokeColor)
        cv.fillStyle(this.fillColor)

        ctx.beginPath()
        ctx.moveTo(this.aVertices[0].display.x, this.aVertices[0].display.y)
        for (let i = 1; i < this.aVertices.length; i++) {
            ctx.lineTo(this.aVertices[i].display.x, this.aVertices[i].display.y)
        }
        ctx.lineTo(this.aVertices[0].display.x, this.aVertices[0].display.y)
        ctx.stroke()
        ctx.fill()
    }
}
class LineShape extends MapItem {
    constructor(dispX, dispY, settings, displayContainer, displayList) {
        super(displayContainer, displayList, "line")
        let p1 = Pos2d.newFromDisplay(dispX - 100, dispY)
        let p2 = Pos2d.newFromDisplay(dispX + 100, dispY)

        //this.fixString = "FIX001 FIX002 FIX003"
        this.aVertices = [p1, p2]
        for (let i = 0; i < this.aVertices.length; i++) {
            //add corresponding point to icon
            this.icon.addPoint()
            //create a drag handle
            let c = new svgCircle("", this.displayContainer.cntSVG.id)
            c.addClass("dragHandle")
            c.setRadius(4)
            c.type = "dragHandle"
            c.index = i
            c.containingObject = this
            c.addAction("dragHandle")
            this.aDragHandles.push(c)
        }
        this.strokeWeight = settings.shapeStrokeWeight
        this.strokeColor = settings.shapeStrokeColor
        this.dashPattern = [1, 0]
    }
    updateVertices() {
        for (let i = 0; i < this.aVertices.length; i++) {
            this.aVertices[i].updateDisplay()
            this.icon.update(
                i,
                this.aVertices[i].display.x,
                this.aVertices[i].display.y
            )
            this.aDragHandles[i].locate(this.aVertices[i].display)
        }
    }
    dragHandle(index, dX, dY) {
        let u = new Vector(
            Pos2d.getWorldDistance(dX),
            Pos2d.getWorldDistance(-dY)
        )
        this.aVertices[index].x += u.x
        this.aVertices[index].y += u.y

        dispatchMessage(MSGREDRAW, true)
    }
    moveItem() {
        //do nothing
    }
    draw(itemSelected) {
        super.draw(itemSelected)

        this.updateVertices()
        let cv = this.displayContainer.canvas
        let ctx = cv.ctx
        cv.weight = this.strokeWeight
        cv.strokeStyle(this.strokeColor)
        cv.setDashPattern(this.dashPattern[0], this.dashPattern[1])
        ctx.beginPath()
        ctx.moveTo(this.aVertices[0].display.x, this.aVertices[0].display.y)
        for (let i = 1; i < this.aVertices.length; i++) {
            ctx.lineTo(this.aVertices[i].display.x, this.aVertices[i].display.y)
        }
        ctx.stroke()
        cv.clearDashPattern()
    }
}
class CircleShape extends MapItem {
    constructor(dispX, dispY, settings, displayContainer, displayList) {
        super(displayContainer, displayList, "circle")
        let p = Pos2d.posFromDisplay(dispX, dispY)
        this.pos = new Pos2d(p.x, p.y)
        this.radius = 2
        //create corner vertices and drag handles
        this.strokeWeight = settings.shapeStrokeWeight
        this.strokeColor = settings.shapeStrokeColor
        this.fillColor = settings.shapeFillColor
        this.dashPattern = [1, 0]
    }

    moveItem(dX, dY) {
        if (director.bEditingFlightPlan) return
        //console.log(details);
        this.pos.display.x += dX
        this.pos.display.y += dY
        this.pos.updatePosFromDisplay()
        //appData.itemSelected = this;
        dispatchMessage(MSGREDRAW, true)
    }
    draw(itemSelected) {
        super.draw(itemSelected)
        this.pos.updateDisplay()

        let cv = this.displayContainer.canvas
        //draw the image on the canvas
        let dSize = Pos2d.getDisplayDistance(this.radius)

        cv.strokeStyle(this.strokeColor)
        cv.weight = this.strokeWeight
        cv.fillStyle(this.fillColor)
        cv.setDashPattern(this.dashPattern[0], this.dashPattern[1])
        cv.circle(this.pos.display, dSize, true)

        this.icon.setRadius(dSize)
        this.icon.locate(this.pos.display)
        cv.clearDashPattern()
    }
}
class PolygonShape extends MapItem {
    constructor(dispX, dispY, settings, displayContainer, displayList) {
        super(displayContainer, displayList, "polygon")
        //create corner vertices and drag handles
        this.aVertices = []
        this.setupVertices(dispX, dispY)
        this.strokeWeight = settings.shapeStrokeWeight
        this.strokeColor = settings.shapeStrokeColor
        this.fillColor = settings.shapeFillColor
        this.addCounter = 0
        this.dashPattern = [1, 0]
    }
    setupVertices(x, y) {
        let pts = []
        pts.push(new Vector(x, y))
        x += 50
        let u = new Vector(x, y)
        pts.push(u)
        let v = new Vector(50, 0)
        for (let i = 0; i < 3; i++) {
            v.rotate2d(72, true)
            let newV = u.plus(v)
            pts.push(newV)
            u = new Vector(newV.x, newV.y)
        }

        for (let i = 0; i < pts.length; i++) {
            //create vertex
            this.aVertices.push(Pos2d.newFromDisplay(pts[i].x, pts[i].y))
            //add corresponding point to icon
            this.icon.addPoint()
            //create a drag handle
            let c = new svgCircle("", this.displayContainer.cntSVG.id)
            c.addClass("dragHandle")
            c.setRadius(4)
            c.type = "dragHandle"

            c.containingObject = this
            c.addAction("dragHandle")
            this.aDragHandles.push(c)
        }
        for (let i = 0; i < this.aVertices.length; i++) {
            this.aDragHandles[i].index = i
        }
    }
    changeNumberOfVertices(num) {
        while (this.aVertices.length > num) {
            this.aVertices.pop()
            this.icon.removePoint()
            let a = this.aDragHandles.pop()
            a.destroy()
        }
        while (this.aVertices.length < num) {
            if (this.addCounter > this.aVertices.length - 1) {
                this.addCounter -= this.aVertices.length
            }
            let n1 = this.addCounter
            let n2 = this.addCounter + 1
            if (n2 >= this.aVertices.length) {
                n2 = 0
            }

            let x = (this.aVertices[n1].x + this.aVertices[n2].x) / 2
            let y = (this.aVertices[n1].y + this.aVertices[n2].y) / 2

            let v = new Pos2d(x, y)
            this.aVertices.splice(n2, 0, v)

            this.addCounter += 2

            this.icon.addPoint()
            //create a drag handle
            let c = new svgCircle("", this.displayContainer.cntSVG.id)
            c.addClass("dragHandle")
            c.setRadius(4)
            c.type = "dragHandle"
            c.containingObject = this
            c.addAction("dragHandle")
            this.aDragHandles.push(c)
        }

        for (let i = 0; i < this.aVertices.length; i++) {
            this.aDragHandles[i].index = i
        }
    }
    updateVertices() {
        for (let i = 0; i < this.aVertices.length; i++) {
            this.aVertices[i].updateDisplay()
            this.icon.update(
                i,
                this.aVertices[i].display.x,
                this.aVertices[i].display.y
            )
            this.aDragHandles[i].locate(this.aVertices[i].display)
            this.aDragHandles[i].index = i
        }
    }
    moveItem(dX, dY) {
        if (director.bEditingFlightPlan) return
        //console.log(details);
        this.aVertices.forEach((item) => {
            item.display.x += dX
            item.display.y += dY
            item.updatePosFromDisplay()
        })
        //appData.itemSelected = this;
        dispatchMessage(MSGREDRAW, true)
    }
    dragHandle(index, dX, dY) {
        let u = new Vector(
            Pos2d.getWorldDistance(dX),
            Pos2d.getWorldDistance(-dY)
        )
        this.aVertices[index].x += u.x
        this.aVertices[index].y += u.y
        dispatchMessage(MSGREDRAW, true)
    }
    draw(itemSelected) {
        super.draw(itemSelected)
        this.updateVertices()
        let cv = this.displayContainer.canvas
        let ctx = cv.ctx
        cv.weight = this.strokeWeight
        cv.strokeStyle(this.strokeColor)
        cv.fillStyle(this.fillColor)
        cv.setDashPattern(this.dashPattern[0], this.dashPattern[1])
        ctx.beginPath()
        ctx.moveTo(this.aVertices[0].display.x, this.aVertices[0].display.y)
        for (let i = 1; i < this.aVertices.length; i++) {
            ctx.lineTo(this.aVertices[i].display.x, this.aVertices[i].display.y)
        }
        ctx.lineTo(this.aVertices[0].display.x, this.aVertices[0].display.y)
        ctx.stroke()
        ctx.fill()
        cv.clearDashPattern()
    }
}
class TextShape extends MapItem {
    constructor(dispX, dispY, settings, displayContainer, displayList) {
        super(displayContainer, displayList, "text")
        this.fontSize = settings.labelFontSize
        this.fontColor = settings.labelFontColor

        this.text = "ABC"
        //create vertices at the four corners
        this.pos = Pos2d.newFromDisplay(dispX, dispY)
        this.aVertices = []
        for (let i = 0; i < 4; i++) {
            this.aVertices.push(new Pos2d(0, 0))
            this.icon.addPoint()
        }
        this.heading = 90
        //create Drag handle
        let c = new svgCircle("", this.displayContainer.cntSVG.id)
        c.addClass("dragHandle")
        c.setRadius(4)
        c.type = "dragHandle"
        c.index = 0
        c.containingObject = this
        c.addAction("dragHandle")
        this.aDragHandles.push(c)
    }
    updateVertices() {
        this.height = Pos2d.getWorldDistance(this.fontSize)
        //this.width = Pos2d.getWorldDistance(this.text.length * this.fontSize)
        this.width = Pos2d.getWorldDistance(this.getTextWidth() * 1.5)
        this.pos.updateDisplay()
        this.aVertices[0].update(-this.height / 2, this.width / 3)
        this.aVertices[1].update(this.height / 2, this.width / 3)
        this.aVertices[2].update(this.height / 2, -this.width / 3)
        this.aVertices[3].update(-this.height / 2, -this.width / 3)
        this.aVertices.forEach((item) => {
            item.rotate2d(-this.heading, true)
            item.increment(this.pos)
            item.updateDisplay()
        })
        for (let i = 0; i < 4; i++) {
            this.icon.update(
                i,
                this.aVertices[i].display.x,
                this.aVertices[i].display.y
            )
        }
        this.aDragHandles[0].locate(
            this.aVertices[3].display.x,
            this.aVertices[3].display.y
        )
    }
    dragHandle(index, dX, dY) {
        if (dX == 0 && dY == 0) return
        let u = new Vector(dX, dY)

        let v1 = new Vector(
            this.pos.display.x - this.aVertices[2].display.x,
            this.pos.display.y - this.aVertices[2].display.y
        )
        let v2 = v1.plus(u)
        this.heading += v2.heading - v1.heading
        dispatchMessage(MSGREDRAW, true)
    }
    moveItem(dX, dY) {
        if (director.bEditingFlightPlan) return
        this.pos.display.x += dX
        this.pos.display.y += dY
        this.pos.updatePosFromDisplay()
        dispatchMessage(MSGREDRAW, true)
    }
    draw(itemSelected) {
        super.draw(itemSelected)
        this.updateVertices()

        let cv = this.displayContainer.canvas
        cv.fillStyle(this.fontColor)
        cv.translate(this.aVertices[2].display.x, this.aVertices[2].display.y)
        cv.rotateDegrees(this.heading - 90)
        cv.drawText(this.text, this.fontSize, 0, 0)
        cv.restore()
        //cv.circle(this.pos.display, 4, true)
    }
    getTextWidth() {
        let cv = this.displayContainer.canvas

        return cv.getTextSize(this.text, this.fontSize, false).width
    }
}
//*-----------------------Aircraft Related
class ACType {
    constructor(dataline) {
        //console.log(dataline)
        //split the data into lines
        let aLines = dataline.split("\n")
        //first line is blank - delete
        aLines.shift()
        //break up the first line and load into appropriate sections
        let aLineData = aLines.shift().split(",")
        this.ACType = aLineData.shift()
        this.Weight = aLineData.shift()
        this.PrefAlt = Number(aLineData.shift())
        this.MaxAlt = Number(aLineData.shift())
        this.MachSpeed = Number(aLineData.shift())
        this.TurnRate = Number(aLineData.shift())
        this.FTAS = Number(aLineData.shift())
        this.MaxDescent = Number(aLineData.shift())

        this.aCruiseSpeed = []
        this.aClimbSpeed = []
        this.aDescentSpeed = []
        this.aClimbRate = []
        this.aDescentRate = []

        while (aLines.length > 1) {
            aLineData = aLines.shift().split(",")
            //dump the first element which just gives the altitude
            aLineData.shift()
            this.aCruiseSpeed.push(Number(aLineData.shift()))
            this.aClimbSpeed.push(Number(aLineData.shift()))
            this.aClimbRate.push(Number(aLineData.shift()))
            this.aDescentSpeed.push(Number(aLineData.shift()))
            this.aDescentRate.push(Number(aLineData.shift()))
        }
    }
    getCruiseSpeed(Altitude) {
        Altitude = Math.round(Altitude / 100)

        if (Altitude < 30) {
            return fScale(
                0,
                30,
                Altitude,
                this.aCruiseSpeed[0],
                this.aCruiseSpeed[1]
            )
        } else if (Altitude < 60) {
            return fScale(
                30,
                60,
                Altitude,
                this.aCruiseSpeed[1],
                this.aCruiseSpeed[2]
            )
        } else if (Altitude < 100) {
            return fScale(
                60,
                100,
                Altitude,
                this.aCruiseSpeed[2],
                this.aCruiseSpeed[3]
            )
        } else if (Altitude < 200) {
            return fScale(
                100,
                200,
                Altitude,
                this.aCruiseSpeed[3],
                this.aCruiseSpeed[4]
            )
        } else if (Altitude < 300) {
            return fScale(
                200,
                300,
                Altitude,
                this.aCruiseSpeed[4],
                this.aCruiseSpeed[5]
            )
        } else if (Altitude < 400) {
            return fScale(
                300,
                400,
                Altitude,
                this.aCruiseSpeed[5],
                this.aCruiseSpeed[6]
            )
        } else {
            return this.aCruiseSpeed[6]
        }
    }
    getClimbSpeed(Altitude) {
        Altitude = Math.round(Altitude / 100)
        if (Altitude < 30) {
            return fScale(
                0,
                30,
                Altitude,
                this.aClimbSpeed[0],
                this.aClimbSpeed[1]
            )
        } else if (Altitude < 60) {
            return fScale(
                30,
                60,
                Altitude,
                this.aClimbSpeed[1],
                this.aClimbSpeed[2]
            )
        } else if (Altitude < 100) {
            return fScale(
                60,
                100,
                Altitude,
                this.aClimbSpeed[2],
                this.aClimbSpeed[3]
            )
        } else if (Altitude < 200) {
            return fScale(
                100,
                200,
                Altitude,
                this.aClimbSpeed[3],
                this.aClimbSpeed[4]
            )
        } else if (Altitude < 300) {
            return fScale(
                200,
                300,
                Altitude,
                this.aClimbSpeed[4],
                this.aClimbSpeed[5]
            )
        } else if (Altitude < 400) {
            return fScale(
                300,
                400,
                Altitude,
                this.aClimbSpeed[5],
                this.aClimbSpeed[6]
            )
        } else {
            return this.aClimbSpeed[6]
        }
    }
    getClimbRate(Altitude) {
        Altitude = Math.round(Altitude / 100)
        if (Altitude < 30) {
            return fScale(
                0,
                30,
                Altitude,
                this.aClimbRate[0],
                this.aClimbRate[1]
            )
        } else if (Altitude < 60) {
            return fScale(
                30,
                60,
                Altitude,
                this.aClimbRate[1],
                this.aClimbRate[2]
            )
        } else if (Altitude < 100) {
            return fScale(
                60,
                100,
                Altitude,
                this.aClimbRate[2],
                this.aClimbRate[3]
            )
        } else if (Altitude < 200) {
            return fScale(
                100,
                200,
                Altitude,
                this.aClimbRate[3],
                this.aClimbRate[4]
            )
        } else if (Altitude < 300) {
            return fScale(
                200,
                300,
                Altitude,
                this.aClimbRate[4],
                this.aClimbRate[5]
            )
        } else if (Altitude < 400) {
            return fScale(
                300,
                400,
                Altitude,
                this.aClimbRate[5],
                this.aClimbRate[6]
            )
        } else {
            return this.aClimbRate[6]
        }
    }
    getDescentSpeed(Altitude) {
        Altitude = Math.round(Altitude / 100)
        if (Altitude < 30) {
            return fScale(
                0,
                30,
                Altitude,
                this.aDescentSpeed[0],
                this.aDescentSpeed[1]
            )
        } else if (Altitude < 60) {
            return fScale(
                30,
                60,
                Altitude,
                this.aDescentSpeed[1],
                this.aDescentSpeed[2]
            )
        } else if (Altitude < 100) {
            return fScale(
                60,
                100,
                Altitude,
                this.aDescentSpeed[2],
                this.aDescentSpeed[3]
            )
        } else if (Altitude < 200) {
            return fScale(
                100,
                200,
                Altitude,
                this.aDescentSpeed[3],
                this.aDescentSpeed[4]
            )
        } else if (Altitude < 300) {
            return fScale(
                200,
                300,
                Altitude,
                this.aDescentSpeed[4],
                this.aDescentSpeed[5]
            )
        } else if (Altitude < 400) {
            return fScale(
                300,
                400,
                Altitude,
                this.aDescentSpeed[5],
                this.aDescentSpeed[6]
            )
        } else {
            return this.aDescentSpeed[6]
        }
    }
    getDescentRate(Altitude) {
        Altitude = Math.round(Altitude / 100)
        if (Altitude < 30) {
            return fScale(
                0,
                30,
                Altitude,
                this.aDescentRate[0],
                this.aDescentRate[1]
            )
        } else if (Altitude < 60) {
            return fScale(
                30,
                60,
                Altitude,
                this.aDescentRate[1],
                this.aDescentRate[2]
            )
        } else if (Altitude < 100) {
            return fScale(
                60,
                100,
                Altitude,
                this.aDescentRate[2],
                this.aDescentRate[3]
            )
        } else if (Altitude < 200) {
            return fScale(
                100,
                200,
                Altitude,
                this.aDescentRate[3],
                this.aDescentRate[4]
            )
        } else if (Altitude < 300) {
            return fScale(
                200,
                300,
                Altitude,
                this.aDescentRate[4],
                this.aDescentRate[5]
            )
        } else if (Altitude < 400) {
            return fScale(
                300,
                400,
                Altitude,
                this.aDescentRate[5],
                this.aDescentRate[6]
            )
        } else {
            return this.aDescentRate[6]
        }
    }
}
class Aircraft {
    static acNumber = 0
    static acVertices = [
        new Point(0, 0.8507),
        new Point(-0.441, 1),
        new Point(-0.441, 0.8507),
        new Point(-0.147, 0.629),
        new Point(-0.147, 0.088),
        new Point(-1, 0.443),
        new Point(-1, 0.221),
        new Point(-0.147, -0.289),
        new Point(-0.147, -0.795),
        new Point(-0.134, -0.861),
        new Point(-0.104, -0.933),
        new Point(-0.072, -0.96),
        new Point(0, -1),
        new Point(0.072, -0.96),
        new Point(0.104, -0.933),
        new Point(0.134, -0.861),
        new Point(0.147, -0.795),
        new Point(0.147, -0.289),
        new Point(1, 0.221),
        new Point(1, 0.443),
        new Point(0.147, 0.088),
        new Point(0.147, 0.629),
        new Point(0.441, 0.8507),
        new Point(0.441, 1),
        new Point(0, 0.8507),
    ]
    static acDartVertices = [
        new Point(0, -1),
        new Point(-0.422, 0.9),
        new Point(0.422, 0.9),
    ]
    constructor(
        imageIndex,
        dispX,
        dispY,
        settings,
        displayContainer,
        displayList,
        typeList
    ) {
        this.type = "aircraft"
        let p = Pos2d.posFromDisplay(dispX, dispY)
        this.pos = new Pos2d(p.x, p.y)
        this.typeList = typeList
        this.settings = settings

        //display items
        this.displayContainer = displayContainer
        this.layer = 25

        //display icon container and icon
        this.containerID = displayContainer.cntSVG.id
        this.icon = new svgCircle("", this.containerID)
        this.iconBaseClass = "svgDisplayObject"
        this.icon.addClass(this.iconBaseClass)

        //add a drag handle to rotate the item
        this.dragHandle = new svgCircle("", this.displayContainer.cntSVG.id)
        this.dragHandle.addClass("dragHandle")
        this.dragHandle.setRadius(4)
        this.dragHandle.type = "rotateHandle"
        this.dragHandle.containingObject = this
        this.dragHandle.addAction("dragHandle")

        //set tag properties and tag icon
        this.tagIcon = new svgRectangle("", this.containerID)
        this.tagIconBaseClass = "svg-datatag"
        this.tagIcon.type = "datatag"
        this.tagIcon.containingObject = this
        this.tagIcon.addClass(this.tagIconBaseClass)
        this.bShowTag = false
        this.tagRelativePosition = new Point(40, -40)
        //booleans to figure out where to draw line relative to datablock
        this.tagDrawBottom = true
        this.tagDrawLeft = true

        // SIZES & Colors
        this.targetSizeMult = 1
        this.tagSizeMult = 1
        this.strokeColor = settings.acStrokeColor
        this.fillColor = settings.acFillColor
        this.strokeWeight = settings.acStrokeWeight

        //Target Tools Flags
        this.bShowPTL = false
        this.bShowRoute = false
        this.bShowHalo = false
        this.bShowScan = false

        //Assign a designator
        Aircraft.acNumber++
        let tNum = String(Aircraft.acNumber)
        if (tNum.length == 1) tNum = "00" + tNum
        else if (tNum.length == 2) tNum = "0" + tNum
        this.ident = tNum

        //heading
        this.currentHeading = 30
        this.bHasFlightPlan = false
        this.bAssignedHeading = false
        this.assignedHeading = null

        //altitudes
        this.alt = {}

        //speeds
        this.groundSpeed = 0

        //get basics of aircraft type zero
        this.changeACType(0)

        //setup the drawing parameters
        this.changeImageType(imageIndex) //0 to 3
        displayList.push(this)
        console.log(this)

        this.calculateStatic()
    }
    destructor() {
        this.icon.destroy()
        this.tagIcon.destroy()
        this.dragHandle.destroy()
    }
    adjustSVGZ() {
        this.icon.changeParent(this.containerID)
        this.tagIcon.changeParent(this.containerID)
        this.dragHandle.changeParent(this.containerID)
    }
    changeImageType(index) {
        this.imageType = index
        this.changeSize()
    }
    changeSize() {
        this.size = this.settings.acBaseRadius * this.targetSizeMult
        if (this.imageType == 2) {
            this.imagePoints = []
            for (let i = 0; i < Aircraft.acDartVertices.length; i++) {
                let p = Aircraft.acDartVertices[i]
                this.imagePoints.push(
                    new Point(p.x * this.size, p.y * this.size)
                )
            }
        } else if (this.imageType == 3) {
            this.imagePoints = []
            for (let i = 0; i < Aircraft.acVertices.length; i++) {
                let p = Aircraft.acVertices[i]
                this.imagePoints.push(
                    new Point(p.x * this.size, p.y * this.size)
                )
            }
        } else {
            this.imagePoints = null
        }
    }
    //*---------------------DRAWING
    draw(itemSelected) {
        this.pos.updateDisplay()
        //set canvas and styles
        let cv = this.displayContainer.canvas

        //draw PTL at the bottom
        if (this.bShowPTL || this.settings.bShowPTL) {
            this.drawPTL(cv)
        }

        //draw HALO at the bottom
        if (this.bShowHalo || this.settings.bShowHalo) {
            this.drawHalo(cv)
        }

        //TODO DRAW Route if needed

        cv.strokeStyle(this.strokeColor)
        cv.weight = this.strokeWeight
        cv.fillStyle(this.fillColor)

        if (this.imageType == 0) this.drawType0(cv, this.size)
        else if (this.imageType == 1) this.drawType1(cv, this.size)
        else this.drawShape(cv)

        //add the icon
        this.icon.setRadius(this.size)
        this.icon.locate(this.pos.display)

        if (this.bShowTag || this.settings.bShowTags) {
            this.drawDataTag(cv)
        }

        if (this == itemSelected) {
            this.bSelected = true
            this.icon.changeClass("highlight")
            if (director.appMode == EDITMODE) {
                if (director.bEditingFlightPlan || this.bHasFlightPlan) {
                    this.dragHandle.hide()
                } else {
                    this.drawDragHandle()
                }
            } else if (director.appMode == ANIMATEMODE) {
                //action to takeif animatemode
            }
        } else {
            this.bSelected = false
            this.icon.changeClass(this.iconBaseClass)
            this.dragHandle.hide()
        }
    }
    drawDragHandle() {
        //console.log("draw drag handle")
        let dir = Pos2d.get2DVectorFromBearing(this.currentHeading).scale(
            this.size
        )
        this.dragHandle.locate(
            this.pos.display.x + dir.x,
            this.pos.display.y + dir.y
        )
        this.dragHandle.show()
    }
    dragTag(dX, dY) {
        //console.log("drag tag")
        this.tagRelativePosition.x += dX
        this.tagRelativePosition.y += dY

        this.tagDrawLeft = false
        if (this.tagRelativePosition.x > 0) {
            this.tagDrawLeft = true
        }

        this.tagDrawBottom = false
        if (this.tagRelativePosition.y < 0) {
            this.tagDrawBottom = true
        }
    }
    drawDataTag(cv) {
        let fontSize = this.settings.acBaseTagSize * this.tagSizeMult
        cv.fillStyle(this.settings.acTagFontColor)
        //draw first line
        let line1 = this.ident + " " + this.ACType
        cv.drawText(
            line1,
            fontSize,
            this.pos.display.x + this.tagRelativePosition.x,
            this.pos.display.y + this.tagRelativePosition.y - fontSize,
            false
        )
        //second
        let line2 =
            Math.round(this.alt.curAlt / 100) +
            " " +
            Math.round(this.groundSpeed / 10)
        cv.drawText(
            line2,
            fontSize,
            this.pos.display.x + +this.tagRelativePosition.x,
            this.pos.display.y + this.tagRelativePosition.y,
            false
        )

        //determine line widths
        let w1 = cv.getTextSize(line1, fontSize, false).width
        let w2 = cv.getTextSize(line2, fontSize, false).width

        let w = w1
        if (w2 > w1) w = w2

        this.tagIcon.setSize(w, fontSize * 2)
        this.tagIcon.locate(
            this.pos.display.x + this.tagRelativePosition.x + w / 2,
            this.pos.display.y + this.tagRelativePosition.y - fontSize
        )

        //draw a leader line
        cv.strokeStyle(this.settings.acTagFontColor + "60")
        cv.weight = 1

        //dour possibilities of where to draw line
        if (this.tagDrawLeft && this.tagDrawBottom) {
            cv.drawLine(
                this.pos.display.x,
                this.pos.display.y,
                this.pos.display.x + this.tagRelativePosition.x,
                this.pos.display.y + this.tagRelativePosition.y
            )
        } else if (this.tagDrawLeft && !this.tagDrawBottom) {
            cv.drawLine(
                this.pos.display.x,
                this.pos.display.y,
                this.pos.display.x + this.tagRelativePosition.x,
                this.pos.display.y + this.tagRelativePosition.y - fontSize
            )
        } else if (!this.tagDrawLeft && !this.tagDrawBottom) {
            cv.drawLine(
                this.pos.display.x,
                this.pos.display.y,
                this.pos.display.x + this.tagRelativePosition.x + w,
                this.pos.display.y + this.tagRelativePosition.y - fontSize
            )
        } else if (!this.tagDrawLeft && this.tagDrawBottom) {
            cv.drawLine(
                this.pos.display.x,
                this.pos.display.y,
                this.pos.display.x + this.tagRelativePosition.x + w,
                this.pos.display.y + this.tagRelativePosition.y
            )
        }
    }
    drawType0(cv, sz) {
        // console.log("draw type 0")
        cv.circle(this.pos.display, sz, true)
        cv.drawLine(
            this.pos.display.x,
            this.pos.display.y - sz,
            this.pos.display.x - 0.866 * sz,
            this.pos.display.y + 0.5 * sz
        )
        cv.drawLine(
            this.pos.display.x,
            this.pos.display.y - sz,
            this.pos.display.x + 0.866 * sz,
            this.pos.display.y + 0.5 * sz
        )
        cv.drawLine(
            this.pos.display.x - 0.866 * sz,
            this.pos.display.y + 0.5 * sz,
            this.pos.display.x + 0.866 * sz,
            this.pos.display.y + 0.5 * sz
        )
    }
    drawType1(cv, sz) {
        // console.log("draw type 1")
        cv.circle(this.pos.display, sz, true)
    }
    drawShape(cv) {
        // console.log("draw type shape")
        cv.translate(this.pos.display.x, this.pos.display.y)
        cv.rotateDegrees(this.currentHeading)
        cv.drawClosedPoly(this.imagePoints, true)
        cv.restore()
    }
    drawPTL(cv) {
        //show PTL
        let predPos = this.pos.plus(
            this.actualVector.multiply(this.settings.ptlLength * 60)
        )
        let d = Pos2d.displayFromPos(predPos.x, predPos.y)
        cv.weight = 2
        cv.strokeStyle(this.settings.ptlColor)
        cv.drawLine(this.pos.display.x, this.pos.display.y, d.x, d.y)
    }
    drawHalo(cv) {
        let d = Pos2d.getDisplayDistance(this.settings.haloSize)
        cv.weight = 1
        cv.strokeStyle(this.settings.haloColor)
        cv.circle(this.pos.display, d, false)
    }
    drawRoute(cv) {}

    //*-----------process Changes
    changeAltitude(alt) {
        this.alt.curAlt = alt
        this.calculateStatic()
        dispatchMessage(MSGREDRAW, true)
    }
    rotate(dX, dY) {
        if (dX == 0 && dY == 0) return
        let u = new Vector(dX, dY)
        let v1 = Pos2d.get2DVectorFromBearing(this.currentHeading).scale(
            this.size
        )
        let v2 = v1.plus(u)
        this.currentHeading -= v2.heading - v1.heading
        if (this.currentHeading > 360) this.currentHeading -= 360
        if (this.currentHeading < 0) this.currentHeading += 360

        this.calculateStatic()
        dispatchMessage(MSGREDRAW, true)
    }
    moveItem(dX, dY) {
        if (director.bEditingFlightPlan) {
            //flight plan editor is open.
            if (this.bSelected) {
                console.log("action to move selected aircraft")
            }
            return
        }
        if (!this.bHasFlightPlan) {
            //console.log(details);
            this.pos.display.x += dX
            this.pos.display.y += dY
            this.pos.updatePosFromDisplay()
            this.calculateStatic()
            dispatchMessage(MSGREDRAW, true)
        }
    }
    changeLayer(l) {
        this.layer = l
        this.icon.setZ(l)
    }
    changeACType(index) {
        this.typeIndex = index
        let t = this.typeList[index]
        this.ACType = t.ACType
        this.FTAS = t.FTAS
        this.alt.maxAlt = t.MaxAlt * 100
        this.alt.prefAlt = t.PrefAlt * 100
        this.alt.curAlt = t.PrefAlt * 100
        this.turnRate = t.TurnRate
        this.weight = t.Weight

        this.calculateStatic()
        dispatchMessage(MSGREDRAW, true)
    }
    //*-----------------------STATIC Calculations
    //Build items based on being in EDIT mode.  No climbing or descending....
    updateStatic(dT) {
        if (!this.bHasFlightPlan) {
            let v = this.actualVector.multiply(dT)
            this.pos.x += v.x
            this.pos.y += v.y
            this.pos.updateDisplay()
        }
    }
    calculateStatic() {
        //based on current position, TAS, altitude
        if (this.bHasFlightPlan) {
            //handle case where a/c on a defined route
        } else {
            //aircraft is not on defined route
            this.currentUnitVector = Pos2d.vectorFromHeading(
                this.currentHeading
            )
            let spd = this.typeList[this.typeIndex].getCruiseSpeed(
                this.alt.curAlt
            )
            this.currentVector = this.currentUnitVector.multiply(spd / 3600)

            //now calcualte the wind vector
            let wind = director.windModel.getWindAt(this.alt.curAlt)
            let dir = wind.dir + 180
            if (dir > 360) dir -= 360
            let wVector = Pos2d.vectorFromHeading(dir).multiply(wind.spd / 3600)
            this.actualVector = this.currentVector.plus(wVector)
            //this.effectiveHeading =
            this.groundSpeed = this.actualVector.length * 3600
            this.calculateZeroPosition()
        }
    }
    calculateZeroPosition() {
        //calculate where aircraft would be at time zero
        this.posZero = this.pos.copy()

        if (!this.bHasFlightPlan) {
            let v = this.actualVector.multiply(
                -director.masterTimer.currentTime
            )
            this.posZero.x += v.x
            this.posZero.y += v.y
        }
    }
    resetToZero() {
        this.pos = this.posZero.copy()
        this.pos.updateDisplay()
    }
    setNewZero() {
        this.posZero = this.pos.copy()
    }
    //*-----------------------RUNNING Calculations
}
//*-----------------------Other Items
class WindModel {
    constructor() {
        this.layers = []
        //create a layer
    }
    addLayer(altitude, direction, speed) {
        this.layers.push(
            new WindLayer(Number(altitude), Number(direction), Number(speed))
        )
        this.sortLayers()
    }
    removeLayer(alt) {
        let found = -1
        for (let i = 0; i < this.layers.length; i++) {
            if ((this.layers[i].alt = alt)) {
                found = i
            }
        }
        if (found > -1) this.layers.splice(found, 1)
        this.sortLayers()
    }
    sortLayers() {
        this.layers.sort((a, b) => a.alt - b.alt)
    }
    getWindAt(alt) {
        if (this.layers.length == 0) {
            return {
                dir: 0,
                spd: 0,
            }
        }
        alt /= 100
        let loWindAlt = 0
        let loWindSpd = this.layers[0].spd
        let loWindDir = this.layers[0].dir
        for (let i = 0; i < this.layers.length; i++) {
            if (alt < this.layers[i].alt) {
                let d = fScale(
                    loWindAlt,
                    this.layers[i].alt,
                    alt,
                    loWindDir,
                    this.layers[i].dir
                )
                let s = fScale(
                    loWindAlt,
                    this.layers[i].alt,
                    alt,
                    loWindSpd,
                    this.layers[i].spd
                )
                return { dir: d, spd: s }
            }
            loWindAlt = this.layers[i].alt
            loWindDir = this.layers[i].dir
            loWindSpd = this.layers[i].spd
        }
        let w = this.layers[this.layers.length - 1]
        return {
            dir: w.dir,
            spd: w.spd,
        }
    }
}
class WindLayer {
    constructor(altitude, direction, speed) {
        this.alt = altitude //in 100's of feet (FL)
        this.dir = direction
        this.spd = speed
    }
}
