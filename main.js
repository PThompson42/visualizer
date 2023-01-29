const IMAGEBARWIDTH = 134
const TOPBARHEIGHT = 28
const LEFTBARWIDTH = 60
const EDITMODE = 'editmode'
const ANIMATEMODE = 'animatemode'
const MSGSETTINGS = 'msgsettings'
const MSGREDRAW = 'msgredraw'
const MSGADD = 'msgadd'
const MSGSELECT = 'msgselect'
const MSGDELETE = 'msgdelete'
const MSGUI = 'msgui'

//*------------------------APP DIRECTOR
class AppDirector extends ApplicationDirector {
  constructor (completedCallback) {
    super()
    this.createDisplaySettings()
    this.completedCallback = completedCallback
    //get dark or light mode
    this.darkMode = localStorage.getItem('displaymode')
    if (this.darkMode !== 'dark' && this.darkMode !== 'light') {
      this.darkMode = 'light'
      this.saveDisplayModeToStorage()
    }
    this.setDisplayMode()
    //set the current app mode to nothing
    this.appMode = null
    //listen for system messages
    document.addEventListener(
      'systemmessage',
      this.processSystemMessage.bind(this)
    )
    //open the language file which triggers the rest of loading
    this.openFile('data/ui_language.csv', this.processTranslations.bind(this))
  }
  processTranslations (data) {
    let lines = data.split('\n')
    //console.log(lines);
    let lans = lines.shift().split(',')
    let translations = []
    while (lines.length) {
      let chunks = lines.shift().split(',')
      if (chunks.length < 2) continue
      translations.push(chunks)
    }
    //enable multilingual support
    enableMultilingual(lans, translations)

    this.setup().then(() => {
      setTimeout(this.completedCallback, 100)
    })
  }
  async setup () {
    //Load Fixes
    this.aFixImage = []
    let base = 'images/fixes/'
    let fixConfigs = ['square', 'triangle', 'star', 'diamond', 'circle']
    for (let i = 0; i < 11; i++) {
      let url = base + 'fix' + i + '.png'
      let pic = await this.loadImage(url)
      if (i < 5) pic.fixType = fixConfigs[i]
      else pic.fixType = 'bmp'
      this.aFixImage.push(pic)
    }
    //Load Airport Items
    this.aAirportImage = []
    base = 'images/airport/'
    let aAPurl = ['runway', 'app2']
    for (let i = 0; i < aAPurl.length; i++) {
      let url = base + aAPurl[i]
      let pic = await this.loadImage(url + '.png')
      pic.type = aAPurl[i]
      pic.displaySize = { w: 100, h: 25 }
      this.aAirportImage.push(pic)
    }

    return null
  }
  //* ------------        Display Settings & Mode
  createDisplaySettings () {
    let dis = localStorage.getItem('displaysettings')
    if (dis) {
      this.displaySettings = JSON.parse(dis)
    } else {
      this.displaySettings = {
        bShowGrid: true,
        gridSpacing: 5,
        gridColor: '#ACAAAA',
        backgroundColor: '#787878',
        bShowScale: true,
        baseFixSize: 2.4,
        fixStrokeColor: '#303030',
        fixFillColor: '#FFFFFF00',
        fixStrokeWeight: 2,
        rwyStrokeColor: '#f0f0f0',
        rwyFillColor: '#232428',
        rwyStrokeWeight: 3,
        taxiStrokeColor: '#808080',
        taxiFillColor: '#80808080',
        taxiStrokeWeight: 2,
        approachStrokeColor: '#C0C0C0',
        approachStrokeWeight: 1,
        selectedColor: '#FFFF00'
      }
      this.saveDisplaySettings()
    }
    this.aDisplayObjects = []
    this.itemSelected = null
  }
  saveDisplaySettings () {
    localStorage.setItem(
      'displaysettings',
      JSON.stringify(this.displaySettings)
    )
  }
  saveDisplayModeToStorage () {
    localStorage.setItem('displaymode', this.darkMode)
  }
  setDisplayMode () {
    if (this.darkMode === 'light') {
      document
        .getElementById('pagestyle')
        .setAttribute('href', 'css/applight.css')
    } else {
      document
        .getElementById('pagestyle')
        .setAttribute('href', 'css/appdark.css')
    }
    this.saveDisplayModeToStorage()
  }
  connectDisplay (dc) {
    this.dispCnt = dc
  }
  sortObjects () {
    //sort array by layer number
    this.aDisplayObjects.sort((a, b) => a.layer - b.layer)
    for (let i = 0; i < this.aDisplayObjects.length; i++) {
      this.aDisplayObjects[i].index = i
    }
  }
  changeBaseFixSize () {
    for (let i = 0; i < this.aDisplayObjects.length; i++) {
      let f = this.aDisplayObjects[i]
      if (f.type == 'fix') {
        if (!f.bOverrideSize) {
          f.updateSize(this.displaySettings.baseFixSize)
        }
      }
    }
  }
  getItemFromIconID (testID) {
    return this.aDisplayObjects.find(item => item.icon.id == testID)
  }
  deleteDisplayItem () {
    if (this.itemSelected) {
      this.itemSelected.destructor()
      this.aDisplayObjects.splice(this.itemSelected.index, 1)
      this.itemSelected = null
      this.sortObjects()
      this.sendRedraw(false)
    }
  }
  //* ------------        System Messaging Handler
  processSystemMessage (e) {
    //console.log(e.detail)
    if (e.detail.type == MSGREDRAW) {
      this.sendRedraw(e.detail.setting)
    } else if (e.detail.type == MSGADD) {
      this.addDisplayObject(e.detail.setting, e.detail.value)
    } else if (e.detail.type == MSGSETTINGS) {
      this.processSettingsChange(e.detail.setting, e.detail.value)
    } else if (e.detail.type == MSGDELETE) {
      this.deleteDisplayItem()
    } else if (e.detail.type == 'msg-display-connect') {
      this.connectDisplay(e.detail.value)
    } else if (e.detail.type == MSGUI) {
      this.processUIMessage(e.detail.setting, e.detail.value)
    } else if (e.detail.type == MSGSELECT) {
      this.processObjectSelection(e.detail.value)
    }
  }
  sendRedraw (bNeedsUpdate) {
    if (main && main.type) {
      main.cntDisplay.redraw(
        this.displaySettings,
        this.aDisplayObjects,
        bNeedsUpdate,
        this.itemSelected
      )
    }
  }
  addDisplayObject (objType, details) {
    if (objType == 'fix') {
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
      this.sendRedraw(false)
    } else if (objType == 'runway') {
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
      this.sendRedraw(false)
    } else if (objType == 'approach') {
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
      this.sendRedraw(false)
    }
  }
  processSettingsChange (setting, details) {
    //console.log(setting, details)
    if (setting == 'baseFixSize') {
      this.displaySettings[setting] = details
      this.changeBaseFixSize()
      this.sendRedraw(false)
    } else {
      this.displaySettings[setting] = details
      this.sendRedraw(false)
    }
    this.saveDisplaySettings()
  }
  processUIMessage (setting, details) {
    //console.log(setting, details)
    if (setting == 'dispSettingsWindow') {
      main.wnSettings.show()
    } else if (setting == 'toggleDarkMode') {
      this.darkMode == 'light'
        ? (this.darkMode = 'dark')
        : (this.darkMode = 'light')
      this.setDisplayMode()
    } else if (setting == 'changeAppMode') {
      this.appMode = details
      main.useAppMode(this.appMode)
    }
  }
  processObjectSelection (item) {
    this.itemSelected = item
  }
}
//*------------------------User Interface
class UI extends UIContainer {
  constructor (displaySettings) {
    super()
    this.displaySettings = displaySettings
    //get saved language from storage
    loadLanguageFromStorage()
    //set AOmode to center
    AO.RECTMODE = AO.CENTER
    //set up the display area
    new DisplayContainer('cntDisplay', '')
    //set up quick settings window middle top of the screen
    new QuickSettingsWindow('cntQuickSettings', '').fixLocation(50, 0)

    //create the left bar for adding items
    new VerticalAddWindow('leftAddBar', '')
    //create the settings window
    new AppSettingsWindow(
      'wnSettings',
      this.displaySettings,
      'images/ui/close.svg',
      ''
    )
      .fixLocation(60, 50)
      .centerH()
    //Connect the display container to the Display Object Class
    dispatchMessage('msg-display-connect', null, this.cntDisplay)
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
  onResizeEvent () {
    this.w = this.getWidth()
    this.h = this.getHeight()
    this.cntDisplay.resize(this.w, this.h)
    this.leftAddBar.onResize(this.w, this.h)
    this.cntQuickSettings.centerH()
  }
  newFrame () {
    //clear the canvas
    //this.canvas.fillCanvas(51);
    console.log(this.frameRate())
  }
  useAppMode (mode) {
    if (mode == EDITMODE) {
      this.leftAddBar.show()
    } else if (mode == ANIMATEMODE) {
      this.leftAddBar.hide()
    }
  }
  //TODO ------------Deal with RIGHT SIDE animation items
  addAnimatePane () {
    let pn = this.stkRight.addPane('pnAnimate', 'Animation')
    new BasicButton('', 'Start', pn.id)
      .addClass('basicbutton1')
      .fixLocation(5, 30)
      .fixSize(75, 24)
      .listenForClicks(this.btnHandler.bind(this))
      .addAction('animStart')

    new BasicButton('', 'Stop', pn.id)
      .addClass('basicbutton1')
      .fixLocation(90, 30)
      .fixSize(75, 24)
      .listenForClicks(this.btnHandler.bind(this))
      .addAction('animStop')
    pn.openHeight = 100
    //pn.changeState();
  }
  // HANDLERS ----------------
  btnHandler (details) {
    if (details.action == 'animStart') {
      this.animStart()
    } else if (details.action == 'animStop') {
      this.animStop()
    } else {
      console.log(details)
    }
  }
  keyboardHandler (details) {
    if (details.action == 'Up') {
      //console.log(details);
      if (details.key == 'Delete' || details.key == 'Backspace') {
        dispatchMessage(MSGDELETE, null, null)
      }
    }
  }
  hideClutter () {
    //a way to close stuff that should be closed
    this.wnSettings.hide()
  }
}
//*------------------------APP TRIGGER & STARTUP
function setup () {
  main = new UI(director.displaySettings)
  setTimeout(launch, 100)
}
function launch () {
  console.log(`Application started: ${new Date().toString()}`)
  clearLoadingAssets()
  dispatchMessage(MSGREDRAW, true)
}
function clearLoadingAssets () {
  let a = $('msg1')
  a.parentNode.removeChild(a)
  //window.removeEventListener("load", clearLoadingAssets);
}
function dispatchMessage (type, setting, value) {
  let d = {
    type: type,
    setting: setting,
    value: value
  }
  let e = new CustomEvent('systemmessage', { detail: d })
  document.dispatchEvent(e)
}
director = new AppDirector(setup)
