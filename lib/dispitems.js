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
