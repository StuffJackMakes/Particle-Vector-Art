// This class handles controlling the start position of particles in a simulation

// Third-party libraries
const Victor = require("victor");
const lerp = require("lerp");

// Custom libraries
const constants = require("../constants");
const Controller = require("./controller");

module.exports = class PositionController extends Controller {
    constructor (Util, runProperties) {
        super(Util, runProperties);

        // Values specific to individual control functions
        this.noiseOffset = 1; // Offset to avoid duplicate noise values of other controllers
        this.xNoiseOffset = this.noiseOffset * this.canvasWidth;
        this.yNoiseOffset = this.noiseOffset * this.canvasHeight;
        this.noiseDivisor = 1;
        this.counter = 0;
        this.radiusScale = this.Util.RandomRange(5, this.canvasMinDim / 20);
        this.spiralAngle = this.Util.RandomRange(1, 180);
        this.angleStart = Math.random() * 360
        this.fixedPointX = this.Util.RandomRangeInt(0, this.canvasWidth);
        this.fixedPointY = this.Util.RandomRangeInt(0, this.canvasHeight);

        // The control function is the means by which this controller modified a particle
        this.controlFunctions = [this.Center, this.Point, this.Noise, this.Spiral, this.TimeMux];
        this.controlFunctionsNoMux = [this.Center, this.Point, this.Noise, this.Spiral];

        this.RandomizeControl();

        this.savableProperties.splice(this.savableProperties.indexOf("heightmapChannel"), 1);
        this.savableProperties.push("radiusScale", "spiralAngle", "fixedPointX", "fixedPointY");
    }

    // Position functions return a Victor that is a position within the canvas
    Center () {
        return new Victor(this.canvasWidth / 2, this.canvasHeight / 2);
    }
    Noise () {
        let x = ((this.Util.noise3D(this.canvasWidth * this.xNoiseOffset, 0, this.t) + 1) / 2) * this.canvasWidth
        x = this.Util.clampInt(x, 0, this.canvasWidth);
        let y = ((this.Util.noise3D(0, this.canvasHeight * this.yNoiseOffset, -this.t) + 1) / 2) * this.canvasHeight
        y = this.Util.clampInt(y, 0, this.canvasHeight);
        return new Victor(x, y);
    }
    Random () {
        return new Victor(this.Util.RandomRange(0, this.canvasWidth), this.Util.RandomRange(0, this.canvasHeight));
    }
    Point () {
        return new Victor(this.fixedPointX, this.fixedPointY);
    }
    Spiral () {
        let angle = (this.angleStart + (this.counter * this.spiralAngle)) * (Math.PI / 180);
        let radius = this.radiusScale * Math.sqrt(this.counter);
        this.counter++;
        let position = new Victor((this.canvasWidth / 2) + (radius * Math.cos(angle)), (this.canvasWidth / 2) + (radius * Math.sin(angle)));
        if (position.x < -(this.canvasWidth * 0.1) || position.x > this.canvasWidth * 1.1 || position.y < -(this.canvasHeight * 0.1) || position.y > this.canvasHeight * 1.1) {
            this.counter = 0;
            return this.Spiral();
        }
        return position
    }
    TimeMux (particle, functionA, functionB) {
        let resultA = functionA(particle);
        let resultB = functionB(particle);
        return this.Util.easeVector(resultA, resultB, this.t / this.totalSteps);
    }
}
