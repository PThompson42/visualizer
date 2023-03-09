//* ptmath.js VERSION 1.0.1
// 1.0.0 - original varsion.  Based on jrad2
// 1.0.1 - added fScale function (same as fMap but different order of inputs)
//*------------------------------------------ VECTOR
const EARTH_RADIUS = 3437
export class Point {
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
export class Vector {
    static get2DVectorFromBearing(brg, bDegrees = true) {
        if (bDegrees) brg = DTOR(brg)
        return new Vector(Math.sin(brg), -Math.cos(brg))
    }
    static vectorFromHeading(hdg, bDegrees = true) {
        if (bDegrees) hdg = DTOR(hdg)
        return new Vector(Math.sin(hdg), Math.cos(hdg))
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
export class Pos2d extends Vector {
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
    static pan(x, y) {
        Pos2d.viewCenter.x += x
        Pos2d.viewCenter.y += y
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
    static newFromDisplay(dX, dY) {
        let pX = Pos2d.viewCenter.x + (dX - Pos2d.screenCenter.x) / Pos2d.zoom
        let pY =
            -1 * ((dY - Pos2d.screenCenter.y) / Pos2d.zoom - Pos2d.viewCenter.y)
        return new Pos2d(pX, pY)
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
    copy() {
        return new Pos2d(...this.vector)
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
        //this.lastUpdate = Pos2d.screenUpdateNumber
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
export class Geo {
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
export class WorldLoc {
    static worldMapCenter = new Geo()
    static screenSize = new Point()

    static viewWidth = 100 //
    static maxViewWidth = null
    static screenUpdateNumber = 1
    static updateDisplayParameters() {
        //calculate the extents of the screen
        WorldLoc.topLeft = WorldLoc.getGeoFromScreen(0, 0)
        WorldLoc.bottomRight = WorldLoc.getGeoFromScreen(
            WorldLoc.screenSize.x,
            WorldLoc.screenSize.y
        )
        //console.log(WorldLoc.topLeft)

        WorldLoc.screenUpdateNumber++
    }
    static updateScreenSize(w, h) {
        WorldLoc.screenSize.x = w
        WorldLoc.screenSize.y = h
        WorldLoc.updateDisplayParameters()
    }
    static updateViewWidth(val) {
        if (WorldLoc.maxViewWidth && val > WorldLoc.maxViewWidth) {
            WorldLoc.viewWidth = WorldLoc.maxViewWidth
        } else {
            WorldLoc.viewWidth = val
        }
        WorldLoc.updateDisplayParameters()
    }
    static updateWorldMapCenter(dLat, dLong) {
        WorldLoc.worldMapCenter.lat += dLat
        WorldLoc.worldMapCenter.long += dLong
        if (WorldLoc.worldMapCenter.lat < -90) {
            WorldLoc.worldMapCenter.lat = -90
        }
        if (WorldLoc.worldMapCenter.lat > 90) {
            WorldLoc.worldMapCenter.lat = 90
        }
        if (WorldLoc.worldMapCenter.long < -180) {
            WorldLoc.worldMapCenter.long = -180
        }
        if (WorldLoc.worldMapCenter.long > 180) {
            WorldLoc.worldMapCenter.long = 180
        }
        WorldLoc.updateDisplayParameters()
    }
    static getGeoFromScreen(x, y) {
        const ctrX = WorldLoc.screenSize.x / 2
        const ctrY = WorldLoc.screenSize.y / 2
        const PPM = WorldLoc.getPPM()

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
    static newFromDisplay(x, y) {
        let p = WorldLoc.getGeoFromScreen(x, y)
        return new WorldLoc(p.lat, p.long)
    }
    static getDisplayCorners() {
        //let topleft = WorldLoc
    }
    static getPixelDistance(nMiles) {
        const PPM = WorldLoc.getPPM()
        return PPM * nMiles
    }
    static getActualDistanceFromPixels(pixels) {
        let ScreenCtrY = Math.round(WorldLoc.screenSize.y / 2)
        const PPM = WorldLoc.getPPM()
        return pixels / PPM
    }
    static setMaxViewWidth(v) {
        WorldLoc.maxViewWidth = v
    }
    static zoomIn(mult = 1.01) {
        WorldLoc.updateViewWidth((WorldLoc.viewWidth *= mult))
    }
    static zoomOut(mult = 0.99) {
        WorldLoc.updateViewWidth((WorldLoc.viewWidth *= mult))
    }
    static pan(x, y) {
        WorldLoc.worldMapCenter.lat += y
        WorldLoc.worldMapCenter.long += x
        if (WorldLoc.worldMapCenter.lat < -90) {
            WorldLoc.worldMapCenter.lat = -90
        }
        if (WorldLoc.worldMapCenter.lat > 90) {
            WorldLoc.worldMapCenter.lat = 90
        }
        if (WorldLoc.worldMapCenter.long < -180) {
            WorldLoc.worldMapCenter.long = -180
        }
        if (WorldLoc.worldMapCenter.long > 180) {
            WorldLoc.worldMapCenter.long = 180
        }
    }
    static getPPM() {
        return WorldLoc.screenSize.x / WorldLoc.viewWidth
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
    updateDisplay() {
        if (
            this.lastUpdate === WorldLoc.screenUpdateNumber &&
            !this.bAlwaysUpdate
        ) {
            return this.D
        }
        const ctrX = WorldLoc.screenSize.x / 2
        const ctrY = WorldLoc.screenSize.y / 2

        let PPM = WorldLoc.getPPM()

        let mVector = this.V.copy()
        mVector.rotate3DZ(-WorldLoc.worldMapCenter.long, true)
        mVector.rotate3DY(-WorldLoc.worldMapCenter.lat, true)
        this.D.update(mVector.y * PPM + ctrX, ctrY - mVector.z * PPM)
        this.lastUpdate = WorldLoc.screenUpdateNumber
        return this.D
    }
    updateFromDisplay() {
        let g = WorldLoc.getGeoFromScreen(this.D.x, this.D.y)
        this.update(g.lat, g.long)
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
}
export function getDisplayFromLatLong(lat, long) {
    const ctrX = WorldLoc.screenSize.x / 2
    const ctrY = WorldLoc.screenSize.y / 2
    const PPM = WorldLoc.getPPM()

    let mVector = new Geo(lat, long).getVector()
    //console.log(mVector);
    mVector.rotate3DZ(-WorldLoc.worldMapCenter.long, true)
    mVector.rotate3DY(-WorldLoc.worldMapCenter.lat, true)

    return new Vector(
        Math.round(mVector.y * PPM) + ctrX,
        ctrY - Math.round(mVector.z * PPM)
    )
}
export function random2dVector() {
    let v = new Vector(Math.random() - 0.5, Math.random() - 0.5)
    v.normalize()
    return v
}

export class Range {
    constructor(lo, hi) {
        this.update(lo, hi)
    }
    update(lo, hi) {
        this.lo = lo !== undefined ? lo : 0
        this.hi = hi !== undefined ? hi : 0
        this.delta = this.hi - this.lo
    }
}
//*------------------------    HEX/BINARY Functions
export const HEX = (x) => {
    x = x.toString(16)
    if (x.length === 3) x = "FF"
    return x.length === 1 ? "0" + x : x
}
export function Dec2Hex(num, len = 2) {
    let s = num.toString(16)
    //console.log(s);
    while (s.length < len) s = "0" + s
    return s
}
export function Hex2Dec(str) {
    return parseInt(str, 16)
}
export function Hex2Bin(hex) {
    return parseInt(hex, 16).toString(2).padStart(8, "0")
}
export function parseColorString(str) {
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
export function isBetween(a, b, testVal) {
    if (testVal < a && testVal < b) return false
    if (testVal > a && testVal > b) return false
    return true
}
export function constrain(val, low, high) {
    if (val < low) return low
    else if (val > high) return high
    else return val
}
export function floor(val) {
    return Math.floor(val)
}
export function ceil(val) {
    return Math.ceil(val)
}
export function round(val) {
    return Math.round(val)
}
function fMap(sourceValue, sourceBottom, sourceTop, targetLoVal, targetHiVal) {
    //
    let nProportion = (sourceValue - sourceBottom) / (sourceTop - sourceBottom)
    return nProportion * (targetHiVal - targetLoVal) + targetLoVal //targetValue
}
export function fScale(srcBottom, srcTop, srcVal, targetBottom, targetTop) {
    let nProportion = (srcVal - srcBottom) / (srcTop - srcBottom)
    return nProportion * (targetTop - targetBottom) + targetBottom //targetValue
}
export const DTOR = (Degrees) => (Degrees * Math.PI) / 180
export const RTOD = (Radians) => Radians * (180 / Math.PI)
export const ROUND = (n, numdigits) =>
    Math.round(n * Math.pow(10, numdigits)) / Math.pow(10, numdigits)
//*------------------------  STATISTICS Functions
export function MEAN(data) {
    let total = 0
    for (let i = 0; i < data.length; i++) {
        total += data[i]
    }
    return total / data.length
}
export function MSTDEV(data) {
    let mean = MEAN(data)
    let pSum = 0
    for (let i = 0; i < data.length; i++) {
        pSum += Math.pow(mean - data[i], 2)
    }
    return { mean: mean, stdev: Math.sqrt(pSum / data.length) }
}

//*------------------------ GRAPHING/GEOMETRY Functions
export function rectIntersect(x1, y1, w1, h1, x2, y2, w2, h2) {
    // Check x and y for overlap
    if (x2 > w1 + x1 || x1 > w2 + x2 || y2 > h1 + y1 || y1 > h2 + y2) {
        return false
    }
    return true
}
export function isPointInPoly(poly, pt) {
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
export function trajectoryIntersect(p, v, q, w) {
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

export function lineIntersection(p1, p2, p3, p4) {
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
