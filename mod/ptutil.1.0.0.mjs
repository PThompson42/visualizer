//* ptutil.js VERSION 1.0.0
// 1.0.0 - original varsion.  Based on jrad2
//*------------------------------------------
const EARTH_RADIUS = 3437

//*------------------------ GEOGRAPHY Vectors and Functions
export class KeyHandler {
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

//*------------------------    RANDOM Functions
export function random() {
    return Math.random()
}
export function randomInt(val) {
    return Math.floor(Math.random() * val)
}
export function randomFloat(val) {
    return Math.random() * val
}
export function getRandomIntegerFrom(a, b) {
    //returns a random between a and b including a and b
    let r = Math.floor(Math.random() * (b + 1 - a))
    return a + r
}
export function coinflip() {
    if (Math.random() < 0.5) {
        return true
    } else {
        return false
    }
}

//*------------------------ GEOGRAPHY Functions
export function ConvertToTrue(MagBearing, variation) {
    var TrueBearing = MagBearing - variation
    if (TrueBearing < 0) TrueBearing += 360
    if (TrueBearing > 360) TrueBearing -= 360
    return TrueBearing
}
export function ConvertToMagnetic(TrueBearing, variation) {
    var MagBearing = TrueBearing + variation
    if (MagBearing < 0) MagBearing += 360
    if (MagBearing > 360) MagBearing -= 360
    return MagBearing
}

//*------------------------ TEXT Functions
export function removeBreaks(s) {
    return s.replace(/(\r\n|\n|\r)/gm, "")
}
export function splitAndTrim(str, char) {
    //takes a string, splits it by char into array and strips of blanks from each element
    let elements = str.split(char)
    for (let i = 0; i < elements.length; i++) {
        elements[i] = elements[i].trim()
    }
    return elements
}
//*------------------------ MISC Functions
export function UrlExists(url) {
    var xhr = new XMLHttpRequest()
    xhr.open("HEAD", url, false)
    xhr.send()

    if (xhr.status == "404") {
        return false
    } else {
        return true
    }
}
//*------------------------  COLORS    Functions
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
