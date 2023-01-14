class Fix {
    static fixNumber = 0;
    constructor(img, dispX, dispY) {
        let p = Pos2d.posFromDisplay(dispX, dispY);
        this.pos = new Pos2d(p.x, p.y);
        this.img = img;
        this.w = appData.displaySettings.baseFixSize / 2;
        this.h = appData.displaySettings.baseFixSize / 2;
        this.bOverrideSize = false;
        //*-------create control icon
        this.icon = new svgPolygon("", appData.dispCnt.cntSVG.id);
        this.type = "fix";
        this.icon.addClass("svgFix");
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
        main.triggerRedraw(false);
    }
    draw(bNeedsUpdate) {
        if (bNeedsUpdate) {
            this.pos.updateDisplay();
            this.updateVertices();
        }
        let cv = appData.dispCnt.canvas;
        //draw the image on the canvas
        let dSize = Pos2d.getDisplayDistance(this.w);
        cv.ctx.drawImage(
            this.img,
            this.pos.display.x - dSize,
            this.pos.display.y - dSize,
            dSize * 2,
            dSize * 2
        );
        if (this == appData.itemSelected) {
            cv.strokeStyle("red");
            cv.weight = 3;
            cv.setDashPattern(2, 4);
            cv.rectangle(
                this.pos.display.x,
                this.pos.display.y,
                dSize * 2 + 3,
                dSize * 2 + 3
            );
            cv.clearDashPattern();
        }
    }
}
class Runway {
    constructor() {}
}
