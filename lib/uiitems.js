//*------------------------ Supporting UI Classes
class DisplayContainer extends Container {
  constructor (id, parentid) {
    super(id, parentid)
    this.relativeSize(100, 100)
    //create the canvas
    new Canvas('canvas', id).fixLocation(0, 0).fillCanvas(220)
    // .addAction("canvasClick");
    // .listenForDragging(this.dragHandler.bind(this))
    // .listenForWheel(this.wheelHandler.bind(this));
    //create the svg surface
    new SVGContainer('cntSVG', id)
      .fixLocation(0, 0)
      .addAction('svgClick')
      .listenForDragging(this.dragHandler.bind(this))
      .listenForWheel(this.wheelHandler.bind(this))
      .listenForClicks(this.clickHandler.bind(this))
    this.bDrawAxes = true
    this.cntSVG.enableDropTracking(this.catchDropped.bind(this))
  }
  resize (w, h) {
    this.canvas.resize(w, h)
    this.cntSVG.fixSize(w, h)
    //update the static Pos2d values
    Pos2d.updateScreenSize(w, h)
    dispatchMessage(MSGREDRAW, true)
  }
  //get items dropped on canvas
  catchDropped (details) {
    //console.log(details);
    //determine the center of the dropped position:
    let info = details.draggedItemDetails
    let dX = info.draggedItemSize.w / 2 - info.draggedItemOffset.x
    let dY = info.draggedItemSize.h / 2 - info.draggedItemOffset.y
    //console.log("dX, dY: ", dX, dY);
    let dispX = details.offset.x + dX
    let dispY = details.offset.y + dY
    if (info.action.type == 'fix') {
      //console.log("fix dropped at: " + dispX + "," + dispY);

      let d = {
        index: info.action.index,
        locX: dispX,
        locY: dispY
      }
      dispatchMessage(MSGADD, 'fix', d)
    } else if (info.action.type == 'runway') {
      let d = {
        index: 0,
        locX: dispX,
        locY: dispY
      }
      dispatchMessage(MSGADD, 'runway', d)
    } else if (info.action.type == 'approach') {
      let d = {
        index: 0,
        locX: dispX,
        locY: dispY
      }
      dispatchMessage(MSGADD, 'approach', d)
    }
  }
  //---------------------------------------event handlers
  wheelHandler (delta) {
    if (delta < 0) {
      Pos2d.zoomIn()
    } else {
      Pos2d.zoomOut()
    }
    dispatchMessage(MSGREDRAW, true)
  }
  dragHandler (delta) {
    //console.log(delta);
    if (delta.target == this.cntSVG) {
      let x = Pos2d.getWorldDistance(delta.x)
      let y = Pos2d.getWorldDistance(delta.y)
      Pos2d.incrementViewCenter(x, y)
      dispatchMessage(MSGREDRAW, true)
    } else if (delta.target.type == 'dragHandle') {
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
  clickHandler (details) {
    //console.log(details)
    //get item handle if it is a display object
    let item = director.getItemFromIconID(details.clicktarget.id)
    if (item && item.type) {
      //console.log(item)
      dispatchMessage(MSGSELECT, null, item)
    } else if (
      details.clicktarget &&
      details.clicktarget.action == 'dragHandle'
    ) {
      //do nothing because it is still selected
    } else {
      //we've clicked on the canvas
      dispatchMessage(MSGSELECT, null, null)
    }
    dispatchMessage(MSGREDRAW, true)
  }
  //* ----------- -------------- ------------ DRAWING
  redraw (settings, items, needsUpdate, itemSelected) {
    this.canvas.fillCanvas(settings.backgroundColor)
    if (settings.bShowGrid) this.drawGrid(settings)
    items.forEach(item => item.draw(settings, needsUpdate, itemSelected))
  }
  drawGrid (settings) {
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
  constructor (id, displaySettings, closeImgURL, parentid = null) {
    super(id, closeImgURL, parentid)
    let uid = this.id
    //console.log(uid)
    this.displaySettings = displaySettings
    this.fixSize(300, 125)
      .assignClasses('wn-draggable-main', 'wn-titlebar', 'imagebutton')
      .addAction('wnSettings')
      .getCloseNotifications(this.clickHandler.bind(this))
      .hide()

    this.addControlButtons(uid)
    this.addInterfaceSection(uid)
    this.addDisplaySection(uid)
    this.addDefaultsSection(uid)
  }
  addControlButtons (id) {
    //add mini buttons down left for groups of items
    this.btnInterface = new BasicButton('', 'Interface', id)
      .fixLocation(5, 40)
      .addClass('min-button')
      .addAction('btnInterface')
      .listenForClicks(this.clickHandler.bind(this))
    this.btnDisplaySettings = new BasicButton('', 'Display', id)
      .fixLocation(5, 65)
      .addClass('min-button')
      .addAction('btnDisplaySettings')
      .listenForClicks(this.clickHandler.bind(this))
    this.btnDefaultSettings = new BasicButton('', 'Object Defaults', id)
      .fixLocation(5, 90)
      .setWidth(95)
      .addClass('min-button')
      .addAction('btnDefaultSettings')
      .listenForClicks(this.clickHandler.bind(this))
  }
  addInterfaceSection (id) {
    this.cntInterfaceSettings = new Div('', id)
      .fixLocation(100, 22)
      .fixSize(200, 100)
      .hide()
    new Image('', this.cntInterfaceSettings.id, 'images/ui/lang.png')
      .fixLocation(30, 5)
      .fixSize(100, 60)

    //dropdown for language choice
    let s = new SelectionBox('', this.cntInterfaceSettings.id)
      .fixLocation(20, 80)
      .fixSize(155, 20)
      .listenForChanges(this.changeHandler.bind(this))
      .addAction('langDropdown')
      .addClass('dropdown')
    let langs = getLanguages()
    for (let i = 0; i < langs.length; i++) {
      s.addOption(i, langs[i])
    }
    s.selectOption(getCurrentLanguage())
  }
  addDisplaySection (id) {
    this.cntDisplaySettings = new Div('', id)
      .fixLocation(100, 22)
      .fixSize(200, 278)
      .hide()
    let x = 5
    let y = 20
    //GRID/SCALE checkboxes
    let g = new Container('cntGrid', this.cntDisplaySettings.id)
      .fixLocation(x, y)
      .fixSize(150, 18)
    let chk = new CustomToggleSwitch('', g.id, this.changeHandler.bind(this))
      .fixLocation(0, 0)
      .fixSize(32, 16)
      .addAction('bShowGrid')
      .assignClasses('toggle-container', 'toggle-inner-off', 'toggle-inner-on')
    new Label('', 'Show Grid', g.id)
      .addClass('obj-label')
      .fixLocation(50, 0)
      .labelFor(chk.id)
    if (this.displaySettings.bShowGrid) chk.toggleOn()
    y += 22
    this.cntScale = new Container('cntScale', this.cntDisplaySettings.id)
      .fixLocation(x, y)
      .fixSize(150, 18)

    chk = new CustomToggleSwitch(
      '',
      this.cntScale.id,
      this.changeHandler.bind(this)
    )
      .fixLocation(0, 0)
      .fixSize(32, 16)
      .addAction('bShowScale')
      .assignClasses('toggle-container', 'toggle-inner-off', 'toggle-inner-on')
    new Label('', 'Show Scale', this.cntScale.id)
      .addClass('obj-label')
      .fixLocation(50, 0)
      .labelFor(chk.id)
    if (this.displaySettings.bShowScale) chk.toggleOn()

    //-----------------Background and Grid Colors
    y += 25
    //Background Color
    let c = new ColorInput(
      '',
      this.cntDisplaySettings.id,
      this.displaySettings.backgroundColor
    )
      .fixLocation(x, y)
      .fixSize(40, 26)
      .addAction('backgroundColor')
      .addClass('inputcolor')
      .listenForChanges(this.colorHandler.bind(this))
    new Label('', 'Background Color', this.cntDisplaySettings.id)
      .addClass('obj-label')
      .fixLocation(55, y + 5)
      .labelFor(c.id)
    y += 32
    c = new ColorInput(
      '',
      this.cntDisplaySettings.id,
      this.displaySettings.gridColor
    )
      .fixLocation(5, y)
      .fixSize(40, 26)
      .addAction('gridColor')
      .addClass('inputcolor')
      .listenForChanges(this.colorHandler.bind(this))
    new Label('', 'Grid Color', this.cntDisplaySettings.id)
      .addClass('obj-label')
      .fixLocation(55, y + 5)
      .labelFor(c.id)
    //-----------Grid spacing
    y += 35
    new Slider(
      '',
      5,
      100,
      5,
      this.displaySettings.gridSpacing,
      this.cntDisplaySettings.id
    )
      .fixLocation(5, y + 15)
      .setWidth(160)
      .listenForChanges(this.sliderHandler.bind(this))
      .addAction('gridSpacing')
      .addClass('slider')
    new Label('', 'Grid Spacing', this.cntDisplaySettings.id)
      .addClass('obj-label')
      .fixLocation(5, y)
  }
  addDefaultsSection (id) {
    this.cntDefaultSettings = new Div('', 'wnSettings')
      .fixLocation(100, 22)
      .fixSize(200, 375)
      .hide()
    let x = 5
    let y = 5
    new Label('', 'Navaid', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .addClass('boldit')
      .addClass('underlineit')
      .fixLocation(x, y)
    y += 18
    let c = new ColorInput(
      '',
      this.cntDefaultSettings.id,
      this.displaySettings.fixStrokeColor
    )
      .fixLocation(5, y)
      .fixSize(40, 26)
      .addAction('fixStrokeColor')
      .addClass('inputcolor')
      .listenForChanges(this.colorHandler.bind(this))
    new Label('', 'Border', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .fixLocation(50, y + 5)
      .labelFor(c.id)

    y += 32
    c = new ColorInput(
      '',
      this.cntDefaultSettings.id,
      this.displaySettings.fixFillColor
    )
      .fixLocation(5, y)
      .fixSize(40, 26)
      .addAction('fixFillColor')
      .addClass('inputcolor')
      .listenForChanges(this.colorHandler.bind(this))
    new Label('', 'Fill', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .fixLocation(50, y + 5)
      .labelFor(c.id)

    //--DEFAULT FIX SIZE
    y += 34
    new Label('', 'Default Fix Size', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .fixLocation(5, y)
    new Slider(
      '',
      0.1,
      20,
      0.1,
      this.displaySettings.baseFixSize,
      this.cntDefaultSettings.id
    )
      .fixLocation(5, y + 15)
      .setWidth(160)
      .listenForChanges(this.sliderHandler.bind(this))
      .addAction('baseFixSize')
      .addClass('slider')

    // FIX Strokeweight
    y += 40
    new NumberInput('', this.cntDefaultSettings.id)
      .fixLocation(x, y)
      .fixSize(40, 22)
      .addClass('nm-input')
      .setParms(0, 9, 1)
      .setValue(this.displaySettings.fixStrokeWeight)
      .addAction('fixStrokeWeight')
      .listenForChanges(this.changeHandler.bind(this))

    new Label('', 'Border Weight', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .fixLocation(50, y + 3)
    //-----------RUNWAY ITEMS
    y += 40
    new Label('', 'Runway', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .addClass('boldit')
      .addClass('underlineit')
      .fixLocation(x, y)
    y += 18

    c = new ColorInput(
      '',
      this.cntDefaultSettings.id,
      this.displaySettings.rwyStrokeColor
    )
      .fixLocation(5, y)
      .fixSize(40, 26)
      .addAction('rwyStrokeColor')
      .addClass('inputcolor')
      .listenForChanges(this.colorHandler.bind(this))
    new Label('', 'Border', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .fixLocation(50, y)
      .labelFor(c.id)

    y += 32
    c = new ColorInput(
      '',
      this.cntDefaultSettings.id,
      this.displaySettings.rwyFillColor
    )
      .fixLocation(5, y)
      .fixSize(40, 26)
      .addAction('rwyFillColor')
      .addClass('inputcolor')
      .listenForChanges(this.colorHandler.bind(this))
    new Label('', 'Fill', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .fixLocation(50, y)
      .labelFor(c.id)

    y += 30
    new NumberInput('', this.cntDefaultSettings.id)
      .fixLocation(x, y)
      .fixSize(40, 22)
      .addClass('nm-input')
      .setParms(0, 9, 1)
      .setValue(director.displaySettings.rwyStrokeWeight)
      .addAction('rwyStrokeWeight')
      .listenForChanges(this.changeHandler.bind(this))

    new Label('', 'Border Weight', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .fixLocation(50, y + 3)

    //-----------APPROACH ITEMS
    y += 40
    new Label('', 'Approach', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .addClass('boldit')
      .addClass('underlineit')
      .fixLocation(x, y)
    y += 18
    c = new ColorInput(
      '',
      this.cntDefaultSettings.id,
      this.displaySettings.approachStrokeColor
    )
      .fixLocation(5, y)
      .fixSize(40, 26)
      .addAction('approachStrokeColor')
      .addClass('inputcolor')
      .listenForChanges(this.colorHandler.bind(this))
    new Label('', 'Border', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .fixLocation(50, y + 5)
      .labelFor(c.id)

    y += 30
    new NumberInput('', this.cntDefaultSettings.id)
      .fixLocation(x, y)
      .fixSize(40, 22)
      .addClass('approachStrokeWeight')
      .setParms(0, 9, 1)
      .setValue(this.displaySettings.approachStrokeWeight)
      .addAction('approachStrokeWeight')
      .listenForChanges(this.changeHandler.bind(this))

    new Label('', 'Border Weight', this.cntDefaultSettings.id)
      .addClass('obj-label')
      .fixLocation(50, y + 3)
  }
  clickHandler (details) {
    if (details.action == 'wnSettings:close') {
      this.hide()
    } else if (details.action == 'btnInterface') {
      this.btnInterface.addClass('min-selected')
      this.btnDisplaySettings.removeClass('min-selected')
      this.btnDefaultSettings.removeClass('min-selected')
      this.fixSize(300, 140)
      this.cntInterfaceSettings.show()
      this.cntDisplaySettings.hide()
      this.cntDefaultSettings.hide()
    } else if (details.action == 'btnDisplaySettings') {
      this.btnInterface.removeClass('min-selected')
      this.btnDisplaySettings.addClass('min-selected')
      this.btnDefaultSettings.removeClass('min-selected')
      this.fixSize(300, 215)
      this.cntInterfaceSettings.hide()
      this.cntDisplaySettings.show()
      this.cntDefaultSettings.hide()
    } else if (details.action == 'btnDefaultSettings') {
      this.btnInterface.removeClass('min-selected')
      this.btnDisplaySettings.removeClass('min-selected')
      this.btnDefaultSettings.addClass('min-selected')
      this.fixSize(300, 400)
      this.cntInterfaceSettings.hide()
      this.cntDisplaySettings.hide()
      this.cntDefaultSettings.show()
    }
  }
  changeHandler (details) {
    if (details.action == 'langDropdown') {
      changeLanguage(Number(details.sender.getSelection().index))
    } else {
      dispatchMessage(MSGSETTINGS, details.action, details.value)
    }
  }
  colorHandler (details) {
    dispatchMessage(MSGSETTINGS, details.action, details.value)
  }
  sliderHandler (details) {
    console.log(details)
    //console.log(details);
    dispatchMessage(MSGSETTINGS, details.action, Number(details.value))
  }
}
class QuickSettingsWindow extends Div {
  constructor (id, parentid = null) {
    super(id, parentid)
    this.showOverflow().fixSize(120, 28)
    this.addButtons(id)
  }
  addButtons (id) {
    let btnSize = 24
    let x = 0
    let x1 = 0
    let y = 0
    let y1 = 35
    //SETTINGS- LABEL and BUTTON
    this.lblSettings = new Label('', 'Settings', id)
      .fixLocation(x, y1)
      .hide()
      .addClass('info-caption')
      .wrap(false)
    new BasicButton('btnSettings', '', id)
      .fixSize(btnSize, btnSize)
      .fixLocation(x, y)
      .addClass('imagebutton2')
      .bgImage('images/ui/settings.svg')
      .addAction('btnSettings')
      .listenForClicks(this.btnHandler.bind(this))
      .listenForEnterLeave(
        this.enterHandler.bind(this),
        this.leaveHandler.bind(this)
      )
    //DARK LIGHT mode
    x += 28
    this.lblDarkMode = new Label('', 'Dark/Light Mode', id)
      .fixLocation(x, y1)
      .hide()
      .addClass('info-caption')
      .wrap(false)
    new BasicButton('btnDarkmode', '', id)
      .fixSize(btnSize, btnSize)
      .fixLocation(x, y)
      .addClass('imagebutton')
      .bgImage('images/ui/darkmode.svg')
      .bgImageFit()
      .addAction('darkMode')
      .listenForClicks(this.btnHandler.bind(this))
      .listenForEnterLeave(
        this.enterHandler.bind(this),
        this.leaveHandler.bind(this)
      )

    //EDIT
    x += 28
    this.lblEdit = new Label('', 'Edit Mode', id)
      .fixLocation(x, y1)
      .hide()
      .addClass('info-caption')
      .wrap(false)
    new BasicButton('btnEdit', '', id)
      .fixSize(btnSize, btnSize)
      .fixLocation(x, y)
      .addClass('imagebutton2')
      .bgImage('images/ui/edit.svg')
      .addAction('btnEdit')
      .listenForClicks(this.btnHandler.bind(this))
      .listenForEnterLeave(
        this.enterHandler.bind(this),
        this.leaveHandler.bind(this)
      )

    //ANIMATE
    x += 28
    this.lblAnimate = new Label('', 'Animation Mode', id)
      .fixLocation(x, y1)
      .hide()
      .addClass('info-caption')
      .wrap(false)
    new BasicButton('btnAnimation', '', id)
      .fixSize(btnSize, btnSize)
      .fixLocation(x, y)
      .addClass('imagebutton2')
      .bgImage('images/ui/animate.svg')
      .addAction('btnAnimate')
      .listenForClicks(this.btnHandler.bind(this))
      .listenForEnterLeave(
        this.enterHandler.bind(this),
        this.leaveHandler.bind(this)
      )
  }
  btnHandler (details) {
    if (details.action == 'btnSettings') {
      this.lblSettings.hide()
      dispatchMessage(MSGUI, 'dispSettingsWindow')
    } else if (details.action == 'darkMode') {
      dispatchMessage(MSGUI, 'toggleDarkMode')
    } else if (details.action == 'btnEdit') {
      dispatchMessage(MSGUI, 'changeAppMode', EDITMODE)
    } else if (details.action == 'btnAnimate') {
      dispatchMessage(MSGUI, 'changeAppMode', ANIMATEMODE)
    }
  }
  enterHandler (details) {
    if (details.action == 'btnSettings') {
      this.lblSettings.show()
    } else if (details.action == 'darkMode') {
      this.lblDarkMode.show()
    } else if (details.action == 'btnAdd') {
      this.lblAdd.show()
    } else if (details.action == 'btnEdit') {
      this.lblEdit.show()
    } else if (details.action == 'btnAnimate') {
      this.lblAnimate.show()
    }
  }
  leaveHandler (details) {
    if (details.action == 'btnSettings') {
      this.lblSettings.hide()
    } else if (details.action == 'btnEdit') {
      this.lblEdit.hide()
    } else if (details.action == 'btnAnimate') {
      this.lblAnimate.hide()
    } else if (details.action == 'darkMode') {
      this.lblDarkMode.hide()
    }
  }
}
class VerticalAddWindow extends Div {
  constructor (id, parentid = null) {
    super(id, parentid)
    this.autoOverflow()
    this.stkMgrLeft = new StackManager('', LEFTBARWIDTH - 15, id)
    this.stkMgrLeft.paneClosedHeight = 40
    this.addInstrPane()
    this.addFixPane()
    this.addAirportItemsPane()
  }
  onResize (w, h) {
    this.fixSize(LEFTBARWIDTH, h)
  }
  addInstrPane () {
    //add an info message
    this.infoLabel = new Label('', 'Drag and drop items to the canvas', '')
      .fixLocation(LEFTBARWIDTH, 45)
      .addClass('info-caption')
      .hide()
    let pn = this.stkMgrLeft.addPane('', '')

    new Image('', pn.id, '/images/ui/info.svg')
      .fixLocation(5, 2)
      .fixSize(25, 25)
      .addAction('btnInfo')
      .listenForEnterLeave(
        this.enterHandler.bind(this),
        this.leaveHandler.bind(this)
      )
    pn.changeClosedHeight(28)

    pn.hideToggleButton()
  }
  addFixPane () {
    let pn = this.stkMgrLeft.addPane('', '')

    pn.chgButton
      .bgImage('/images/ui/nav.png')
      .fixLocation(0, 0)
      .fixSize(45, 40)
      .addClass('imagebutton3')
      .addAction('btnFix')
      .listenForEnterLeave(
        this.enterHandler.bind(this),
        this.leaveHandler.bind(this)
      )

    let x = 3
    let y = 40
    //add all the fixes
    for (let i = 0; i < director.aFixImage.length; i++) {
      let p = director.aFixImage[i]
      let img = new Image('', pn.id, p.url)
        .fixLocation(x, y)
        .fixSize(32, 32)
        .setDraggable(true)
        .addClass('draggable')
        .addAction({ type: 'fix', index: i })
        .enableDragTracking(this.dragStart.bind(this), this.dragEnd.bind(this))
      y += 38
    }
    pn.openHeight = 460
    //pn.changeState()
  }
  addAirportItemsPane () {
    let pn = this.stkMgrLeft.addPane('', '')
    pn.chgButton
      .bgImage('/images/ui/tower.svg')
      .fixLocation(0, 0)
      .fixSize(45, 40)
      .addClass('imagebutton3')
      .applyStyle('background-size', '20px, 28px')
      .applyStyle('background-position-x', '8px')
      .applyStyle('background-position-y', '2px')
      .addAction('btnAirport')
      .listenForEnterLeave(
        this.enterHandler.bind(this),
        this.leaveHandler.bind(this)
      )

    let x = 0
    let y = 45
    //RUNWAY
    let p = director.aAirportImage[0]
    let img = new Image('', pn.id, p.url)
      .fixLocation(x, y)
      .fixSize(40, 15)
      .setDraggable(true)
      .addClass('draggable')
      .addAction({ type: 'runway' })
      .enableDragTracking(this.dragStart.bind(this), this.dragEnd.bind(this))
    y += 22
    //APPROACH
    p = director.aAirportImage[1]
    img = new Image('', pn.id, p.url)
      .fixLocation(x, y)
      .fixSize(40, 15)
      .setDraggable(true)
      .addClass('draggable')
      .addAction({ type: 'approach' })
      .enableDragTracking(this.dragStart.bind(this), this.dragEnd.bind(this))

    pn.openHeight = 90
    //pn.changeState()
  }
  enterHandler (details) {
    //console.group(details)
    if (details.action == 'btnInfo') {
      this.infoLabel.updateCaption('Drag and drop items to the canvas')
      this.infoLabel.setY(details.sender.parent.y + 40)
      this.infoLabel.show()
    } else if (details.action == 'btnFix') {
      this.infoLabel.updateCaption('Navaid')
      this.infoLabel.setY(details.sender.parent.y)
      this.infoLabel.show()
    } else if (details.action == 'btnAirport') {
      this.infoLabel.updateCaption('Airport Related')
      this.infoLabel.setY(details.sender.parent.y)
      this.infoLabel.show()
    }
  }
  leaveHandler (details) {
    this.infoLabel.hide()
  }
  dragStart (details) {
    $(details.draggedItemID).setOpacity(0.5)
    //console.log(details);
  }
  dragEnd (details) {
    $(details.draggedItemID).setOpacity(1)
    //console.log(details);
  }
}
class ShapeEditor extends Div {}
