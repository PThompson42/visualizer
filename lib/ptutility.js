const EARTH_RADIUS = 3437
//---------------------------------------------------------------------------------------
//UTILITIES
//----------------------------------  Handlers
class KeyHandler {
    constructor(callback) {
        this.callback = callback
        document.addEventListener("keydown", this.handleDown.bind(this))
        document.addEventListener("keyup", this.handleUp.bind(this))
    }
    handleDown(e) {
        if (e.repeat) return
        let status = {
            action: "Down",
            key: e.key,
            keycode: e.keyCode,
            shift: e.shiftKey,
            alt: e.altKey,
            ctrl: e.ctrlKey,
        }
        this.callback(status)
    }
    handleUp(e) {
        let status = {
            action: "Up",
            key: e.key,
            keycode: e.keyCode,
            shift: e.shiftKey,
            alt: e.altKey,
            ctrl: e.ctrlKey,
        }
        this.callback(status)
    }
}
//*------------------------ GEOGRAPHY Vectors and Functions
class Geo {
    constructor(lat, long) {
        this.update(lat, long)
        return this
    }
    update(lat, long) {
        this.lat = lat !== undefined ? lat : 0
        this.long = long !== undefined ? long : 0
    }
    getDistance(g) {
        var c1, c2
        c1 = Math.sin(DTOR(this.lat)) * Math.sin(DTOR(g.lat))
        c2 =
            Math.cos(DTOR(this.lat)) *
            Math.cos(DTOR(g.lat)) *
            Math.cos(DTOR(g.long - this.long))
        return RTOD(Math.acos(c1 + c2)) * 60
    }
    getBearing(g, variation = 0) {
        var c1, c2, c3, c4, c5, tempBearing, Xlat, Xlong, Ylat, Ylong, Distance
        Distance = this.getDistance(g)
        Ylong = g.long
        Ylat = g.lat
        Xlong = this.long
        Xlat = this.lat
        c1 = Math.sin(DTOR(Ylat))
        c2 = Math.sin(DTOR(Xlat)) * Math.cos(DTOR(Distance / 60))
        c3 = Math.sin(DTOR(Distance / 60)) * Math.cos(DTOR(Xlat))
        c4 = Math.abs((c1 - c2) / c3)
        c5 = (c1 - c2) / c3
        if (c4 >= 1) c4 = 0.99999
        tempBearing = RTOD(Math.acos(c4))
        if (Xlong == Ylong && c5 < 0) tempBearing = 180
        else if (Xlong < Ylong && c5 > 0) tempBearing = tempBearing
        else if (Xlong < Ylong && c5 < 0) tempBearing = 180 - tempBearing
        else if (Xlong > Ylong && c5 < 0) tempBearing = 180 + tempBearing
        else if (Xlong > Ylong && c5 > 0) tempBearing = 360 - tempBearing
        else tempBearing = tempBearing
        if (tempBearing >= 360) tempBearing = tempBearing - 360
        if (variation) tempBearing = ConvertToMagnetic(tempBearing, variation)
        return tempBearing
    }
    getVector() {
        var Phi, theta
        //SendMessage ("This:  " + this.Lat + ", " + this.Long);
        theta = DTOR(this.long) //note west longitude is negative
        Phi = DTOR(90 - this.lat)
        return new Vector(
            EARTH_RADIUS * Math.sin(Phi) * Math.cos(theta),
            EARTH_RADIUS * Math.sin(Phi) * Math.sin(theta),
            EARTH_RADIUS * Math.cos(Phi)
        )
    }
}
class WorldLoc {
    static worldMapCenter = new Geo()
    static screenSize = new Point()
    static zoom = 100
    static screenUpdateNumber = 1
    static updateDisplayParameters(screenSz, wrldCenter, zoom) {
        WorldLoc.screenSize.x = screenSz.x
        WorldLoc.screenSize.y = screenSz.y
        WorldLoc.worldMapCenter.lat = wrldCenter.lat
        WorldLoc.worldMapCenter.long = wrldCenter.long
        WorldLoc.zoom = zoom
        WorldLoc.screenUpdateNumber++
    }
    static getGeoFromScreen(x, y) {
        const ctrX = WorldLoc.screenSize.x / 2
        const ctrY = WorldLoc.screenSize.y / 2
        const PPM = ctrY / WorldLoc.zoom

        const tY = (x - ctrX) / PPM
        const tZ = (ctrY - y) / PPM
        const temp = EARTH_RADIUS * EARTH_RADIUS - (tY * tY + tZ * tZ)
        const tX = Math.sqrt(temp)

        let v = new Vector(tX, tY, tZ)
        v.rotate3DY(WorldLoc.worldMapCenter.lat, true)
        v.rotate3DZ(WorldLoc.worldMapCenter.long, true)
        //console.log(v.getGeo());
        return v.getGeo()
    }
    static getPixelDistance(nMiles) {
        var PPM
        let ScreenCtrY = Math.round(WorldLoc.screenSize.y / 2)
        PPM = ScreenCtrY / WorldLoc.zoom //Pixels Per Mile
        return PPM * nMiles
    }
    static getActualDistanceFromPixels(pixels) {
        var PPM
        let ScreenCtrY = Math.round(WorldLoc.screenSize.y / 2)
        PPM = ScreenCtrY / WorldLoc.zoom //Pixels Per Mile
        return pixels / PPM
    }
    constructor() {
        //console.log(arguments.length);
        if (arguments.length == 2) {
            this.G = new Geo(arguments[0], arguments[1])
            this.V = this.G.getVector()
        } else if (arguments.length == 3) {
            this.V = new Vector(arguments[0], arguments[1], arguments[2])
            this.G = this.V.getGeo()
        } else if (arguments.length == 0) {
            this.V = new Vector(0, 0, 0)
            this.G = new Geo(0, 0)
        } else {
            console.error("wrong number of arguments in WorldLoc Constructor")
            console.log(arguments)
        }

        this.D = new Vector()
        this.lastUpdate = WorldLoc.screenUpdateNumber - 1
        this.bAlwaysUpdate = false
        return this
    }
    setAlwaysUpdate(bVal) {
        this.bAlwaysUpdate = bVal
        return this
    }
    update(lat, long) {
        this.G.update(lat, long)
        this.V = this.G.getVector()
        this.lastUpdate = WorldLoc.screenUpdateNumber - 1
    }
    updateVector3d(v) {
        //console.log(v);
        this.V = new Vector(v.x, v.y, v.z)
    }
    updateDisplay() {
        if (
            this.lastUpdate === WorldLoc.screenUpdateNumber &&
            !this.bAlwaysUpdate
        ) {
            return this.D
        }
        const ctrX = WorldLoc.screenSize.x / 2
        const ctrY = WorldLoc.screenSize.y / 2

        const PPM = ctrY / WorldLoc.zoom

        let mVector = this.V.copy()
        mVector.rotate3DZ(-WorldLoc.worldMapCenter.long, true)
        mVector.rotate3DY(-WorldLoc.worldMapCenter.lat, true)
        this.D.update(mVector.y * PPM + ctrX, ctrY - mVector.z * PPM)
        this.lastUpdate = WorldLoc.screenUpdateNumber
        return this.D
    }
    getBearingTo(v) {
        //this.lastUpdate = WorldLoc.screenUpdateNumber - 1;
        const pVector = this.V.newPositionFromVector(v, 1).getGeo()
        return this.G.getBearing(pVector)
    }
    VectorFromBearing(bearing, degrees = true) {
        var pSource = this.G
        if (degrees) bearing = DTOR(bearing)
        //console.log('theta=' + theta);
        var dest = new WorldLoc(
            this.G.lat - Math.cos(bearing),
            this.G.long - Math.sin(bearing) / Math.cos(DTOR(this.G.lat))
        )

        return this.V.minus(dest.V).norm
    }
    fixLength() {
        this.V.normalize().scale(EARTH_RADIUS)
    }
}
function getDisplayFromLatLong(lat, long) {
    const ctrX = WorldLoc.screenSize.x / 2
    const ctrY = WorldLoc.screenSize.y / 2
    const PPM = ctrY / WorldLoc.zoom
    let mVector = new Geo(lat, long).getVector()
    //console.log(mVector);
    mVector.rotate3DZ(-WorldLoc.worldMapCenter.long, true)
    mVector.rotate3DY(-WorldLoc.worldMapCenter.lat, true)

    return new Vector(
        Math.round(mVector.y * PPM) + ctrX,
        ctrY - Math.round(mVector.z * PPM)
    )
}
function ConvertToTrue(MagBearing, variation) {
    var TrueBearing = MagBearing - variation
    if (TrueBearing < 0) TrueBearing += 360
    if (TrueBearing > 360) TrueBearing -= 360
    return TrueBearing
}
function ConvertToMagnetic(TrueBearing, variation) {
    var MagBearing = TrueBearing + variation
    if (MagBearing < 0) MagBearing += 360
    if (MagBearing > 360) MagBearing -= 360
    return MagBearing
}
//---------------------------------- COLORS
class ApplicationColors {
    constructor() {
        this.WHITE = "#ffffff"
        this.BLACK = "#000000"

        this.BLACKISH = "#202020"
        this.DARKGREY = "#3f3f3f"
        this.MEDIUMGREY = "#707070"
        this.EGGYELLOW = "#FFDF6C"

        //nav color constants
        this.NLIGHTBLUE = "#00a6dc"
        this.NLIGHTBLUE2 = "#64c3e8"
        this.NLIGHTBLUE3 = "#b1ddf2"
        this.NMEDIUMBLUE = "#006eb0"
        this.NMEDIUMBLUE2 = "#6798ca"
        this.NMEDIUMBLUE3 = "#abc2e1"
        this.NDARKBLUE = "#00529c"
        this.NDARKBLUE2 = "#6781ba"
        this.NDARKBLUE3 = "#a8b4d8"
        this.NLIGHTGREY = "#999fa8"
        this.NLIGHTGREY2 = "#bdc1c9"
        this.NLIGHTGREY3 = "#dadce1"
        this.NDARKGREY = "#474d56"
        this.NDARKGREY2 = "#888d97"
        this.NDARKGREY3 = "#bdc1c9"
        this.NTEAL = "#1faa92"
        this.NTEAL2 = "#86c6b7"
        this.NTEAL3 = "#bfdfd7"
        this.NGREEN = "#7bc466"
        this.NGREEN2 = "#b0d89f"
        this.NGREEN3 = "#d5eacc"
        this.NYELLOW = "#fcb334"
        this.NYELLOW2 = "#ffd086"
        this.NYELLOW3 = "#ffe5be"
        this.NORANGE = "#f4793b"
        this.NORANGE2 = "#f9ab7f"
        this.NORANGE3 = "#fdd2b8"
        this.NRED = "#ed1c24"
        this.NRED2 = "#f58466"
        this.NRED3 = "#fbbea7"
        this.NPINK = "#d6186e"
        this.NPINK2 = "#e382a7"
        this.NPINK3 = "#eebcc8"
        this.NPURPLE = "#715da3"
        this.NPURPLE2 = "#9e8fc0"
        this.NPURPLE3 = "#c7bfdc"
    }
}
function getMedianColor(color1, color2, lowVal, highVal, actualVal) {
    let ratio = (actualVal - lowVal) / (highVal - lowVal)
    if (actualVal < lowVal) {
        return color1
    }
    if (actualVal > highVal) {
        return color2
    }
    color1 = color1.substr(1)
    color2 = color2.substr(1)

    let r = Math.ceil(
        parseInt(color2.substring(0, 2), 16) * ratio +
            parseInt(color1.substring(0, 2), 16) * (1 - ratio)
    )
    let g = Math.ceil(
        parseInt(color2.substring(2, 4), 16) * ratio +
            parseInt(color1.substring(2, 4), 16) * (1 - ratio)
    )
    let b = Math.ceil(
        parseInt(color2.substring(4, 6), 16) * ratio +
            parseInt(color1.substring(4, 6), 16) * (1 - ratio)
    )

    if (Number.isNaN(r)) console.log(ratio, actualVal, color1, color2)
    return "#" + HEX(r) + HEX(g) + HEX(b)
}
//*                             UTILITIES & MATH
//*------------------------       5. RANDOM Functions
function random() {
    return Math.random()
}
function randomInt(val) {
    return Math.floor(Math.random() * val)
}
function randomFloat(val) {
    return Math.random() * val
}
function getRandomIntegerFrom(a, b) {
    //returns a random between a and b including a and b
    let r = Math.floor(Math.random() * (b + 1 - a))
    return a + r
}
function coinflip() {
    if (Math.random() < 0.5) {
        return true
    } else {
        return false
    }
}
function random2d() {
    let v = new Vector(Math.random() - 0.5, Math.random() - 0.5)
    v.normalize()
    return v
}
function randomVector() {
    let v = new Vector(randomFloat(2) - 1, randomFloat(2) - 1)
    v.normalize()
    return v
}
//*------------------------    HEX/BINARY Functions
const HEX = (x) => {
    x = x.toString(16)
    if (x.length === 3) x = "FF"
    return x.length === 1 ? "0" + x : x
}
function Dec2Hex(num, len = 2) {
    let s = num.toString(16)
    //console.log(s);
    while (s.length < len) s = "0" + s
    return s
}
function Hex2Dec(str) {
    return parseInt(str, 16)
}
function Hex2Bin(hex) {
    return parseInt(hex, 16).toString(2).padStart(8, "0")
}
function parseColorString(str) {
    //expects either #000000 or #00000000
    //return r,g,b,opacity in two color hex
    if (str.length == 7) {
        return {
            r: str.substring(1, 3),
            g: str.substring(3, 5),
            b: str.substring(5),
            o: "FF",
        }
    } else if (str.length == 9) {
        return {
            r: str.substring(1, 3),
            g: str.substring(3, 5),
            b: str.substring(5, 7),
            o: str.substring(7),
        }
    } else {
        return "ERROR"
    }
}
//*------------------------  SIMPLEMATH Functions
function isBetween(a, b, testVal) {
    if (testVal < a && testVal < b) return false
    if (testVal > a && testVal > b) return false
    return true
}
function constrain(val, low, high) {
    if (val < low) return low
    else if (val > high) return high
    else return val
}
function floor(val) {
    return Math.floor(val)
}
function ceil(val) {
    return Math.ceil(val)
}
function round(val) {
    return Math.round(val)
}
function fMap(sourceValue, sourceBottom, sourceTop, targetLoVal, targetHiVal) {
    //
    let nProportion = (sourceValue - sourceBottom) / (sourceTop - sourceBottom)
    return nProportion * (targetHiVal - targetLoVal) + targetLoVal //targetValue
}
const DTOR = (Degrees) => (Degrees * Math.PI) / 180
const RTOD = (Radians) => Radians * (180 / Math.PI)
const ROUND = (n, numdigits) =>
    Math.round(n * Math.pow(10, numdigits)) / Math.pow(10, numdigits)
//*------------------------  STATISTICS Functions
function MEAN(data) {
    let total = 0
    for (let i = 0; i < data.length; i++) {
        total += data[i]
    }
    return total / data.length
}
function MSTDEV(data) {
    let mean = MEAN(data)
    let pSum = 0
    for (let i = 0; i < data.length; i++) {
        pSum += Math.pow(mean - data[i], 2)
    }
    return { mean: mean, stdev: Math.sqrt(pSum / data.length) }
}
//*------------------------1 QUADTREE Functions
class Rectangle {
    constructor(x, y, w, h) {
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.left = x - w / 2
        this.right = x + w / 2
        this.top = y - h / 2
        this.bottom = y + h / 2
    }
    contains(point) {
        return (
            this.left <= point.x &&
            point.x <= this.right &&
            this.top <= point.y &&
            point.y <= this.bottom
        )
    }
    intersects(range) {
        return !(
            this.right < range.left ||
            range.right < this.left ||
            this.bottom < range.top ||
            range.bottom < this.top
        )
    }
    subdivide(quadrant) {
        switch (quadrant) {
            case "ne":
                return new Rectangle(
                    this.x + this.w / 4,
                    this.y - this.h / 4,
                    this.w / 2,
                    this.h / 2
                )
            case "nw":
                return new Rectangle(
                    this.x - this.w / 4,
                    this.y - this.h / 4,
                    this.w / 2,
                    this.h / 2
                )
            case "se":
                return new Rectangle(
                    this.x + this.w / 4,
                    this.y + this.h / 4,
                    this.w / 2,
                    this.h / 2
                )
            case "sw":
                return new Rectangle(
                    this.x - this.w / 4,
                    this.y + this.h / 4,
                    this.w / 2,
                    this.h / 2
                )
        }
    }
    xDistanceFrom(point) {
        if (this.left <= point.x && point.x <= this.right) {
            return 0
        }

        return Math.min(
            Math.abs(point.x - this.left),
            Math.abs(point.x - this.right)
        )
    }
    yDistanceFrom(point) {
        if (this.top <= point.y && point.y <= this.bottom) {
            return 0
        }

        return Math.min(
            Math.abs(point.y - this.top),
            Math.abs(point.y - this.bottom)
        )
    }
    // Skips Math.sqrt for faster comparisons
    sqDistanceFrom(point) {
        const dx = this.xDistanceFrom(point)
        const dy = this.yDistanceFrom(point)

        return dx * dx + dy * dy
    }
    // Pythagorus: a^2 = b^2 + c^2
    distanceFrom(point) {
        return Math.sqrt(this.sqDistanceFrom(point))
    }
}
class Circle {
    constructor(x, y, r) {
        this.x = x
        this.y = y
        this.r = r
        this.rSquared = this.r * this.r
    }

    contains(point) {
        // check if the point is in the circle by checking if the euclidean distance of
        // the point and the center of the circle if smaller or equal to the radius of
        // the circle
        let d = Math.pow(point.x - this.x, 2) + Math.pow(point.y - this.y, 2)
        return d <= this.rSquared
    }

    intersects(range) {
        let xDist = Math.abs(range.x - this.x)
        let yDist = Math.abs(range.y - this.y)

        // radius of the circle
        let r = this.r

        let w = range.w / 2
        let h = range.h / 2

        let edges = Math.pow(xDist - w, 2) + Math.pow(yDist - h, 2)

        // no intersection
        if (xDist > r + w || yDist > r + h) return false

        // intersection within the circle
        if (xDist <= w || yDist <= h) return true

        // intersection on the edge of the circle
        return edges <= this.rSquared
    }
}
//*------------------------ GRAPHING/GEOMETRY Functions
function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    // Check x and y for overlap
    if (x2 > w1 + x1 || x1 > w2 + x2 || y2 > h1 + y1 || y1 > h2 + y2) {
        return false
    }
    return true
}
function isPointInPoly(poly, pt) {
    //Algorithm/function from:
    //+ Jonas Raoni Soares Silva
    //@ http://jsfromhell.com/math/is-point-in-poly [rev. #0]
    for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i].D.y <= pt.y && pt.y < poly[j].D.y) ||
            (poly[j].D.y <= pt.y && pt.y < poly[i].D.y)) &&
            pt.x <
                ((poly[j].D.x - poly[i].D.x) * (pt.y - poly[i].D.y)) /
                    (poly[j].D.y - poly[i].D.y) +
                    poly[i].D.x &&
            (c = !c)
    return c
}
function trajectoryIntersect(p, v, q, w) {
    //p is position of object P, v is it's vector
    //q is position of object Q, w is its vector
    //all vector 2d's
    let r0 = p.minus(q)
    let rv = v.minus(w)
    //following is the time at which the distance between them is at a minimum.  //determined by taking derivative of distance equation
    let t = -(r0.x * rv.x + r0.y * rv.y) / (rv.x * rv.x + rv.y * rv.y)
    //console.log(t);
    //so determine the distance apart at time t.
    let p2 = p.plus(v.multiply(t))
    let q2 = q.plus(w.multiply(t))
    let dist = p2.distanceFrom(q2)
    //console.log('time: ' + t + '   @Dist: ' + dist);
    return { time: t, dist: dist }
}

function lineIntersection(p1, p2, p3, p4) {
    // Compute the coefficients of the equations of the two lines
    const A1 = p2.y - p1.y
    const B1 = p1.x - p2.x
    const C1 = A1 * p1.x + B1 * p1.y

    const A2 = p4.y - p3.y
    const B2 = p3.x - p4.x
    const C2 = A2 * p3.x + B2 * p3.y

    // Compute the determinant of the coefficients to check for parallel lines
    const det = A1 * B2 - A2 * B1

    // Check if the lines are parallel, coincident, or intersecting
    if (det === 0) {
        // Check if the lines are coincident
        if (A1 * p3.x + B1 * p3.y - C1 === 0) {
            return "coincident" // lines are coincident
        } else {
            return null // lines are parallel but not coincident
        }
    } else {
        // Compute the intersection point
        const x = (B2 * C1 - B1 * C2) / det
        const y = (A1 * C2 - A2 * C1) / det
        return new Point(x, y)
    }
}

//*------------------------ TEXT Functions
function removeBreaks(s) {
    return s.replace(/(\r\n|\n|\r)/gm, "")
}
function splitAndTrim(str, char) {
    //takes a string, splits it by char into array and strips of blanks from each element
    let elements = str.split(char)
    for (let i = 0; i < elements.length; i++) {
        elements[i] = elements[i].trim()
    }
    return elements
}
//*------------------------ MISC Functions
function UrlExists(url) {
    var xhr = new XMLHttpRequest()
    xhr.open("HEAD", url, false)
    xhr.send()

    if (xhr.status == "404") {
        return false
    } else {
        return true
    }
}
