/*
JRAD2 - Javascript Rapid App Development
A suite of tools and apps to make building apps easier
Based on JRAD original
Version 0.9.1 */

//*--------------------------------      Constants and Functions
//const $ to get items by id's
const XMLNS = "http://www.w3.org/2000/svg"
const $ = (id) =>
    document.getElementById(id) && document.getElementById(id).owner
        ? document.getElementById(id).owner
        : document.getElementById(id)
const body = {
    _id: "body",
    parentID: null,
    bParent: null,
    element: document.body,
}
//*--------------------------------      LANGUAGE ITEMS
function enableMultilingual(langs, trans) {
    AO.enableMultilingual(langs, trans)
}
function loadLanguageFromStorage() {
    AO.loadLanguageFromStorage()
}
function saveLanguageToStorage() {
    AO.saveLanguageToStorage()
}
function changeLanguage(index) {
    AO.changeLanguage(index)
}
function getLanguages() {
    return AO.getLanguages()
}
function getCurrentLanguage() {
    return AO.getCurrentLanguage()
}
//*--------------------------           Application & App Objects Base
class ApplicationDirector {
    constructor() {
        this.multilingual = false
        //this.cat = cat;
        this.EN = 0
        this.FR = 1
        this.LANG = this.EN
    }
    storeItem(key, value) {
        localStorage.setItem(key, value)
    }
    getStoredItem(key) {
        return localStorage.getItem(key)
    }
    clearLocalStorage() {
        localStorage.clear()
    }
    removeStoredItem(key) {
        localStorage.removeItem(key)
    }
    download(filename, text) {
        let element = document.createElement("a")
        element.setAttribute(
            "href",
            "data:text/plain;charset=utf-8," + encodeURIComponent(text)
        )
        element.setAttribute("download", filename)
        element.style.display = "none"
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }
    selectFile(fileCallback, accept = "") {
        this.openFileCallback = fileCallback
        //bText is true if file to be opened and input as text
        var inputElement = document.createElement("input")
        inputElement.type = "file"
        inputElement.accept = accept // Note Edge does not support this attribute
        inputElement.addEventListener(
            "change",
            this.fileDialogChanged.bind(this)
        )
        inputElement.dispatchEvent(new MouseEvent("click"))
    }
    fileDialogChanged(event) {
        let fName = event.target.files[0].name
        let file = event.target.files[0]
        let openF = this.openFileCallback.bind(this)
        //console.log("Added:  " + fName);
        if (!file) {
            return
        }
        var reader = new FileReader()
        reader.onload = function (event) {
            openF(event.target.result)
        }
        reader.readAsText(file)
    }
    async openFile(url, callback = null) {
        const response = await fetch(url)
        const data = await response.text()
        if (callback) callback(data)
        else return data
    }
    async loadImage(url) {
        const response = await fetch(url)
        const blob = await response.blob()
        let img = await createImageBitmap(blob)
        //console.log(img);
        let ur = URL.createObjectURL(blob)
        return { img: img, url: url }
    }
    async openBase64(url) {
        return fetch(url)
            .then((response) => response.blob())
            .then(
                (blob) =>
                    new Promise((callback) => {
                        let reader = new FileReader()
                        reader.onload = function () {
                            callback(this.result)
                        }
                        reader.readAsDataURL(blob)
                    })
            )
    }
}
class AO {
    //*------------------------------Static Props
    static bWindowContainer = false
    static windowContainerID = "main"
    static UID = []
    static POSITIONMODE = "absolute"
    static NORMAL = "normal"
    static CENTER = "center"
    static RECTMODE = AO.NORMAL
    static MULTILINGUAL = false
    static languages = null
    static translations = null
    static curLang = 0
    //*------------------------------Static Methods
    static enableMultilingual(languageList, translations) {
        AO.languages = languageList
        AO.translations = translations
        //pull the first translation (typically English) into separate index array to make searching easier
        AO.translationIndex = []
        for (let i = 0; i < AO.translations.length; i++) {
            AO.translationIndex.push(AO.translations[i][0])
        }
        AO.MULTILINGUAL = true
    }
    static loadLanguageFromStorage() {
        AO.curLang = Number(localStorage.getItem("language"))
        if (AO.curLang == null) {
            AO.curLang = 0
            AO.saveLanguageToStorage()
        }
    }
    static saveLanguageToStorage() {
        localStorage.setItem("language", AO.curLang)
    }
    static changeLanguage(index) {
        AO.curLang = index
        AO.saveLanguageToStorage()
        //change language of UI items
        AO.UID.forEach((id) => {
            let item = $(id)
            if (!item) {
                console.error("item not found in verifying multilingual")
                console.log(id)
            } else {
                if (item.bMultilingual) {
                    //console.log(item);
                    item.updateText(item.captionList[index])
                }
            }
        })
    }
    static getLanguages() {
        return AO.languages
    }
    static getCurrentLanguage() {
        return AO.curLang
    }
    static isIDUnique(test) {
        if (AO.UID.indexOf(test) > 0) return false
        return true
    }
    static getUniqueID() {
        let items = [
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I",
            "J",
            "K",
            "L",
            "M",
            "N",
            "O",
            "P",
            "Q",
            "R",
            "S",
            "T",
            "U",
            "V",
            "W",
            "X",
            "Y",
            "Z",
            "0",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
        ]
        let testID = AO.getRandomID(items)
        while (!AO.isIDUnique(testID)) testID = AO.getRandomID(items)
        return testID
    }
    static getRandomID(items) {
        let retVal = "u"
        for (let i = 0; i < 4; i++) {
            retVal += items.sort(() => 0.5 - Math.random())[0]
        }
        return retVal
    }
    //*------------------------------Constructor
    constructor(props) {
        //console.log(props);
        if (arguments.length == 0) {
            props = {
                id: null,
                type: "div",
                parentID: null,
            }
        }
        //console.log(props);
        //ensure id is unique
        if (!props.id) this._id = AO.getUniqueID()
        else {
            let isUnique = AO.isIDUnique(props.id)
            if (isUnique) {
                this._id = props.id
            } else {
                alert("object id is not unique - generating a unique id")
                this._id = AO.getUniqueID()
            }
        }
        AO.UID.push(this._id)
        this.parentID = props.parentID
        //create the html or svg element
        if (!props.type) props.type = "div"
        this.type = props.type
        if (props.bSVG) {
            this.element = document.createElementNS(XMLNS, props.type)
            //console.log(this.element);
        } else {
            this.element = document.createElement(props.type)
        }
        //assign the parent
        this.assignParent(props.parentID)
        //assign element properties
        this.element.id = this.id
        this.element.owner = this
        //Fill out properties
        this._visible = true
        this.applyPositioning(AO.POSITIONMODE)
        this._x = 0
        this._y = 0
        this._z = 1
        this._w = 0
        this._h = 0
        this.bMultilingual = false
        this.captionList = null
        this.bFixedWidth = false
        this.bFixedHeight = false
        this._action = null
        this.element.style["box-sizing"] = "border-box"
        this.hideOverflow()
    }
    destroy() {
        this.removeElement()
        //remove the id from the UID array
        let index = AO.UID.indexOf(this._id)
        AO.UID.splice(index, 1)
    }
    //*---------------------------  Parent & Child
    removeElement() {
        if (this.bParent) this.parent.element.removeChild(this.element)
        else document.body.removeChild(this.element)
    }
    getChildren() {
        return this.element.children
    }
    assignParent(pID) {
        if (!pID) {
            //console.log("assignParent: " + pID);
            //if no parent ID was given:
            if (AO.bWindowContainer) {
                this.attachToParent(AO.windowContainerID)
            } else {
                this.attachToBody()
            }
            return
        }
        let pr = $(pID)
        if (!pr) {
            if (AO.bWindowContainer) {
                alert("parent id does not exist.  attaching to main")
                this.attachToParent(AO.windowContainerID)
            } else {
                alert("parent id does not exist.  attaching to body")
                this.attachToBody()
            }
            return
        }
        //we have a parent
        this.attachToParent(pID)
    }
    attachToBody() {
        this.bParent = false
        this.parent = body
        document.body.appendChild(this.element)
        this.parent[this._id] = this
        this.parentID = this.parent._id
    }
    attachToParent(pID) {
        //console.log(pID);
        let pr = $(pID)
        this.bParent = true
        this.parent = pr
        this.parent.element.appendChild(this.element)
        this.parent[this._id] = this
        this.parentID = this.parent._id
    }
    changeParent(newParentID) {
        this.removeElement()
        this.assignParent(newParentID)
    }
    //*---------------------------  ID
    assignID(id) {
        this._id = id
        return this
    }
    get id() {
        return this._id
    }
    //*---------------------------  Value
    set value(val) {
        this.element.value = val
        return this
    }
    get value() {
        return this.element.value
    }
    //*---------------------------  Class & Style
    addClass(className) {
        this.element.classList.add(className)
        this.className = className //used if only one and want to swap
        return this
    }
    removeClass(className) {
        this.element.classList.remove(className)
        return this
    }
    changeClass(newName) {
        if (this.className) {
            this.removeClass(this.className)
        }
        this.addClass(newName)
        return this
    }
    applyStyle(styleAction, value) {
        this.element.style[styleAction] = value
        return this
    }
    //*---------------------------  Dragging
    get draggable() {
        return this.element.draggable
    }
    set draggable(val) {
        this.element.draggable = val
        return this
    }
    setDraggable(val) {
        this.draggable = val
        return this
    }
    //*---------------------------  Position and Vis
    applyPositioning(p) {
        this.applyStyle("position", p)
    }
    set z(val) {
        this._z = val
        this.applyStyle("zIndex", val)
        return this
    }
    setZ(val) {
        this._z = val
        this.applyStyle("zIndex", val)
        return this
    }
    get z() {
        return this._z
    }
    setX(val) {
        this._x = val
        this.applyStyle("left", val + "px")
        return this
    }
    get x() {
        return this._x
    }
    setY(val) {
        this._y = val
        this.applyStyle("top", val + "px")
        return this
    }
    get y() {
        return this._y
    }
    fixLocation(x, y) {
        this.setX(x)
        this.setY(y)
        return this
    }
    relativeLocation(x, y) {
        this.applyStyle("left", x + "%")
        this.applyStyle("top", y + "%")
        return this
    }
    hide() {
        this.visible = false
        return this
    }
    show() {
        this.visible = true
        return this
    }
    set visible(b) {
        if (b) {
            this._visible = true
            this.applyStyle("display", "block")
        } else {
            this._visible = false
            this.applyStyle("display", "none")
        }
    }
    get visible() {
        return this._visible
    }
    setOpacity(val) {
        this.applyStyle("opacity", val)
    }
    //*---------------------------  Size
    setWidth(val) {
        this._w = val
        this.applyStyle("width", val + "px")
        this.bFixedWidth = true
        return this
    }
    get w() {
        return this._w
    }
    set w(val) {
        this._w = val
    }
    setHeight(val) {
        this._h = val
        this.applyStyle("height", val + "px")
        this.bFixedHeight = true
        return this
    }
    set h(val) {
        this._h = val
    }
    get h() {
        return this._h
    }
    fixSize(w, h) {
        this.setWidth(w)
        this.setHeight(h)
        return this
    }
    relativeWidth(val) {
        this.applyStyle("width", val + "%")
        this.bFixedWidth = false
        return this
    }
    relativeHeight(val) {
        this.applyStyle("height", val + "%")
        this.bFixedWidth = false
        return this
    }
    relativeSize(w, h) {
        this.relativeWidth(w)
        this.relativeHeight(h)
        return this
    }
    getWidth() {
        if (this.bFixedWidth) return this.w
        else return this.element.offsetWidth
    }
    getHeight() {
        if (this.bFixedHeight) return this.h
        else return this.element.offsetHeight
    }
    //*---------------------------  Alignment
    centerH() {
        let x = (this.parent.getWidth() - this.getWidth()) / 2
        this.setX(x)
        return this
    }
    centerV() {
        let y = (this.parent.getHeight() - this.getHeight()) / 2
        this.setY(y)
        return this
    }
    center() {
        this.centerH()
        this.centerV()
        return this
    }
    //*---------------------------  Action, new Properties
    addAction(val) {
        this._action = val
        return this
    }
    get action() {
        return this._action
    }
    addProperty(prop, val) {
        this[prop] = val
        return this
    }
    //*---------------------------  Overflow
    hideOverflow() {
        this.applyStyle("overflow", "hidden")
        return this
    }
    autoOverflow() {
        this.applyStyle("overflow", "auto")
        return this
    }
    autoOverflowY() {
        this.applyStyle("overflow-y", "auto")
        return this
    }
    scrollOverflowX() {
        this.applyStyle("overflow-x", "scroll")
        return this
    }
    scrollOverflowY() {
        this.applyStyle("overflow-y", "scroll")
        return this
    }
    showOverflow() {
        this.applyStyle("overflow", "visible")
        return this
    }
    //*---------------------------  Text
    updateCaption(text) {
        //determine if text is in translation list
        if (AO.MULTILINGUAL) {
            //test if the text exists in the translation array
            let index = AO.translationIndex.indexOf(text)
            if (index > -1) {
                this.bMultilingual = true
                this.captionList = AO.translations[index]
                this.updateText(this.captionList[AO.curLang])
            } else {
                this.bMultilingual = false
                this.captionList = null
                this.updateText(text)
            }
        } else {
            this.updateText(text)
        }
        return this
    }
    updateText(text) {
        if (this.type == "input") this.value = text
        else this.element.innerHTML = text
        return this
    }
    clearText() {
        this.updateText("")
        this.bMultilingual = false
        this.captionList = null
        return this
    }
    clearCaption() {
        this.clearText()
        return this
    }
    get text() {
        if (this.type == "input") return this.value
        else return this.element.innerHTML
    }
    get caption() {
        if (this.type == "input") return this.value
        else return this.element.innerHTML
    }
    fontSize(sz) {
        this.applyStyle("fontSize", String(sz) + "px")
        return this
    }
    fontColor(color) {
        this.applyStyle("color", processColor(color))
        return this
    }
    bold() {
        this.applyStyle("fontWeight", "bold")
        return this
    }
    fontNormal() {
        this.applyStyle("fontWeight", "normal")
        return this
    }
    italics() {
        this.applyStyle("fontStyle", "italic")
        return this
    }
    alignRight() {
        this.applyStyle("textAlign", "right")
        return this
    }
    alignLeft() {
        this.applyStyle("textAlign", "left")
        return this
    }
    alignCenter() {
        this.applyStyle("textAlign", "center")
        return this
    }
    wrap(shouldWrap) {
        if (shouldWrap) {
            this.applyStyle("white-space", "normal")
        } else {
            this.applyStyle("white-space", "nowrap")
        }
        return this
    }
    //*---------------------------  background color and images
    bgColor() {
        //console.log(...arguments);
        this.applyStyle("backgroundColor", processColor(...arguments))
        return this
    }
    bgImage(url) {
        this.applyStyle("backgroundImage", "url(" + url + ")")
        return this
    }
    bgImageFit() {
        this.applyStyle("background-size", "scale-down")
        return this
    }
    bgImageClear() {
        this.applyStyle("backgroundImage", "none")
        return this
    }
    bgImageCover() {
        this.applyStyle("background-size", "cover")
        return this
    }
    bgImageNoRepeat() {
        this.applyStyle("background-repeat", "no-repeat")
        return this
    }
    bgImageContain() {
        this.applyStyle("background-size", "contain")
        return this
    }
    bgImageCenter() {
        this.applyStyle("background-position", "center")
        return this
    }
    //*---------------------------   BORDERS
    borderStandard(sz) {
        this.applyStyle("borderStyle", "solid")
        this.borderWidth(sz)
        this.borderColor("#000000")
        return this
    }
    borderNone() {
        this.applyStyle("borderStyle", "none")
        return this
    }
    borderColor() {
        this.applyStyle("borderColor", processColor(...arguments))
        return this
    }
    borderWidth(sz) {
        this.applyStyle("borderWidth", String(sz) + "px")
        return this
    }
    borderRadius(sz) {
        this.applyStyle("borderRadius", String(sz) + "px")
        return this
    }
    borderRadius4(tl, tr, br, bl) {
        this.applyStyle(
            "border-radius",
            tl + "px " + tr + "px " + br + "px " + bl + "px"
        )
        return this
    }
    borderStyle(style) {
        this.applyStyle("borderStyle", style)
        return this
    }
    border(top, right, bottom, left) {
        this.applyStyle("borderStyle", "solid")
        this.applyStyle(
            "border-width",
            top + "px " + right + "px " + bottom + "px " + left + "px"
        )
        return this
    }
    //*---------------------------   Mouse & CURSOR/POINTER
    setPointer(val) {
        this.element.style.cursor = val
    }
    ignoreMouse() {
        this.applyStyle("pointer-events", "none")
        return this
    }
    listenMouse() {
        this.applyStyle("pointer-events", "auto")
        return this
    }
    //*---------------------------   Event Listening
    listenForClicks(callback) {
        this.element.addEventListener(
            "click",
            this.clickCallback.bind(this),
            false
        )
        this.element.addEventListener(
            "contextmenu",
            this.clickCallback.bind(this),
            true
        )
        this.clickHandler = callback
        return this
    }
    clickCallback(e) {
        let owner = null
        if (e.target.owner) {
            owner = e.target.owner
        }
        //console.log("click");
        e.stopPropagation()
        e.preventDefault()
        // console.log(e);
        // console.log(this.clickHandler);
        this.clickHandler({
            sender: this,
            sender_id: this.id,
            clicktarget: owner,
            action: this.action,
            client: { x: e.clientX, y: e.clientY },
            offset: { x: e.offsetX, y: e.offsetY },
            button: e.button,
        })
    }
    listenForWheel(callback) {
        this.element.addEventListener("wheel", this.wheelHandler.bind(this))
        this.wheelCallback = callback
        return this
    }
    wheelHandler(e) {
        //console.log(e);
        e.stopPropagation()
        e.preventDefault()
        this.wheelCallback(e.deltaY)
    }
    listenForMouseDown(callback) {
        this.element.addEventListener(
            "mousedown",
            this.mouseDownCallback.bind(this),
            false
        )
        this.mouseDownHandler = callback
        return this
    }
    mouseDownCallback(e) {
        e.stopPropagation()
        e.preventDefault()
        //console.log(e);
        this.mouseDownHandler({
            sender: this,
            sender_id: this.id,
            action: this.action,
            client: { x: e.clientX, y: e.clientY },
            offset: { x: e.offsetX, y: e.offsetY },
            button: e.button,
        })
    }
    listenForMove(callback) {
        this.element.addEventListener(
            "mousemove",
            this.moveCallback.bind(this),
            false
        )
        this.moveHandler = callback
        return this
    }
    moveCallback(e) {
        this.moveHandler({
            sender: this,
            sender_id: this.id,
            action: this.action,
            client: { x: e.clientX, y: e.clientY },
            offset: { x: e.offsetX, y: e.offsetY },
            button: e.button,
        })
    }
    listenForChanges(callback) {
        this.element.addEventListener(
            "change",
            this.changeCallback.bind(this),
            false
        )
        this.changeHandler = callback
        return this
    }
    listenForInput(callback) {
        this.element.addEventListener(
            "input",
            this.changeCallback.bind(this),
            false
        )
        this.changeHandler = callback
        return this
    }
    changeCallback(e) {
        this.changeHandler({
            sender: this,
            sender_id: this.id,
            value: this.value,
            action: this.action,
        })
    }
    listenForInput(callback) {
        this.element.addEventListener(
            "input",
            this.inputCallback.bind(this),
            false
        )
        this.inputHandler = callback
        return this
    }
    inputCallback(e) {
        this.inputHandler({
            sender: this,
            sender_id: this.id,
            value: this.value,
            action: this.action,
        })
    }
    listenForEnterLeave(enterCall, leaveCall) {
        this.element.addEventListener(
            "mouseenter",
            this.enterCallback.bind(this),
            false
        )
        this.element.addEventListener(
            "mouseleave",
            this.leaveCallback.bind(this),
            false
        )
        this.leaveHandler = leaveCall
        this.enterHandler = enterCall
        return this
    }
    enterCallback(e) {
        this.enterHandler({
            sender: this,
            sender_id: this.id,
            value: this.value,
            action: this.action,
        })
    }
    leaveCallback(e) {
        this.leaveHandler({
            sender: this,
            sender_id: this.id,
            value: this.value,
            action: this.action,
        })
    }
    //dragging - for non draggable things to track
    listenForDragging(callback) {
        this.rMseDown = this.rMouseDown.bind(this)
        this.rMseUp = this.rMouseUp.bind(this)
        this.rMseMove = this.rMouseMove.bind(this)
        this.element.addEventListener("mousedown", this.rMseDown)
        this.dragCallback = callback
        return this
    }
    rMouseDown(e) {
        this.dragTarget = e.target.owner
        this.element.addEventListener("mouseup", this.rMseUp)
        //this.element.addEventListener("mouseout", this.rMseUp);
        document.addEventListener("mousemove", this.rMseMove)
        this.lastClickPos = new Point(e.clientX, e.clientY)
    }
    rMouseUp(e) {
        this.element.removeEventListener("mouseup", this.rMseUp)
        //this.element.removeEventListener("mouseout", this.rMseUp);
        document.removeEventListener("mousemove", this.rMseMove)
    }
    rMouseMove(e) {
        this.dragCallback({
            target: this.dragTarget,
            x: e.clientX - this.lastClickPos.x,
            y: e.clientY - this.lastClickPos.y,
            event: e,
        })
        this.lastClickPos.update(e.clientX, e.clientY)
    }
    //DRAGGING AND DROPPING
    enableDragTracking(startCallback, endCallback) {
        this.element.addEventListener(
            "dragstart",
            this.handleDragStart.bind(this)
        )
        this.element.addEventListener("dragend", this.handleDragEnd.bind(this))
        this.dragStartCallback = startCallback
        this.dragEndCallback = endCallback
        return this
    }
    enableDropTracking(dropCallback, dragOverClass = "over") {
        this.element.addEventListener(
            "dragover",
            this.handleDragOver.bind(this)
        )
        this.element.addEventListener(
            "dragenter",
            this.handleDragEnter.bind(this)
        )
        this.element.addEventListener(
            "dragleave",
            this.handleDragLeave.bind(this)
        )
        this.element.addEventListener("drop", this.handleDrop.bind(this))
        this.dropCallback = dropCallback

        this.dragOverClass = dragOverClass

        return this
    }
    handleDragStart(e) {
        let details = {
            note: "dragstart",
            draggedItemID: this.id,
            draggedItemSize: { w: this.w, h: this.h },
            draggedItemOffset: { x: e.offsetX, y: e.offsetY },
            action: this.action,
        }
        e.dataTransfer.setData("text/plain", JSON.stringify(details))
        this.dragStartCallback(details)
    }
    handleDragEnd(e) {
        let details = {
            note: "dragend",
            draggedItemID: this.id,
        }
        this.dragEndCallback(details)
    }
    handleDrop(e) {
        let draggedItemDetails = JSON.parse(
            e.dataTransfer.getData("text/plain")
        )
        let details = {
            note: "drop",
            e: e,
            offset: { x: e.offsetX, y: e.offsetY },
            draggedItemDetails: draggedItemDetails,
            src: this.id,
            action: this.action,
        }
        this.dropCallback(details)
        this.element.classList.remove(this.dragOverClass)
        return this
    }
    handleDragOver(e) {
        //console.log("handleDragOver");
        e.preventDefault()
        return false
    }
    handleDragEnter(e) {
        //console.log("handleDragEnter");
        this.element.classList.add(this.dragOverClass)
    }
    handleDragLeave(e) {
        //console.log("handleDragLeave");
        this.element.classList.remove(this.dragOverClass)
    }
    //*---------------------------   Other
    setRequired() {
        this.element.setAttribute("required", "")
        this.element.required = true
    }
}
//*-----------------------------------------------  UI and Containers
class UIContainer extends AO {
    constructor() {
        let props = {
            id: AO.windowContainerID,
            type: "div",
            bSVG: false,
        }
        super(props)
        AO.bWindowContainer = true
        this.hideOverflow()
        this.fixLocation(0, 0)
        this.relativeSize(100, 100)
        this.w = window.innerWidth
        this.h = window.innerHeight
        this.resizeHandler = null
        this.anim = {
            bEnabled: false,
            fps: 60,
            bLimitFramerate: false,
            oldTime: 0,
            nowTime: 0,
            timeGap: 0,
            bRunning: false,
            id: null,
            animFunction: this.animRender.bind(this),
        }

        //listen for size/orientation changes
        window.addEventListener("resize", this.onResizeEvent.bind(this), true)
        window.addEventListener(
            "orientationchange",
            this.onResizeEvent.bind(this),
            true
        )
    }
    onResizeEvent(e) {
        this.w = this.getWidth()
        this.h = this.getHeight()

        if (this.resizeHandler) {
            this.resizeHandler(this.w, this.h)
        } else {
            console.log(
                "Resize Event:  no resize handler.  Subclass UIContainer or setResizeHandler(callback)"
            )
        }
    }
    setResizeHandler(callback) {
        this.resizeHandler = callback
        return this
    }
    goFullScreen() {
        var elem = document.documentElement
        if (elem.requestFullscreen) {
            elem.requestFullscreen()
        } else if (elem.webkitRequestFullscreen) {
            /* Safari */
            elem.webkitRequestFullscreen()
        } else if (elem.msRequestFullscreen) {
            /* IE11 */
            elem.msRequestFullscreen()
        }
    }
    enableAnimation(callback) {
        this.anim.bEnabled = true
        this.anim.callback = callback
    }
    setFrameRate(fps) {
        this.anim.fps = fps
        this.bLimitFramerate = true
    }
    animStart() {
        if (this.anim.bRunning) return
        this.anim.bRunning = true
        this.anim.nowTime = new Date().getTime()
        this.anim.id = requestAnimationFrame(this.anim.animFunction)
    }
    animStop() {
        this.anim.bRunning = false
        cancelAnimationFrame(this.anim.id)
        this.anim.id = null
    }
    animRender() {
        if (!this.anim.bRunning) {
            cancelAnimationFrame(this.anim.id)
            this.anim.id = null
            return
        }
        this.anim.id = requestAnimationFrame(this.anim.animFunction)

        this.anim.nowTime = new Date().getTime()
        this.anim.timeGap = this.anim.nowTime - this.anim.oldTime //milliseconds
        //console.log(this.anim.timeGap);
        if (this.bLimitFramerate && this.anim.timeGap < 1000 / this.anim.fps)
            return
        this.anim.callback(this.anim.timeGap)
        this.anim.oldTime = this.anim.nowTime
    }
    frameRate() {
        return Math.floor(1000 / this.anim.timeGap)
    }
}
class Div extends AO {
    constructor(id, parentID = null) {
        //console.log(id, parentID);
        super({ id: id, parentID: parentID })
    }
}
class Container extends AO {
    constructor(id, parentID = null) {
        //console.log(id, parentID);
        super({ id: id, parentID: parentID })
    }
    addLabel(id, caption) {
        let l = new Label(id, caption, this.id)
        return l
    }
    addBasicButton(id, caption) {
        let b = new BasicButton(id, caption, this.id)
        return b
    }
    addSlider(id, min, max, step, value) {
        let s = new Slider(id, min, max, step, value, this.id)
        return s
    }
    addCheckbox(id) {
        let c = new Checkbox(id, this.id)
        return c
    }
    addStackManager(id, masterWidth) {
        new StackManager(id, masterWidth, this.id)
    }
}
class Form extends AO {
    constructor(id, parentID = null) {
        super({ id: id, parentID: parentID, type: "form" })
    }
}
class DraggableWindow extends Div {
    constructor(id, btnImgUrl = null, parentID = null) {
        super(id, parentID)
        //add the titlebar
        this.titlebarHeight = 22
        this.closeCallback = null
        this.titlebar = new Label("", "Settings", this.id)
            .fixLocation(0, 0)
            .relativeWidth(100)
            .setHeight(this.titlebarHeight)
            .listenForDragging(this.handleDrag.bind(this))

        this.btnClose = new BasicButton("", "", this.id)
            .fixSize(this.titlebarHeight - 4, this.titlebarHeight - 4)
            .fixLocation(this.w - this.titlebarHeight, 0)
            .bgImage(btnImgUrl)
            .listenForClicks(this.closeHandler.bind(this))
    }
    assignClasses(winClass, titlebarClass, closeButtonClass) {
        this.addClass(winClass)
        this.titlebar.addClass(titlebarClass)
        this.btnClose.addClass(closeButtonClass)
        return this
    }
    handleDrag(details) {
        this.fixLocation(this.x + details.x, this.y + details.y)
    }
    fixSize(w, h) {
        super.fixSize(w, h)
        this.btnClose.fixLocation(w - this.titlebarHeight, 0)
        return this
    }
    getCloseNotifications(callback) {
        this.closeCallback = callback
        return this
    }
    adjustTitlebarHeight(ht) {
        this.titlebar.setHeight(ht)
        return this
    }
    closeHandler() {
        //console.log("close");
        if (this.closeCallback) {
            let details = {
                sender: this,
                id: this.id,
                action: this.action + ":close",
                note: "draggableWindowCloseEvent",
            }
            this.closeCallback(details)
        }
    }
}
//*--------------------  BUTTONS
class BasicButton extends AO {
    constructor(id, caption, parentID = null) {
        super({ id: id, parentID: parentID, type: "button" })
        this.updateCaption(caption)
    }
}
class HoldButton extends AO {
    constructor(id, actionName, delta, callback, caption, parentID) {
        super({ id: id, parentID: parentID, type: "button" })
        this.callback = callback
        this.delta = delta
        this.actionName = actionName
        this.updateCaption(caption)
        this.bPressed = false
        this.element.addEventListener(
            "mousedown",
            this.buttonDown.bind(this),
            false
        )
        this.fButtonEnd = this.buttonEnd.bind(this)
        this.fTimerTick = this.timerTick.bind(this)
        this._timerInterval = 125
    }
    buttonDown(e) {
        this.bPressed = true
        this.element.addEventListener("mouseup", this.fButtonEnd, false)
        this.element.addEventListener("mouseleave", this.fButtonEnd, false)
        this.timer = setInterval(this.fTimerTick, this._timerInterval)
        this.actionCallback()
    }
    buttonEnd(e) {
        this.bPressed = false
        window.clearInterval(this.timer)
        this.timer = null
        this.element.removeEventListener("mouseup", this.fButtonEnd, false)
        this.element.removeEventListener("mouseleave", this.fButtonEnd, false)
    }
    timerTick(e) {
        this.actionCallback()
    }
    assignDataName(dName) {
        this.dataName = dName
        return this
    }
    changeDelta(delta) {
        this.delta = delta
    }
    changeInterval(inc) {
        this._timerInterval = inc
    }
    actionCallback() {
        this.callback({
            sender: this,
            actionType: this.actionName,
            value: this.delta,
        })
    }
}
class ToggleButton extends AO {
    constructor(id, className, captionOff, actionName, parentID) {
        super({ id: id, parentID: parentID, type: "button" })
        this.updateCaption(captionOff)
        this.classNameOff = className
        this.classNameOn = className + "-on"
        this.captionOff = captionOff
        this.captionOn = null
        this.bOn = false
        this.addClass(this.classNameOff)
        this.listenForClicks(this.toggle.bind(this))
        this.notificationCallback = null
        this.addAction(actionName)
        return this
    }
    getState() {
        return this.bOn
    }
    addCaptionOn(text) {
        this.captionOn = text
        return this
    }
    listenForToggle(callback) {
        this.notificationCallback = callback
        return this
    }
    toggleOn() {
        this.bOn = true
        this.changeClass(this.classNameOn)
        if (this.captionOn) this.updateCaption(this.captionOn)
        return this
    }
    toggleOff() {
        this.bOn = false
        this.changeClass(this.classNameOff)
        if (this.captionOn) this.updateCaption(this.captionOff)
        return this
    }
    toggle() {
        if (this.bOn) this.toggleOff()
        else this.toggleOn()
        if (this.notificationCallback != null) {
            this.notificationCallback({
                sender: this,
                action: this.action,
                state: this.bOn,
            })
        }
    }
}
class SpinButton extends AO {
    constructor(
        id,
        loval,
        hival,
        increment,
        startval,
        actionName,
        changeCallback,
        parentID = null
    ) {
        super({ id: id, parentID: parentID })
        //console.log(this.id);
        this.label = new Label(
            "lbl_" + this.id,
            startval,
            this.id
        ).alignCenter()
        this.loval = loval
        this.hival = hival
        this.increment = increment
        this.value = startval
        this.changeCallback = changeCallback
        this.addAction(actionName)
        this.btnUp = new HoldButton(
            "btnUp" + this.id,
            "up",
            increment,
            this.chgHandler.bind(this),
            "+",
            this.id
        )
        this.btnDown = new HoldButton(
            "btnDn" + this.id,
            "down",
            -increment,
            this.chgHandler.bind(this),
            "-",
            this.id
        )
        this.fixSize(90, 22)
        return this
    }
    fixSize(w, h) {
        super.fixSize(w, h)
        this.btnDown.fixSize(h, h).fixLocation(0, 0).fontSize(this.btnFontSize)
        this.btnUp
            .fixSize(h, h)
            .fixLocation(w - h, 0)
            .fontSize(this.btnFontSize)
        this.label
            .fixLocation(h, 0)
            .fixSize(w - 2 * h, h)
            .fontSize(this.lblFontSize)
        return this
    }
    chgHandler(details) {
        if (details.actionType == "down") this.value -= this.increment
        else if (details.actionType == "up") this.value += this.increment
        if (this.value < this.loval) this.value = this.loval
        if (this.value > this.hival) this.value = this.hival
        this.label.updateCaption(this.value)
        this.changeCallback({
            sender: this,
            senderID: this.id,
            action: this.action,
            value: this.value,
        })
    }
    setLabelClass(cls) {
        this.label.addClass(cls)
        return this
    }
    setButtonClass(cls) {
        this.btnUp.addClass(cls)
        this.btnDown.addClass(cls)
        return this
    }
    setLabelY(y) {
        this.label.setY(y)
        return this
    }
}
//----------------------------------  LABELS
class Label extends AO {
    constructor(id, caption, parentID = null) {
        super({ id: id, parentID: parentID, type: "label" })
        this.updateCaption(caption)
    }
    labelFor(targetID) {
        this.element.htmlFor = targetID
        return this
    }
}
class LabelBil extends Label {
    constructor(id, textE, textF, parentID = null) {
        super(id, "", parentID).setBCaption(textE, textF)
    }
}
//----------------------------------   INPUT types
class TextInput extends AO {
    constructor(id, caption, parentID = null) {
        super({ id: id, parentID: parentID, type: "input" })
        this.element.type = "text"
        this.updateCaption(caption)
    }
}
class NumberInput extends AO {
    constructor(id, parentID = null) {
        super({ id: id, parentID: parentID, type: "input" })
        this.element.type = "number"
    }
    setParms(min, max, step) {
        this.element.min = min
        this.element.max = max
        this.element.step = step
        return this
    }
    setValue(v) {
        this.element.value = v
        return this
    }
}
class PasswordInput extends AO {
    constructor(id, caption, parentID = null) {
        super({ id: id, parentID: parentID, type: "input" })
        this.element.type = "password"
        this.updateCaption(caption)
        return this
    }
}
class DateInput extends AO {
    constructor(id, parentID = null) {
        super({ id: id, parentID: parentID, type: "input" })
        this.element.type = "date"
    }
}
class ColorInput extends AO {
    constructor(id, parentID, color) {
        super({ id: id, parentID: parentID, type: "input" })
        this.element.type = "color"
        this.value = color
    }
}
class Slider extends AO {
    constructor(id, min, max, step, value, parentID = null) {
        super({ id: id, parentID: parentID, type: "input" })
        this.element.type = "range"
        this.setRange(min, max, step)
        this.value = value
        this.applyStyle("cursor", "ew-resize")
    }
    setRange(min, max, step) {
        this.element.min = min
        this.element.max = max
        this.element.step = step
    }
}
class Checkbox extends AO {
    constructor(id, parentID = null) {
        super({ id: id, parentID: parentID, type: "input" })
        this.element.type = "checkbox"
    }
    check() {
        this.element.checked = true
        return this
    }
    uncheck() {
        this.element.checked = false
        return this
    }
    isChecked() {
        return this.element.checked
    }
}
class CustomCheckbox extends Div {
    constructor(id, parentID, clickCallback) {
        super(id, parentID)
        this.bChecked = false
        this.listenForClicks(this.clkHandler.bind(this))
        this.chkColor = "#008000"
        this.clickCallback = clickCallback
        this.inner = new Div("", this.id)
            .relativeSize(80, 80)
            .relativeLocation(10, 10)
            .bgColor(this.chkColor)
            .hide()
    }
    clkHandler(e) {
        if (this.bChecked) this.uncheck()
        else this.check()
        this.clickCallback({
            action: this.action,
            status: this.isChecked(),
        })
    }
    check() {
        this.inner.show()
        this.bChecked = true
    }
    uncheck() {
        this.inner.hide()
        this.bChecked = false
    }
    isChecked() {
        return this.bChecked
    }
    setCheckColor(col) {
        this.chkColor = col
        this.inner.bgColor(col)
    }
}
class CustomToggleSwitch extends Div {
    constructor(id, parentID, clickCallback) {
        super(id, parentID)
        this.bOn = false
        this.listenForClicks(this.clkHandler.bind(this))
        this.clickCallback = clickCallback
        this.innerOff = new Div("", this.id)
            .relativeSize(40, 80)
            .relativeLocation(10, 10)
        this.innerOn = new Div("", this.id)
            .relativeSize(40, 80)
            .relativeLocation(50, 10)
            .hide()
    }
    assignClasses(outer, innerOff, innerOn) {
        this.addClass(outer)
        this.innerOff.addClass(innerOff)
        this.innerOn.addClass(innerOn)
        return this
    }
    clkHandler(e) {
        if (this.bOn) this.toggleOff()
        else this.toggleOn()
        this.clickCallback({
            action: this.action,
            value: this.bOn,
        })
    }
    toggleOn() {
        this.bOn = true
        this.innerOn.show()
        this.innerOff.hide()
    }
    toggleOff() {
        this.bOn = false
        this.innerOn.hide()
        this.innerOff.show()
    }
}
class SelectionBox extends AO {
    constructor(id, parentID, multiple = false) {
        super({ id: id, parentID: parentID, type: "select" })

        if (multiple) {
            this.element.multiple = true
        }
        return this
    }
    addOption(value, text) {
        let nwOption = document.createElement("option")
        nwOption.value = value
        nwOption.innerHTML = text
        nwOption.Owner = this
        this.element.appendChild(nwOption)
        return this
    }
    selectOption(index) {
        this.element.selectedIndex = index
    }
    getSelection() {
        if (this.element.options.length === 0) {
            return { index: -1, value: "" }
        }
        return {
            index: this.element.options[this.element.selectedIndex].value,
            value: this.element.options[this.element.selectedIndex].text,
        }
    }
    clearOptions() {
        while (this.element.options.length) {
            this.element.removeChild(this.element.options[0])
        }
    }
}
//--------------------------    Display and animation items
class Canvas extends AO {
    constructor(id, parentID, willReadFrequently = false) {
        super({ id: id, parentID: parentID, type: "canvas" })
        if (willReadFrequently) {
            this.ctx = this.element.getContext("2d", {
                willReadFrequently: true,
            })
        } else {
            this.ctx = this.element.getContext("2d")
        }

        //console.log("Resize canvas elements with resize(w,h) command only");
        this.lineWeight = 1
        this.font = "Arial"
        this.w = this.element.width
        this.h = this.element.height
    }
    resize(w, h) {
        this.w = w
        this.h = h
        this.element.width = w
        this.element.height = h
        this.weight = this.lineWeight
        return this
    }
    //-------------translation
    translate(x, y) {
        this.ctx.translate(x, y)
    }
    rotateDegrees(amt) {
        this.rotateRadians(DTOR(amt))
    }
    rotateRadians(amt) {
        this.ctx.rotate(amt)
    }
    restore() {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    }
    //*------------------
    fillStyle() {
        this.ctx.fillStyle = processColor(...arguments)
        return this
    }
    strokeStyle() {
        this.ctx.strokeStyle = processColor(...arguments)
        return this
    }
    fill() {
        this.ctx.fill()
    }
    stroke() {
        this.ctx.stroke()
    }
    beginPath() {
        this.ctx.beginPath()
    }
    set weight(wt) {
        this.lineWeight = wt
        this.ctx.lineWidth = wt
        return this
    }
    get weight() {
        return this.ctx.lineWidth
    }
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.getWidth(), this.getHeight())
        return this
    }
    fillCanvas() {
        //console.log(color, this.w, this.h);
        this.fillStyle(processColor(...arguments))
        this.ctx.fillRect(0, 0, this.w, this.h)
        return this
    }
    moveTo(x, y) {
        this.ctx.moveTo(x, y)
    }
    lineTo(x, y) {
        this.ctx.lineTo(x, y)
    }
    drawLine(x1, y1, x2, y2) {
        this.ctx.beginPath()
        this.moveTo(x1, y1)
        this.lineTo(x2, y2)
        this.ctx.stroke()
    }
    drawLinePoints(p1, p2) {
        this.drawLine(p1.x, p1.y, p2.x, p2.y)
    }
    circle(center, radius, bFill = false) {
        this.ctx.beginPath()
        this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI)
        //console.log(center.x, center.y, radius, 0, 2*Math.PI);
        this.ctx.stroke()
        if (bFill) {
            this.ctx.fill()
        }
        this.ctx.closePath()
    }
    circlexy(x, y, radius, bFill = false) {
        this.ctx.beginPath()
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI)
        //console.log(center.x, center.y, radius, 0, 2*Math.PI);
        this.ctx.stroke()
        if (bFill) {
            this.ctx.fill()
        }
        this.ctx.closePath()
    }
    rectangle(x, y, w, h, bFill = false) {
        //console.log("here");
        this.ctx.beginPath()
        if (AO.RECTMODE == AO.CENTER) this.ctx.rect(x - w / 2, y - h / 2, w, h)
        else this.ctx.rect(x, y, w, h)
        this.ctx.stroke()
        if (bFill) {
            this.ctx.fill()
        }
    }
    point(x, y) {
        this.circle({ x: x, y: y }, 1, true)
    }
    triangle(x1, y1, x2, y2, x3, y3, bFill = false) {
        let pts = [new Point(x1, y1), new Point(x2, y2), new Point(x3, y3)]

        this.drawClosedPoly(pts, bFill)
    }
    drawClosedPoly(aPoints, bFill = false) {
        this.ctx.beginPath()
        this.moveTo(aPoints[0].x, aPoints[0].y)
        for (let i = 1; i < aPoints.length; i++) {
            this.lineTo(aPoints[i].x, aPoints[i].y)
        }
        this.ctx.closePath()
        this.ctx.stroke()
        if (bFill) this.ctx.fill()
    }
    drawPath(aPoints) {
        if (!aPoints.length) return
        this.ctx.beginPath()
        this.moveTo(aPoints[0].x, aPoints[0].y)
        for (let i = 1; i < aPoints.length; i++) {
            this.lineTo(aPoints[i].x, aPoints[i].y)
        }
        this.ctx.closePath()
        this.ctx.stroke()
    }
    drawOpenPath(aPoints) {
        if (!aPoints.length) return
        //console.log(aPoints);
        this.ctx.beginPath()
        this.moveTo(aPoints[0].x, aPoints[0].y)
        for (let i = 1; i < aPoints.length; i++) {
            this.lineTo(aPoints[i].x, aPoints[i].y)
            //console.log(aPoints[i].x, aPoints[i].y);
        }
        this.ctx.stroke()
    }
    changefont(font) {
        this.font = font
    }
    drawText(txt, size, x, y, bBold = false) {
        let ad = ""
        if (bBold) {
            ad = "bold "
        }
        this.ctx.font = ad + String(size) + "px " + this.font

        this.ctx.fillText(txt, x, y)
    }
    getImgAddress() {
        return this.element.toDataURL()
    }
    getFullImageData() {
        return this.ctx.getImageData(0, 0, this.w, this.h)
    }
    getImageData(x, y, width, height) {
        return this.ctx.getImageData(x, y, width, height)
    }
    getPixels() {
        let ret = this.getImageData(0, 0, this.w, this.h)
        this.pixels = ret.data
        return this.pixels
    }
    setImageData(pixelArray) {
        this.ctx.putImageData(pixelArray)
    }
    getPixelColorH(x, y) {
        let vals = this.ctx.getImageData(x, y, 1, 1).data
        return "#" + HEX(vals[0]) + HEX(vals[1]) + HEX(vals[2]) + HEX(vals[3])
    }
    setPixelColor(x, y, color) {
        this.fillStyle(color)
        this.ctx.fillRect(x, y, 1, 1)
    }
    beginPath() {
        this.ctx.beginPath()
    }
    endPath() {
        this.ctx.closePath()
    }
    setDashPattern(line, space) {
        this.ctx.setLineDash([line, space])
    }
    clearDashPattern() {
        this.ctx.setLineDash([])
    }
}
class Scene3d extends AO {
    //THREE.JS library must be loaded
    //<script src="lib/three.js"></script>
    constructor(id, parentID) {
        super({ id: id, parentID: parentID, type: "canvas" })
        this.ctx = this.element.getContext("webgl")
        this.w = this.element.width
        this.h = this.element.height
        this.scene = new THREE.Scene()
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.element,
            context: this.ctx,
        })
        this.camera = new THREE.PerspectiveCamera(75, 600 / 400, 0.1, 1000)
    }
    resize(w, h) {
        this.w = w
        this.h = h
        this.element.width = w
        this.element.height = h
        this.renderer.setSize(w, h)
        this.camera.aspect = w / h
        this.camera.updateProjectionMatrix()
        return this
    }
    updateFrame() {
        this.renderer.render(this.scene, this.camera)
    }
    updateCameraPosition(x, y, z) {
        this.camera.position.set(x, y, z)
        // this.camera.position.x = x;
        // this.camera.position.y = y;
        // this.camera.position.z = z;
    }
    updateCameraLook(x, y, z) {
        this.camera.lookAt(x, y, z)
    }
}
class SVGContainer extends AO {
    constructor(id, parentID = null) {
        super({ id: id, parentID: parentID, type: "svg", bSVG: true })
        return this
    }
    clearChildren() {
        while (this.element.lastChild) {
            this.element.removeChild(this.element.lastChild)
        }
    }
}
class SVGObject extends AO {
    constructor(id, parentID, svgType) {
        super({ id: id, parentID: parentID, type: svgType, bSVG: true })
        this.loc = new Point()
        return this
    }
    fillColor(color) {
        this.element.style.fill = color
        return this
    }
    strokeColor(color) {
        this.element.style.stroke = color
        return this
    }
    strokeWidth(w) {
        this.element.style.strokeWidth = w
        return this
    }
}
class svgPath extends SVGObject {
    constructor(id, parentID, data) {
        super(id, parentID, "path")
        //this.element.d = data;
        this.element.setAttribute("d", data)
        return this
    }

    setViewbox(x, y, w, h) {
        console.log(`${x} ${y} ${w} ${h}`)
        this.element.setAttribute("viewBox", `${x} ${y} ${w} ${h}`)
        return this
    }
    locate(p, yC = null) {
        let pt = new Point()
        if (!yC) {
            pt.x = p.x
            pt.y = p.y
        } else {
            pt.x = p
            pt.y = yC
        }
        this.loc = pt
        this.element.style.x = pt.x
        this.element.style.y = pt.y
        return this
    }
}
class svgRectangle extends SVGObject {
    constructor(id, parentID) {
        super(id, parentID, "rect")
        //this.setSize(60, 30);
    }
    setSize(w, h) {
        this.element.style.width = w
        this.element.style.height = h
        this.size = { w: w, h: h }
        return this
    }
    locate(p, yC) {
        let pt = new Point()
        if (!yC) {
            pt.x = p.x
            pt.y = p.y
        } else {
            pt.x = p
            pt.y = yC
        }
        this.loc = pt

        if (AO.RECTMODE == AO.CENTER) {
            this.element.style.x = pt.x - this.size.w / 2
            this.element.style.y = pt.y - this.size.h / 2
        } else {
            this.element.style.x = pt.x
            this.element.style.y = pt.y
        }
        return this
    }
}
class svgPolygon extends SVGObject {
    constructor(id, parentID) {
        super(id, parentID, "polygon")
        this.points = this.element.points
        this.containerID = this.parent.element
    }
    addPoint(num = 1) {
        for (let i = 0; i < num; i++) {
            this.points.appendItem(this.containerID.createSVGPoint())
        }
    }
    update(num, x, y) {
        this.points[num].x = x
        this.points[num].y = y
    }
}
class svgCircle extends SVGObject {
    constructor(id, parentID) {
        super(id, parentID, "circle")
        this.setRadius(30)
        return this
    }
    setRadius(r) {
        this.element.style.r = r
        return this
    }
    locate(p, yC = null) {
        let pt = new Point()
        if (!yC) {
            pt.x = p.x
            pt.y = p.y
        } else {
            pt.x = p
            pt.y = yC
        }
        this.loc = pt
        this.element.style.cx = pt.x
        this.element.style.cy = pt.y
        return this
    }
}
class svgPolyline extends SVGObject {
    constructor(id, parentID) {
        super(id, parentID, "polyline")
        this.points = this.element.points
        this.containerID = this.parent.element
    }
    addPoint(num = 1) {
        for (let i = 0; i < num; i++) {
            this.points.appendItem(this.containerID.createSVGPoint())
        }
    }
    removePoint(num) {
        this.points.removeItem(num)
    }
    update(num, x, y) {
        this.points[num].x = x
        this.points[num].y = y
    }
}
class Image extends AO {
    constructor(id, parentID, src) {
        super({ id: id, parentID: parentID, type: "img" })
        this.src = src
    }
    set src(url) {
        this.element.src = url
    }
}
//----------------------------------   MEDIA
class Video extends AO {
    constructor(id, parentID = null) {
        super({ id: id, parentID: parentID, type: "video" })
        this.borderWidth(0)
        return this
    }
    enableWebcam(callback) {
        this.mediaDevices = navigator.mediaDevices
        this.mediaDevices
            .getUserMedia({
                video: true,
            })
            .then((stream) => {
                // Changing the source of video to current stream.
                //this.video.setSource(stream, '');
                this.element.srcObject = stream
                this.element.addEventListener("loadedmetadata", () => {
                    this.play()
                    if (callback) callback()
                })
            })
            .catch(alert)

        return this
    }
    getElement() {
        return this.element
    }
    setSource(src, type) {
        this.element.src = src
        this.element.type = type
        return this
    }
    play() {
        this.element.play()
        return this
    }
    pause() {
        this.element.pause()
        return this
    }
    resize(w, h) {
        this.element.width = w
        this.element.height = h
        return this
    }
    toggleControls() {
        this.element.controls = !this.element.controls
    }
    unload() {
        this.pause()
        this.element.src = ""
        this.element.type = ""
        this.element.load()
    }
    getDuration() {
        return this.element.duration
    }
    getCurrentTime() {
        return this.element.currentTime
    }
    setCurrentTime(amt) {
        this.element.currentTime = amt
    }
    incrementCurrentTime(amt) {
        this.element.currentTime += amt
    }
    setVolume(amt) {
        this.element.volume = amt
    }
    setPlaybackSpeed(amt) {
        this.element.playbackRate = amt
    }
    setEndingCallback(callback) {
        this.element.addEventListener("ended", callback)
    }
}
//----------------------------------   Windows
class StackManager extends Container {
    constructor(id, masterWidth, parentID = null) {
        super(id, parentID)
        this.panes = []
        this.masterWidth = masterWidth
        this.setWidth(this.masterWidth)
        this.paneClosedHeight = 34
        return this
    }
    addPane(id, text) {
        let pn = new StackablePane(
            "",
            this.id,
            this.masterWidth,
            text,
            this.panes.length - 1,
            this.paneClosedHeight,
            this.adjust.bind(this)
        )
        this.panes.push(pn)
        this.adjust()
        return pn
    }
    adjust() {
        let totalH = 0
        for (let i = 0; i < this.panes.length; i++) {
            this.panes[i].setY(totalH)
            totalH += this.panes[i].h
        }
        this.setHeight(totalH)
    }
}
class StackablePane extends AO {
    constructor(
        id,
        parentID,
        w,
        titleText,
        index,
        closedHeight,
        stateChangeCallback
    ) {
        super({ id: id, parentID: parentID })
        this.state = "closed"
        this.addClass("stack-pane")
        this.index = index
        this.closedHeight = closedHeight
        this.masterWidth = w

        this.fixSize(w, closedHeight)
        this.openHeight = closedHeight
        this.chgButton = new BasicButton("", "", this.id)
            .fixSize(20, 20)
            .fixLocation(w - 22, 0)
            .listenForClicks(this.changeState.bind(this))
        if (titleText.length) {
            this.headerLabel = new Label("", titleText, this.id)
                .fixLocation(5, 0)
                .setWidth(this.masterWidth - 20)
                .labelFor(this.chgButton.id)
        }
        this.stateChangeCallback = stateChangeCallback
        this.hideOverflow()
    }
    changeState() {
        if (this.state == "closed") {
            this.setHeight(this.openHeight)
            this.state = "open"
        } else {
            this.setHeight(this.closedHeight)
            this.state = "closed"
        }
        this.stateChangeCallback()
    }
    changeClosedHeight(ht) {
        this.closedHeight = ht
        if (!this.isOpen()) {
            this.setHeight(ht)
        }
        return this
    }
    isOpen() {
        return this.state == "open"
    }
    hideHeaderLabel() {
        this.headerLabel.hide()
    }
    hideToggleButton() {
        this.chgButton.hide()
    }
}
class HorizontalStackManager extends Container {
    constructor(id, masterHeight, maxWidth, parentID = null) {
        super(id, parentID)
        this.panes = []
        this.masterHeight = masterHeight
        this.setHeight(this.masterHeight)
        this.maxWidth = maxWidth
        this.defaultClosedWidth = 60
        this.scrollOverflowX()
        return this
    }
    resize(maxWidth) {
        this.maxWidth = maxWidth
        this.adjust()
    }
    addPane(id, closedWidth = null) {
        if (closedWidth !== null) this.defaultClosedWidth = closedWidth
        let pn = new HorizStackPane(
            "",
            this.id,
            this.masterHeight,
            this.panes.length - 1,
            this.defaultClosedWidth,
            this.adjust.bind(this)
        )
        this.panes.push(pn)
        this.adjust()
        return pn
    }
    adjust() {
        let totalW = 0
        for (let i = 0; i < this.panes.length; i++) {
            this.panes[i].setX(totalW)
            totalW += this.panes[i].w
        }
        totalW > this.maxWidth
            ? this.setWidth(this.maxWidth)
            : this.setWidth(totalW)
    }
}
class HorizStackPane extends AO {
    constructor(id, parentID, height, index, closedWidth, stateChangeCallback) {
        super({ id: id, parentID: parentID })
        this.state = "closed"
        this.addClass("horiz-stack-pane")
        this.index = index
        this.closedWidth = closedWidth
        this.masterHeight = height
        this.fixSize(this.closedWidth, this.masterHeight)
        this.openWidth = closedWidth
        this.buttonWidth = 14
        this.chgButton = new BasicButton("", "", this.id)
            .fixSize(this.buttonWidth, this.buttonWidth)
            .fixLocation(0, 0)
            .listenForClicks(this.changeState.bind(this))
        this.stateChangeCallback = stateChangeCallback
        this.hideOverflow()
    }
    addButtonStateClasses(openState, closedState) {
        this.clsOpenState = openState
        this.clsClosedState = closedState
        if ((this.state = "closed")) {
            this.chgButton.addClass(this.clsClosedState)
        } else {
            this.chgButton.addClass(this.clsOpenState)
        }
        return this
    }
    changeState() {
        if (this.state == "closed") {
            this.setWidth(this.openWidth)
            this.state = "open"
            //this.chgButton.setX(this.openWidth - (this.buttonWidth + 2))
            this.chgButton.changeClass(this.clsOpenState)
        } else {
            this.setWidth(this.closedWidth)
            this.state = "closed"
            //this.chgButton.setX(this.closedWidth - (this.buttonWidth + 2))
            this.chgButton.changeClass(this.clsClosedState)
        }
        this.stateChangeCallback()
    }
    isOpen() {
        return this.state == "open"
    }
    hideToggleButton() {
        this.chgButton.hide()
    }
}
//*------------------------------------------ COLOR Processor
function processColor() {
    //NOTE - alpha must always be a value between 0 and 1
    if (arguments.length == 0) {
        return "#000000"
    } else if (arguments.length == 1) {
        let t = arguments[0]
        if (typeof t == "string") {
            return t
        } else if (typeof t == "number") {
            let str =
                "rgb(" + String(t) + "," + String(t) + "," + String(t) + ")"
            return str
        }
    } else if (arguments.length == 2) {
        //console.log(arguments);
        //first argument color, second is alpha
        let t = arguments[0]
        let alpha = Math.floor(arguments[1] * 255)
        if (alpha > 255) {
            console.error(
                "Error in process color - alpha must be between 0 and 1"
            )
            return "#000000"
        }
        if (typeof t == "string") {
            if (t.charAt(0) != "#") {
                console.error(
                    "Error in process color - trying to add alpha to text color"
                )
                return "#000000"
            }
            return t + String(HEX(alpha))
        } else if (typeof t == "number") {
            let str =
                "rgba(" +
                String(t) +
                "," +
                String(t) +
                "," +
                String(t) +
                "," +
                String(arguments[1]) +
                ")"
            return str
        }
    } else if (arguments.length == 3) {
        let str =
            "rgb(" +
            String(arguments[0]) +
            "," +
            String(arguments[1]) +
            "," +
            String(arguments[2]) +
            ")"
        return str
    } else if (arguments.length == 4) {
        let str =
            "rgba(" +
            String(arguments[0]) +
            "," +
            String(arguments[1]) +
            "," +
            String(arguments[2]) +
            "," +
            String(arguments[3]) +
            ")"
        return str
    }
}
//*------------------------------------------ VECTOR
class Point {
    constructor(x, y) {
        this.x = x !== undefined ? x : 0
        this.y = y !== undefined ? y : 0
    }
    update(x, y) {
        this.x = x !== undefined ? x : 0
        this.y = y !== undefined ? y : 0
    }
    copy() {
        return new Point(this.x, this.y)
    }
}
class Vector {
    static get2DVectorFromBearing(brg, bDegrees = true) {
        if (bDegrees) brg = DTOR(brg)
        return new Vector(Math.sin(brg), -Math.cos(brg))
    }
    constructor() {
        let n = arguments.length
        if (n == 0) {
            this.rank = 2
            this.vector = [0, 0]
        } else if (n == 1) {
            this.rank = arguments[0]
            this.vector = new Array(this.rank).fill(0)
        } else {
            this.rank = n
            this.vector = []
            for (let i = 0; i < this.rank; i++) {
                this.vector.push(arguments[i])
            }
        }
    }
    get x() {
        return this.vector[0]
    }
    set x(val) {
        this.vector[0] = val
    }
    get y() {
        return this.vector[1]
    }
    set y(val) {
        this.vector[1] = val
    }
    get z() {
        return this.vector[2]
    }
    set z(val) {
        this.vector[2] = val
    }
    get length() {
        let sum = 0
        this.vector.forEach((item) => {
            sum += item * item
        })
        return Math.sqrt(sum)
    }
    get magSquared() {
        let sum = 0
        this.vector.forEach((item) => {
            sum += item * item
        })
        return sum
    }
    get norm() {
        var l = this.length
        return new Vector(
            ...this.vector.map((item) => {
                return item / l
            })
        )
    }
    //------------------
    setMagnitude(val) {
        this.normalize()
        this.scale(val)
        return this
    }
    limit(val) {
        if (this.length > val) {
            this.normalize()
            this.scale(val)
            return this
        }
    }
    update() {
        for (let i = 0; i < arguments.length; i++) {
            this.vector[i] = arguments[i]
        }
    }
    copy() {
        return new Vector(...this.vector)
    }
    plus(v) {
        if (this.rank !== v.rank) alert("cannot add vectors of unequal rank")
        return new Vector(
            ...this.vector.map((item, index) => {
                return item + v.vector[index]
            })
        )
    }
    increment(v) {
        if (this.rank !== v.rank) alert("cannot add vectors of unequal rank")
        for (let i = 0; i < this.rank; i++) {
            this.vector[i] += v.vector[i]
        }
    }
    minus(v) {
        if (this.rank !== v.rank)
            alert("cannot subtract vectors of unequal rank")
        return new Vector(
            ...this.vector.map((item, index) => {
                return item - v.vector[index]
            })
        )
    }
    decrement(v) {
        if (this.rank !== v.rank)
            alert("cannot subtract vectors of unequal rank")
        for (let i = 0; i < this.rank; i++) {
            this.vector[i] -= v.vector[i]
        }
    }
    multiply(scalar) {
        return new Vector(
            ...this.vector.map((item) => {
                return item * scalar
            })
        )
    }
    scale(scalar) {
        for (let i = 0; i < this.rank; i++) {
            this.vector[i] *= scalar
        }
        return this
    }
    invert() {
        for (let i = 0; i < this.rank; i++) {
            this.vector[i] *= -1
        }
    }
    normalize() {
        let l = this.length
        for (let i = 0; i < this.rank; i++) {
            this.vector[i] /= l
        }
        return this
    }
    dot(v) {
        if (this.rank !== v.rank) alert("cannot dot vectors of unequal rank")
        let sum = 0
        for (let i = 0; i < this.rank; i++) {
            sum += this.vector[i] * v.vector[i]
        }
        return sum
    }
    angleFrom(v) {
        const dot = this.dot(v)
        const mod1 = this.dot(this)
        const mod2 = v.dot(v)
        const mod = Math.sqrt(mod1) * Math.sqrt(mod2)
        if (mod === 0) return null
        const theta = dot / mod
        if (theta < -1) return Math.acos(-1)
        if (theta > 1) return Math.acos(1)
        return Math.acos(theta)
    }
    distanceFrom(v) {
        return this.minus(v).length
    }
    //------------- > 2D specific
    rotate2d(theta, degrees = false) {
        if (degrees) theta = DTOR(theta)
        let tempX = this.x * Math.cos(theta) - this.y * Math.sin(theta)
        let tempY = this.x * Math.sin(theta) + this.y * Math.cos(theta)
        this.x = tempX
        this.y = tempY
    }
    getDisplayHeading(v) {
        let diff = v.minus(this).normalize()
        //console.log(diff);
        let heading = RTOD(Math.atan2(diff.x, -diff.y))
        if (heading < 0) heading += 360
        if (heading > 359) heading -= 360
        return heading
    }
    get heading() {
        let temp = this.norm
        let heading = RTOD(Math.atan2(temp.x, temp.y))
        if (heading < 0) heading += 360
        if (heading > 359) heading -= 360
        return heading
    }
    updateFromHeading(hdg, bDegrees = true) {
        if (bDegrees) hdg = DTOR(hdg)
        this.update(Math.sin(hdg), -Math.cos(hdg))
    }
    //------------- > 3D specific
    rotate3DX(theta, degrees = false) {
        if (degrees) theta = DTOR(theta)
        let tempY = this.y * Math.cos(theta) - this.z * Math.sin(theta)
        let tempZ = this.y * Math.sin(theta) + this.z * Math.cos(theta)
        this.y = tempY
        this.z = tempZ
    }
    rotate3DY(theta, degrees = false) {
        if (degrees) theta = DTOR(theta)
        let tempX = this.x * Math.cos(theta) - this.z * Math.sin(theta)
        let tempZ = this.x * Math.sin(theta) + this.z * Math.cos(theta)
        this.x = tempX
        this.z = tempZ
    }
    rotate3DZ(theta, degrees = false) {
        if (degrees) theta = DTOR(theta)
        let tempX = this.x * Math.cos(theta) - this.y * Math.sin(theta)
        let tempY = this.x * Math.sin(theta) + this.y * Math.cos(theta)
        this.x = tempX
        this.y = tempY
    }
    newPositionFromVector(v, dist) {
        if (this.rank !== v.rank) alert("vectors must be of equal rank")
        //console.log(this.vector);
        return new Vector(
            ...this.vector.map((item, index) => {
                return item + v.vector[index] * dist
            })
        )
        //console.log(this.vector);
    }
    //------------- > conversions
    getGeo() {
        var Phi, Theta, temp
        var nLat, nLong
        if (this.z > EARTH_RADIUS) this.z = EARTH_RADIUS
        Phi = Math.acos(this.z / EARTH_RADIUS)
        nLat = 90 - RTOD(Phi)
        temp = Math.sqrt(this.x * this.x + this.y * this.y)
        Theta = Math.acos(this.x / temp)
        nLong = RTOD(Theta)
        if (this.y <= 0) nLong *= -1
        return new Geo(nLat, nLong)
    }
}
class Pos2d extends Vector {
    static _zoom = 1
    static viewCenter = new Point(0, 0)
    static screenSize = new Point()
    static screenCenter = new Point()
    //static screenUpdateNumber = 1;
    static updateScreenSize(w, h) {
        Pos2d.screenSize.x = w
        Pos2d.screenSize.y = h
        Pos2d.screenCenter.x = w / 2
        Pos2d.screenCenter.y = h / 2
        Pos2d.screenUpdateNumber++
    }
    static get zoom() {
        return Pos2d._zoom
    }
    static set zoom(z) {
        Pos2d._zoom = z
        Pos2d.screenUpdateNumber++
    }
    static zoomIn() {
        Pos2d._zoom *= 0.99
        Pos2d.screenUpdateNumber++
    }
    static zoomOut() {
        Pos2d._zoom *= 1.01
        Pos2d.screenUpdateNumber++
    }
    static incrementViewCenter(dX, dY) {
        Pos2d.viewCenter.x -= dX
        Pos2d.viewCenter.y += dY
        Pos2d.screenUpdateNumber++
    }
    static setViewCenter(x, y) {
        Pos2d.viewCenter.x = x
        Pos2d.viewCenter.y = y
        Pos2d.screenUpdateNumber++
    }
    static displayFromPos(pX, pY) {
        let dX = (pX - Pos2d.viewCenter.x) * Pos2d.zoom + Pos2d.screenCenter.x
        let dY = (Pos2d.viewCenter.y - pY) * Pos2d.zoom + Pos2d.screenCenter.y
        return new Point(dX, dY)
    }
    static posFromDisplay(dX, dY) {
        let pX = Pos2d.viewCenter.x + (dX - Pos2d.screenCenter.x) / Pos2d.zoom
        let pY =
            -1 * ((dY - Pos2d.screenCenter.y) / Pos2d.zoom - Pos2d.viewCenter.y)
        return new Point(pX, pY)
    }
    static getWorldDistance(pD) {
        return pD / Pos2d.zoom
    }
    static getDisplayDistance(dD) {
        return dD * Pos2d.zoom
    }
    constructor(...args) {
        super(...args)
        if (this.rank !== 2) {
            alert(`Error!  Pos2d created with rank of ${this.rank}`)
        }
        this.display = new Point()
        // this.bAlwaysUpdate = false;
        // this.lastUpdate = Pos2d.screenUpdateNumber - 1;

        this.updateDisplay()
    }
    setAlwaysUpdate(bVal) {
        this.bAlwaysUpdate = bVal
        return this
    }
    updateDisplay() {
        // if (
        //     this.lastUpdate === Pos2d.screenUpdateNumber &&
        // ..    !this.bAlwaysUpdate
        // ) {
        //     return this.display;
        // }
        this.display.x =
            (this.x - Pos2d.viewCenter.x) * Pos2d.zoom + Pos2d.screenCenter.x
        this.display.y =
            (Pos2d.viewCenter.y - this.y) * Pos2d.zoom + Pos2d.screenCenter.y
        this.lastUpdate = Pos2d.screenUpdateNumber
        return this.display
    }
    updatePosFromDisplay() {
        this.x =
            Pos2d.viewCenter.x +
            (this.display.x - Pos2d.screenCenter.x) / Pos2d.zoom
        this.y =
            -1 *
            ((this.display.y - Pos2d.screenCenter.y) / Pos2d.zoom -
                Pos2d.viewCenter.y)
    }
}
class Range {
    constructor(lo, hi) {
        this.update(lo, hi)
    }
    update(lo, hi) {
        this.lo = lo !== undefined ? lo : 0
        this.hi = hi !== undefined ? hi : 0
        this.delta = this.hi - this.lo
    }
}
