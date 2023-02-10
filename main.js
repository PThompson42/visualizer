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
} from "ptui"
import {
    parseColorString,
    Hex2Dec,
    Pos2d,
    Point,
    Vector,
    HEX,
    ROUND,
} from "ptmath"
import { KeyHandler } from "ptutil"
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
var main
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
const director = new AppDirector(setup)

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
        if (info.action.type == "fix") {
            //console.log("fix dropped at: " + dispX + "," + dispY);
            let d = {
                index: info.action.index,
                locX: dispX,
                locY: dispY,
            }
            dispatchMessage(MSGADD, "fix", d)
        } else {
            let d = {
                index: 0,
                locX: dispX,
                locY: dispY,
            }
            dispatchMessage(MSGADD, info.action.type, d)
        }

        // else if (info.action.type == "runway") {
        //     let d = {
        //         index: 0,
        //         locX: dispX,
        //         locY: dispY,
        //     }
        //     dispatchMessage(MSGADD, "runway", d)
        // } else if (info.action.type == "approach") {
        //     let d = {
        //         index: 0,
        //         locX: dispX,
        //         locY: dispY,
        //     }
        //     dispatchMessage(MSGADD, "approach", d)
        // } else if (info.action.type == "airway") {
        //     let d = {
        //         index: 0,
        //         locX: dispX,
        //         locY: dispY,
        //     }
        //     dispatchMessage(MSGADD, "airway", d)
        // } else if (info.action.type == "sua") {
        //     let d = {
        //         index: 0,
        //         locX: dispX,
        //         locY: dispY,
        //     }
        //     dispatchMessage(MSGADD, "sua", d)
        // }
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
            delta.target.containingObject.dragHandle(
                delta.target.index,
                delta.x,
                delta.y
            )
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
            details.clicktarget.action == "dragHandle"
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
    }
    addControlButtons(id) {
        //add mini buttons down left for groups of items
        this.btnInterface = new BasicButton("", "Interface", id)
            .fixLocation(5, 40)
            .addClass("min-button")
            .addAction("btnInterface")
            .listenForClicks(this.clickHandler.bind(this))
        this.btnDisplaySettings = new BasicButton("", "Display", id)
            .fixLocation(5, 65)
            .addClass("min-button")
            .addAction("btnDisplaySettings")
            .listenForClicks(this.clickHandler.bind(this))
        this.btnDefaultSettings = new BasicButton("", "Object Defaults", id)
            .fixLocation(5, 90)
            .setWidth(95)
            .addClass("min-button")
            .addAction("btnDefaultSettings")
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
            5,
            100,
            5,
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
        this.addNavaidsSection()
        this.addRunwaySection()
        this.addApproachSection()
        this.addAirwaySection()
        this.addSUASection()
        this.addShapeSection()
    }
    addNavaidsSection() {
        //CONFIGURE NAVAIDS SECTION
        let x = 0
        let y = 5
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
    }
    addRunwaySection() {
        let x = 5
        let y = 195
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
    }
    addApproachSection() {
        let x = 5
        let y = 345
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
    }
    addAirwaySection() {
        let x = 5
        let y = 500
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
    }
    addSUASection() {
        let x = 5
        let y = 660
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
    }
    addShapeSection() {
        let x = 5
        let y = 815
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
    }
    clickHandler(details) {
        if (details.action == "wnSettings:close") {
            this.hide()
        } else if (details.action == "btnInterface") {
            this.btnInterface.addClass("min-selected")
            this.btnDisplaySettings.removeClass("min-selected")
            this.btnDefaultSettings.removeClass("min-selected")
            this.fixSize(300, 140)
            this.cntInterfaceSettings.show()
            this.cntDisplaySettings.hide()
            this.cntDefaultSettings.hide()
        } else if (details.action == "btnDisplaySettings") {
            this.btnInterface.removeClass("min-selected")
            this.btnDisplaySettings.addClass("min-selected")
            this.btnDefaultSettings.removeClass("min-selected")
            this.fixSize(300, 250)
            this.cntInterfaceSettings.hide()
            this.cntDisplaySettings.show()
            this.cntDefaultSettings.hide()
        } else if (details.action == "btnDefaultSettings") {
            this.btnInterface.removeClass("min-selected")
            this.btnDisplaySettings.removeClass("min-selected")
            this.btnDefaultSettings.addClass("min-selected")
            this.fixSize(300, 375)
            this.cntInterfaceSettings.hide()
            this.cntDisplaySettings.hide()
            this.cntDefaultSettings.show()
        }
    }
    changeHandler(details) {
        if (details.action == "langDropdown") {
            changeLanguage(Number(details.sender.getSelection().index))
        } else {
            dispatchMessage(MSGSETTINGS, details.action, details.value)
        }
    }
    colorHandler(details) {
        dispatchMessage(MSGSETTINGS, details.action, details.value)
    }
    sliderHandler(details) {
        //console.log(details)
        //console.log(details);
        dispatchMessage(MSGSETTINGS, details.action, Number(details.value))
    }
}
class QuickSettingsWindow extends Div {
    constructor(id, parentid = null) {
        super(id, parentid)
        this.showOverflow().fixSize(120, 28)
        this.addButtons(id)
    }
    addButtons(id) {
        let btnSize = 24
        let x = 0
        let x1 = 0
        let y = 0
        let y1 = 35
        //SETTINGS- LABEL and BUTTON
        this.lblSettings = new Label("", "Settings", id)
            .fixLocation(x, y1)
            .hide()
            .addClass("info-caption")
            .wrap(false)
        new BasicButton("btnSettings", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, y)
            .addClass("imagebutton2")
            .bgImage("images/ui/settings.svg")
            .addAction("btnSettings")
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )
        //DARK LIGHT mode
        x += 28
        this.lblDarkMode = new Label("", "Dark/Light Mode", id)
            .fixLocation(x, y1)
            .hide()
            .addClass("info-caption")
            .wrap(false)
        new BasicButton("btnDarkmode", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, y)
            .addClass("imagebutton")
            .bgImage("images/ui/darkmode.svg")
            .bgImageFit()
            .addAction("darkMode")
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //DARK LIGHT mode
        x += 28
        this.lblGridToggle = new Label("", "Toggle Grid", id)
            .fixLocation(x, y1)
            .hide()
            .addClass("info-caption")
            .wrap(false)
        new BasicButton("btnToggleGrid", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, y)
            .addClass("imagebutton")
            .bgImage("images/ui/grid.png")
            .bgImageFit()
            .addAction("gridToggle")
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //Show/Hide Labels
        x += 28
        this.lblLabelToggle = new Label("", "Toggle Labels", id)
            .fixLocation(x, y1)
            .hide()
            .addClass("info-caption")
            .wrap(false)
        new BasicButton("btnToggleLabel", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, y)
            .addClass("imagebutton")
            .bgImage("images/ui/label.svg")
            .bgImageFit()
            .addAction("labelToggle")
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //EDIT
        x += 28
        this.lblEdit = new Label("", "Edit Mode", id)
            .fixLocation(x, y1)
            .hide()
            .addClass("info-caption")
            .wrap(false)
        new BasicButton("btnEdit", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, y)
            .addClass("imagebutton2")
            .bgImage("images/ui/edit.svg")
            .addAction("btnEdit")
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )

        //ANIMATE
        x += 28
        this.lblAnimate = new Label("", "Animation Mode", id)
            .fixLocation(x, y1)
            .hide()
            .addClass("info-caption")
            .wrap(false)
        new BasicButton("btnAnimation", "", id)
            .fixSize(btnSize, btnSize)
            .fixLocation(x, y)
            .addClass("imagebutton2")
            .bgImage("images/ui/animate.svg")
            .addAction("btnAnimate")
            .listenForClicks(this.btnHandler.bind(this))
            .listenForEnterLeave(
                this.enterHandler.bind(this),
                this.leaveHandler.bind(this)
            )
    }
    btnHandler(details) {
        if (details.action == "btnSettings") {
            this.lblSettings.hide()
            dispatchMessage(MSGUI, "dispSettingsWindow")
        } else if (details.action == "darkMode") {
            dispatchMessage(MSGUI, "toggleDarkMode")
        } else if (details.action == "gridToggle") {
            dispatchMessage(MSGUI, "gridToggle")
        } else if (details.action == "labelToggle") {
            dispatchMessage(MSGUI, "labelToggle")
        } else if (details.action == "btnEdit") {
            dispatchMessage(MSGUI, "changeAppMode", EDITMODE)
        } else if (details.action == "btnAnimate") {
            dispatchMessage(MSGUI, "changeAppMode", ANIMATEMODE)
        }
    }
    enterHandler(details) {
        if (details.action == "btnSettings") {
            this.lblSettings.show()
        } else if (details.action == "darkMode") {
            this.lblDarkMode.show()
        } else if (details.action == "gridToggle") {
            this.lblGridToggle.show()
        } else if (details.action == "labelToggle") {
            this.lblLabelToggle.show()
        } else if (details.action == "btnAdd") {
            this.lblAdd.show()
        } else if (details.action == "btnEdit") {
            this.lblEdit.show()
        } else if (details.action == "btnAnimate") {
            this.lblAnimate.show()
        }
    }
    leaveHandler(details) {
        if (details.action == "btnSettings") {
            this.lblSettings.hide()
        } else if (details.action == "gridToggle") {
            this.lblGridToggle.hide()
        } else if (details.action == "btnEdit") {
            this.lblEdit.hide()
        } else if (details.action == "btnAnimate") {
            this.lblAnimate.hide()
        } else if (details.action == "darkMode") {
            this.lblDarkMode.hide()
        } else if (details.action == "labelToggle") {
            this.lblLabelToggle.hide()
        }
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
class ItemEditor extends Div {
    constructor(id, parentid = null) {
        super(id, parentid)
        this.masterWidth = 160
        this.fixSize(this.masterWidth, 500).addClass("stack-pane")

        new Label("", "Editor", this.id)
            .addClass("obj-label2")
            .fontSize(16)
            .fixLocation(0, 2)
        this.closedHeight = 20
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
        this.activate(null)
    }
    onResize(w, h) {
        this.fixLocation(w - 160, 0)
        this.windowHeight = h
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
                h = this.aSubpanels[index].activate(item)
            }
        }
        this.fixSize(this.masterWidth, h)
    }
    activateRunway() {
        this.lblType.updateCaption("Runway")
        //console.log(this.source)
        this.rwyShapeEditor.activate(
            this.source,
            true,
            this.source.strokeColor,
            this.source.strokeWeight,
            this.source.fillColor
        )
        this.setHeight(200)
    }
    activateApproach() {
        this.lblType.updateCaption("Approach")
        this.approachShapeEditor.activate(
            this.source,
            false,
            this.source.strokeColor,
            this.source.strokeWeight,
            this.source.fillColor
        )
        this.setHeight(200)
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

//*------------------------Map Item Classes
class MapItem {
    constructor(displayContainer, displayList, type) {
        this.type = type
        this.displayContainer = displayContainer
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
            this.updateVertices()
        }
    }
    moveItem(dX, dY) {
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
            cv.fillStyle(this.settings.labelFontColor)
            cv.drawText(
                this.desig,
                this.settings.labelFontSize,
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
