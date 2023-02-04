class Fix {
    static fixNumber = 0
    constructor(f, dispX, dispY, settings, displayContainer, displayList) {
        //console.log(f);
        this.fixType = f.fixType
        let p = Pos2d.posFromDisplay(dispX, dispY)
        this.pos = new Pos2d(p.x, p.y)
        this.type = "fix"
        this.displayContainer = displayContainer
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
        //*-------create control icon
        this.icon = new svgPolygon("", this.displayContainer.cntSVG.id)
        this.icon.addClass("svgDisplayObject")
        //add 4 control points at corners
        this.aIconVertices = []
        for (let i = 0; i < 4; i++) {
            this.aIconVertices.push(new Pos2d())
            this.icon.addPoint()
        }
        this.updateVertices()

        //Assign a designator
        Fix.fixNumber++
        let tNum = String(Fix.fixNumber)
        if (tNum.length == 1) tNum = "00" + tNum
        else if (tNum.length == 2) tNum = "0" + tNum
        this.desig = "FIX" + tNum
        //Assign a layer
        this.layer = 1
        //assign and index value and add to Display object array
        this.index = displayList.length
        displayList.push(this)
    }
    destructor() {
        this.icon.destroy()
        this.pos = null
        this.aIconVertices = null
    }
    changeLayer(l) {
        this.layer = l
        this.icon.setZ(l)
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
    updateVertices() {
        this.aIconVertices[0].update(
            this.pos.x - this.size,
            this.pos.y + this.size
        )
        this.aIconVertices[1].update(
            this.pos.x + this.size,
            this.pos.y + this.size
        )
        this.aIconVertices[2].update(
            this.pos.x + this.size,
            this.pos.y - this.size
        )
        this.aIconVertices[3].update(
            this.pos.x - this.size,
            this.pos.y - this.size
        )
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
    draw(settings, bNeedsUpdate, itemSelected) {
        this.pos.updateDisplay()
        this.updateVertices()

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
        if (this == itemSelected) {
            this.icon.changeClass("highlight")
            cv.fillStyle(settings.fixFontColor)
            cv.drawText(
                this.desig,
                settings.fixFontSize,
                this.pos.display.x,
                this.pos.display.y - dSize - 8,
                false
            )
        } else {
            this.icon.changeClass("svgDisplayObject")
        }
    }
}
class Runway {
    constructor(
        dispX,
        dispY,
        dispW,
        dispH,
        settings,
        displayContainer,
        displayList
    ) {
        let p = Pos2d.posFromDisplay(dispX, dispY)
        this.pos = new Pos2d(p.x, p.y)
        this.length = Pos2d.getWorldDistance(dispW) / 2
        this.width = Pos2d.getWorldDistance(dispH) / 2
        this.type = "runway"
        //Assign a layer
        this.layer = 1
        this.displayContainer = displayContainer

        //*-------create control icon
        this.icon = new svgPolygon("", this.displayContainer.cntSVG.id)
        this.icon.addClass("svgDisplayObject")
        //create corner vertices and drag handles
        this.aIconVertices = []
        this.aControlPoints = []
        this.aDragHandles = []
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

        //assign and index value and add to Display object array
        this.index = displayList.length
        displayList.push(this)
    }
    destructor() {
        this.icon.destroy()
        this.aDragHandles.forEach((item) => item.destroy())
        this.pos = null
        this.aIconVertices = null
        this.aControlPoints = null
        this.aDragHandles = null
    }
    changeLayer(l) {
        this.layer = l
        this.icon.setZ(l)
        this.aDragHandles.forEach((item) => item.setZ(l))
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
    showDragHandles() {
        this.aDragHandles.forEach((item) => item.show())
    }
    hideDragHandles() {
        this.aDragHandles.forEach((item) => item.hide())
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
    draw(settings, bNeedsUpdate, itemSelected) {
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

        if (this == itemSelected) {
            this.icon.changeClass("highlight")
            this.showDragHandles()
        } else {
            this.icon.changeClass("svgDisplayObject")
            this.hideDragHandles()
        }
    }
}
class Approach {
    constructor(
        dispX,
        dispY,
        dispW,
        dispH,
        settings,
        displayContainer,
        displayList
    ) {
        let p = Pos2d.posFromDisplay(dispX, dispY)
        this.pos = new Pos2d(p.x, p.y)
        this.length = Pos2d.getWorldDistance(dispW) / 2
        this.width = Pos2d.getWorldDistance(dispH) / 2
        this.type = "approach"
        //Assign a layer
        this.layer = 1
        this.displayContainer = displayContainer
        //*-------create control icon
        this.icon = new svgPolygon("", this.displayContainer.cntSVG.id)
        this.icon.addClass("svgDisplayObject")
        //create corner vertices and drag handles
        this.aIconVertices = []
        this.aControlPoints = []
        this.aDragHandles = []
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

        //assign and index value and add to Display object array
        this.index = displayList.length
        displayList.push(this)
    }
    destructor() {
        this.icon.destroy()
        this.aDragHandles.forEach((item) => item.destroy())
        this.pos = null
        this.aIconVertices = null
        this.aControlPoints = null
        this.aDragHandles = null
    }
    changeLayer(l) {
        this.layer = l
        this.icon.setZ(l)
        this.aDragHandles.forEach((item) => item.setZ(l))
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
    showDragHandles() {
        this.aDragHandles.forEach((item) => item.show())
    }
    hideDragHandles() {
        this.aDragHandles.forEach((item) => item.hide())
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
    draw(settings, bNeedsUpdate, itemSelected) {
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

        if (this == itemSelected) {
            this.icon.changeClass("highlight")
            this.showDragHandles()
        } else {
            this.icon.changeClass("svgDisplayObject")
            this.hideDragHandles()
        }
    }
}
class AirwayFix {
    constructor(input) {
        this.update(input)
    }
    update(input) {
        if (input.includes("/")) {
            let p = input.split("/")
            if (p.length !== 2) {
                console.log("error in input", input)
                return null
            }
            this.type = "pt"
            this.loc = new Point(Number(p[0], Number(p[1])))
            this.ident = input
        } else {
            this.type = "fix"
            this.loc = null
            this.ident = input
        }
    }
}
class Airway {
    constructor(dispX, dispY, settings, displayContainer, displayList) {
        let p1 = Pos2d.posFromDisplay(dispX - 100, dispY)
        let p2 = Pos2d.posFromDisplay(dispX + 100, dispY)

        this.type = "airway"
        this.layer = 1
        this.displayContainer = displayContainer

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
        this.aDragHandles = []

        this.icon = new svgPolyline("", this.displayContainer.cntSVG.id)
        this.icon.addClass("svgLine")

        this.updateFromFixString()

        this.strokeWeight = settings.airwayStrokeWeight
        this.strokeColor = settings.airwayStrokeColor
        //assign and index value and add to Display object array
        this.index = displayList.length
        displayList.push(this)
    }
    destructor() {
        this.icon.destroy()
        this.aDragHandles.forEach((item) => item.destroy())
    }
    changeLayer(l) {
        this.layer = l
        this.icon.setZ(l)
        this.aDragHandles.forEach((item) => item.setZ(l))
    }
    showDragHandles() {
        this.aDragHandles.forEach((item) => item.show())
    }
    hideDragHandles() {
        this.aDragHandles.forEach((item) => item.hide())
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
    draw(settings, bNeedsUpdate, itemSelected) {
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

        if (this == itemSelected) {
            this.icon.changeClass("highlight")
            this.showDragHandles()
        } else {
            this.icon.changeClass("svgLine")
            this.hideDragHandles()
        }
    }
}
