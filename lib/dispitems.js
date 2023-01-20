class Fix {
    static fixNumber = 0;
    constructor(f, dispX, dispY) {
        //console.log(f);
        this.fixType = f.fixType;
        let p = Pos2d.posFromDisplay(dispX, dispY);
        this.pos = new Pos2d(p.x, p.y);
        this.type = "fix";
        if (this.fixType == "bmp") {
            this.img = f.img;
        } else {
            this.img = null;
            this.strokeColor = appData.displaySettings.fixStrokeColor;
            this.fillColor = appData.displaySettings.fixFillColor;
            this.strokeWeight = appData.displaySettings.fixStrokeWeight;
        }
        this.w = appData.displaySettings.baseFixSize / 2;
        this.h = appData.displaySettings.baseFixSize / 2;
        this.bOverrideSize = false;
        //*-------create control icon
        this.icon = new svgPolygon("", appData.dispCnt.cntSVG.id);
        this.icon.addClass("svgDisplayObject");
        //add 4 control points at corners
        this.aIconVertices = [];
        for (let i = 0; i < 4; i++) {
            this.aIconVertices.push(new Pos2d());
            this.icon.addPoint();
        }
        this.updateVertices();

        //Assign a designator
        Fix.fixNumber++;
        let tNum = String(Fix.fixNumber);
        if (tNum.length == 1) tNum = "00" + tNum;
        else if (tNum.length == 2) tNum = "0" + tNum;
        this.desig = "FIX" + tNum;
        //Assign a layer
        this.layer = 1;
        //add to Display object array
        appData.aDisplayObjects.push(this);
        appData.itemSelected = this;
    }
    destructor() {
        this.icon.destroy();
        this.pos = null;
        this.aIconVertices = null;
    }
    overrideSize(sz) {
        this.w = sz / 2;
        this.h = sz / 2;
        this.bOverrideSize = true;
        this.updateVertices();
        main.triggerRedraw(false);
    }
    updateSize() {
        if (!this.bOverrideSize) {
            this.w = appData.displaySettings.baseFixSize / 2;
            this.h = appData.displaySettings.baseFixSize / 2;
            this.updateVertices();
        }
    }
    updateVertices() {
        this.aIconVertices[0].update(this.pos.x - this.w, this.pos.y + this.h);
        this.aIconVertices[1].update(this.pos.x + this.w, this.pos.y + this.h);
        this.aIconVertices[2].update(this.pos.x + this.w, this.pos.y - this.h);
        this.aIconVertices[3].update(this.pos.x - this.w, this.pos.y - this.h);
        for (let i = 0; i < 4; i++) {
            this.aIconVertices[i].updateDisplay();
            this.icon.update(
                i,
                this.aIconVertices[i].display.x,
                this.aIconVertices[i].display.y
            );
        }
    }
    moveItem(dX, dY) {
        //console.log(details);
        this.pos.display.x += dX;
        this.pos.display.y += dY;
        this.pos.updatePosFromDisplay();
        this.updateVertices();
        //appData.itemSelected = this;
        main.triggerRedraw(true);
    }
    draw(bNeedsUpdate) {
        this.pos.updateDisplay();
        this.updateVertices();

        let cv = appData.dispCnt.canvas;
        //draw the image on the canvas
        let dSize = Pos2d.getDisplayDistance(this.w);
        if (this.fixType == "bmp") {
            cv.ctx.drawImage(
                this.img,
                this.pos.display.x - dSize,
                this.pos.display.y - dSize,
                dSize * 2,
                dSize * 2
            );
        } else {
            cv.strokeStyle(this.strokeColor);
            cv.weight = this.strokeWeight;
            cv.fillStyle(this.fillColor);
            if (this.fixType == "square") {
                cv.rectangle(
                    this.pos.display.x,
                    this.pos.display.y,
                    dSize * 2,
                    dSize * 2,
                    true
                );
            } else if (this.fixType == "circle") {
                cv.circle(this.pos.display, dSize, true);
            } else if (this.fixType == "triangle") {
                let ctx = cv.ctx;
                ctx.beginPath();
                ctx.moveTo(
                    this.pos.display.x - dSize,
                    this.pos.display.y + dSize
                );
                ctx.lineTo(this.pos.display.x, this.pos.display.y - dSize);
                ctx.lineTo(
                    this.pos.display.x + dSize,
                    this.pos.display.y + dSize
                );
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
            } else if (this.fixType == "diamond") {
                let ctx = cv.ctx;
                ctx.beginPath();
                ctx.moveTo(
                    this.pos.display.x - dSize * 0.7,
                    this.pos.display.y
                );
                ctx.lineTo(this.pos.display.x, this.pos.display.y - dSize);
                ctx.lineTo(
                    this.pos.display.x + dSize * 0.7,
                    this.pos.display.y
                );
                ctx.lineTo(this.pos.display.x, this.pos.display.y + dSize);
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
            } else if (this.fixType == "star") {
                let ctx = cv.ctx;
                let x = this.pos.display.x;
                let y = this.pos.display.y;
                let s = dSize * 0.2;
                ctx.beginPath();
                ctx.moveTo(x - dSize, y);
                ctx.lineTo(x - s, y - s);
                ctx.lineTo(x, y - dSize);
                ctx.lineTo(x + s, y - s);
                ctx.lineTo(x + dSize, y);
                ctx.lineTo(x + s, y + s);
                ctx.lineTo(x, y + dSize);
                ctx.lineTo(x - s, y + s);
                ctx.closePath();
                ctx.stroke();
                ctx.fill();
            }
        }
        if (this == appData.itemSelected) {
            this.icon.changeClass("highlight");
        } else {
            this.icon.changeClass("svgDisplayObject");
        }
    }
}
class Runway {
    constructor(dispX, dispY, dispW, dispH) {
        let p = Pos2d.posFromDisplay(dispX, dispY);
        this.pos = new Pos2d(p.x, p.y);
        this.length = Pos2d.getWorldDistance(dispW) / 2;
        this.width = Pos2d.getWorldDistance(dispH) / 2;
        this.type = "runway";
        //Assign a layer
        this.layer = 1;

        //*-------create control icon
        this.icon = new svgPolygon("", appData.dispCnt.cntSVG.id);
        this.icon.addClass("svgDisplayObject");
        //create corner vertices and drag handles
        this.aIconVertices = [];
        this.aControlPoints = [];
        this.aDragHandles = [];
        for (let i = 0; i < 4; i++) {
            this.aIconVertices.push(new Pos2d());
            this.aControlPoints.push(new Pos2d());
            this.icon.addPoint();
            let c = new svgCircle("", appData.dispCnt.cntSVG.id);
            c.addClass("dragHandle");
            c.setRadius(4);
            c.type = "dragHandle";
            c.index = i;
            c.containingObject = this;
            this.aDragHandles.push(c);
        }
        //set the runway rotation
        this.heading = 90;
        this.updateVertices();

        //set initial colors
        this.weight = appData.displaySettings.rwyStrokeWeight;
        this.strokeStyle = appData.displaySettings.rwyStrokeColor;
        this.fillStyle = appData.displaySettings.rwyFillColor;

        //add to Display object array
        appData.aDisplayObjects.push(this);
        appData.itemSelected = this;
    }
    destructor() {
        this.icon.destroy();
        this.aDragHandles.forEach((item) => item.destroy());
        this.pos = null;
        this.aIconVertices = null;
        this.aControlPoints = null;
        this.aDragHandles = null;
    }
    updateVertices() {
        //update control points
        this.aControlPoints[0].update(0, this.length);
        this.aControlPoints[1].update(this.width, 0);
        this.aControlPoints[2].update(0, -this.length);
        this.aControlPoints[3].update(-this.width, 0);
        for (let i = 0; i < this.aControlPoints.length; i++) {
            let item = this.aControlPoints[i];
            item.rotate2d(-this.heading, true);
            item.increment(this.pos);
            item.updateDisplay();
            this.aDragHandles[i].locate(item.display);
        }

        this.aIconVertices[0].update(this.width, this.length);
        this.aIconVertices[1].update(this.width, -this.length);
        this.aIconVertices[2].update(-this.width, -this.length);
        this.aIconVertices[3].update(-this.width, this.length);
        this.aIconVertices.forEach((item) => {
            item.rotate2d(-this.heading, true);
            item.increment(this.pos);
            item.updateDisplay();
        });

        for (let i = 0; i < 4; i++) {
            this.aIconVertices[i].updateDisplay();
            this.icon.update(
                i,
                this.aIconVertices[i].display.x,
                this.aIconVertices[i].display.y
            );
        }
    }
    moveItem(dX, dY) {
        //console.log(details);
        this.pos.display.x += dX;
        this.pos.display.y += dY;
        this.pos.updatePosFromDisplay();
        this.updateVertices();
        //appData.itemSelected = this;
        main.triggerRedraw(true);
    }
    showDragHandles() {
        this.aDragHandles.forEach((item) => item.show());
    }
    hideDragHandles() {
        this.aDragHandles.forEach((item) => item.hide());
    }
    dragHandle(index, dX, dY) {
        //if affecting the width
        if (index == 1 || index == 3) {
            //get vector u which is the movement vector
            let u = new Vector(
                Pos2d.getWorldDistance(dX),
                Pos2d.getWorldDistance(-dY)
            );
            //get vector a which is the centreline of the runway
            let a = this.aControlPoints[index].minus(this.pos).normalize();
            //get the dot product
            let dot = u.dot(a);
            //note that norm a is 1, norm a^2 is 1.
            let projUonA = a.multiply(dot);
            let distChange = projUonA.length;
            if (index == 1) {
                this.aControlPoints[1].increment(projUonA);
                this.aIconVertices[0].increment(projUonA);
                this.aIconVertices[1].increment(projUonA);
            } else {
                this.aControlPoints[3].increment(projUonA);
                this.aIconVertices[2].increment(projUonA);
                this.aIconVertices[3].increment(projUonA);
            }
            this.width =
                this.aControlPoints[1].minus(this.aControlPoints[3]).length / 2;
            this.pos.x =
                (this.aControlPoints[1].x + this.aControlPoints[3].x) / 2;
            this.pos.y =
                (this.aControlPoints[1].y + this.aControlPoints[3].y) / 2;
            main.triggerRedraw(true);
            return;
        }
        //if dragging the runway end - can move and rotate
        let fixPt, movePt;
        if (index == 0) {
            fixPt = this.aControlPoints[2];
            movePt = this.aControlPoints[0];
        } else {
            fixPt = this.aControlPoints[0];
            movePt = this.aControlPoints[2];
        }
        //move the point according to the mouse movement
        movePt.display.x += dX;
        movePt.display.y += dY;
        movePt.updatePosFromDisplay();
        //get location of runway centre
        this.pos.x = (movePt.x + fixPt.x) / 2;
        this.pos.y = (movePt.y + fixPt.y) / 2;
        //determine the heading from those two points
        let v = this.aControlPoints[0].minus(this.aControlPoints[2]);
        this.length = v.length / 2;
        this.heading = v.heading;
        main.triggerRedraw(true);
        //console.log(Math.round(this.heading));
    }
    draw(bNeedsUpdate) {
        this.pos.updateDisplay();
        this.updateVertices();

        let cv = appData.dispCnt.canvas;
        let ctx = cv.ctx;
        cv.weight = this.weight;
        cv.strokeStyle(this.strokeStyle);
        cv.fillStyle(this.fillStyle);

        ctx.beginPath();
        ctx.moveTo(
            this.aIconVertices[0].display.x,
            this.aIconVertices[0].display.y
        );
        ctx.lineTo(
            this.aIconVertices[1].display.x,
            this.aIconVertices[1].display.y
        );
        ctx.lineTo(
            this.aIconVertices[2].display.x,
            this.aIconVertices[2].display.y
        );
        ctx.lineTo(
            this.aIconVertices[3].display.x,
            this.aIconVertices[3].display.y
        );
        ctx.closePath();
        ctx.stroke();
        ctx.fill();

        //draw centreline
        cv.weight = 1;
        cv.setDashPattern(4, 2);
        cv.drawLinePoints(
            this.aControlPoints[0].display,
            this.aControlPoints[2].display
        );
        cv.clearDashPattern();

        if (this == appData.itemSelected) {
            this.icon.changeClass("highlight");
            this.showDragHandles();
        } else {
            this.icon.changeClass("svgDisplayObject");
            this.hideDragHandles();
        }
    }
}
class Approach {
    constructor(dispX, dispY, dispW, dispH) {
        let p = Pos2d.posFromDisplay(dispX, dispY);
        this.pos = new Pos2d(p.x, p.y);
        this.length = Pos2d.getWorldDistance(dispW) / 2;
        this.width = Pos2d.getWorldDistance(dispH) / 2;
        this.type = "runway";
        //Assign a layer
        this.layer = 1;

        //*-------create control icon
        this.icon = new svgPolygon("", appData.dispCnt.cntSVG.id);
        this.icon.addClass("svgDisplayObject");
        //create corner vertices and drag handles
        this.aIconVertices = [];
        this.aControlPoints = [];
        this.aDragHandles = [];
        for (let i = 0; i < 4; i++) {
            this.aIconVertices.push(new Pos2d());
            this.aControlPoints.push(new Pos2d());
            this.icon.addPoint();
            let c = new svgCircle("", appData.dispCnt.cntSVG.id);
            c.addClass("dragHandle");
            c.setRadius(4);
            c.type = "dragHandle";
            c.index = i;
            c.containingObject = this;
            this.aDragHandles.push(c);
        }
        //set the runway rotation
        this.heading = 90;
        this.updateVertices();

        this.weight = appData.displaySettings.approachStrokeWeight;
        this.strokeStyle = appData.displaySettings.approachStrokeColor;

        //add to Display object array
        appData.aDisplayObjects.push(this);
        appData.itemSelected = this;
    }
    destructor() {
        this.icon.destroy();
        this.aDragHandles.forEach((item) => item.destroy());
        this.pos = null;
        this.aIconVertices = null;
        this.aControlPoints = null;
        this.aDragHandles = null;
    }
    updateVertices() {
        //update control points
        this.aControlPoints[0].update(0, this.length);
        this.aControlPoints[1].update(this.width, 0);
        this.aControlPoints[2].update(0, -this.length);
        this.aControlPoints[3].update(-this.width, 0);
        for (let i = 0; i < this.aControlPoints.length; i++) {
            let item = this.aControlPoints[i];
            item.rotate2d(-this.heading, true);
            item.increment(this.pos);
            item.updateDisplay();
            this.aDragHandles[i].locate(item.display);
        }

        this.aIconVertices[0].update(this.width, this.length);
        this.aIconVertices[1].update(this.width, -this.length);
        this.aIconVertices[2].update(-this.width, -this.length);
        this.aIconVertices[3].update(-this.width, this.length);
        this.aIconVertices.forEach((item) => {
            item.rotate2d(-this.heading, true);
            item.increment(this.pos);
            item.updateDisplay();
        });

        for (let i = 0; i < 4; i++) {
            this.aIconVertices[i].updateDisplay();
            this.icon.update(
                i,
                this.aIconVertices[i].display.x,
                this.aIconVertices[i].display.y
            );
        }
    }
    moveItem(dX, dY) {
        //console.log(details);
        this.pos.display.x += dX;
        this.pos.display.y += dY;
        this.pos.updatePosFromDisplay();
        this.updateVertices();
        //appData.itemSelected = this;
        main.triggerRedraw(true);
    }
    showDragHandles() {
        this.aDragHandles.forEach((item) => item.show());
    }
    hideDragHandles() {
        this.aDragHandles.forEach((item) => item.hide());
    }
    dragHandle(index, dX, dY) {
        //if affecting the width
        if (index == 1 || index == 3) {
            //get vector u which is the movement vector
            let u = new Vector(
                Pos2d.getWorldDistance(dX),
                Pos2d.getWorldDistance(-dY)
            );
            //get vector a which is the centreline of the runway
            let a = this.aControlPoints[index].minus(this.pos).normalize();
            //get the dot product
            let dot = u.dot(a);
            //note that norm a is 1, norm a^2 is 1.
            let projUonA = a.multiply(dot);
            let distChange = projUonA.length;
            if (index == 1) {
                this.aControlPoints[1].increment(projUonA);
                this.aIconVertices[0].increment(projUonA);
                this.aIconVertices[1].increment(projUonA);
            } else {
                this.aControlPoints[3].increment(projUonA);
                this.aIconVertices[2].increment(projUonA);
                this.aIconVertices[3].increment(projUonA);
            }
            this.width =
                this.aControlPoints[1].minus(this.aControlPoints[3]).length / 2;
            this.pos.x =
                (this.aControlPoints[1].x + this.aControlPoints[3].x) / 2;
            this.pos.y =
                (this.aControlPoints[1].y + this.aControlPoints[3].y) / 2;
            main.triggerRedraw(true);
            return;
        }
        //if dragging the runway end - can move and rotate
        let fixPt, movePt;
        if (index == 0) {
            fixPt = this.aControlPoints[2];
            movePt = this.aControlPoints[0];
        } else {
            fixPt = this.aControlPoints[0];
            movePt = this.aControlPoints[2];
        }
        //move the point according to the mouse movement
        movePt.display.x += dX;
        movePt.display.y += dY;
        movePt.updatePosFromDisplay();
        //get location of runway centre
        this.pos.x = (movePt.x + fixPt.x) / 2;
        this.pos.y = (movePt.y + fixPt.y) / 2;
        //determine the heading from those two points
        let v = this.aControlPoints[0].minus(this.aControlPoints[2]);
        this.length = v.length / 2;
        this.heading = v.heading;
        main.triggerRedraw(true);
        //console.log(Math.round(this.heading));
    }
    draw(bNeedsUpdate) {
        this.pos.updateDisplay();
        this.updateVertices();

        let cv = appData.dispCnt.canvas;
        let ctx = cv.ctx;
        cv.weight = this.weight;
        cv.strokeStyle(this.strokeStyle);
        //determine arrow point

        let vr1 = this.aControlPoints[0].display;
        let vr2 = this.aControlPoints[2].display;
        let v = new Point(vr1.x - vr2.x, vr1.y - vr2.y);
        v.x *= 0.1;
        v.y *= 0.1;
        let arPt = new Point(vr2.x + v.x, vr2.y + v.y);

        ctx.beginPath();
        ctx.moveTo(
            this.aControlPoints[0].display.x,
            this.aControlPoints[0].display.y
        );
        ctx.lineTo(
            this.aIconVertices[2].display.x,
            this.aIconVertices[2].display.y
        );
        ctx.lineTo(arPt.x, arPt.y);
        ctx.lineTo(
            this.aIconVertices[1].display.x,
            this.aIconVertices[1].display.y
        );
        ctx.lineTo(
            this.aControlPoints[0].display.x,
            this.aControlPoints[0].display.y
        );
        ctx.lineTo(arPt.x, arPt.y);
        ctx.closePath();
        ctx.stroke();

        if (this == appData.itemSelected) {
            this.icon.changeClass("highlight");
            this.showDragHandles();
        } else {
            this.icon.changeClass("svgDisplayObject");
            this.hideDragHandles();
        }
    }
}
