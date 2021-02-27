// This file contains a helper utility class

// Third-party libraries
const fs = require("fs");
const path = require("path");
const Lerp = require("lerp");
const { createCanvas, loadImage } = require("canvas");
const OpenSimplexNoise = require("open-simplex-noise");
const Victor = require("victor");
const eases = require("eases");

// Custom libraries
const palettes = require('./color-palettes.json');
const constants = require('./constants.js');

module.exports = class Utilities {
    constructor () {
        this.noiseType = constants.NOISE_TYPE_SIMPLEX;
        this.easingFunctions = [eases.linear,
            eases.backInOut, eases.backIn, eases.backOut,
            eases.bounceInOut, eases.bounceIn, eases.bounceOut,
            eases.circInOut, eases.circIn, eases.circOut,
            eases.cubicInOut, eases.cubicIn, eases.cubicOut,
            eases.elasticInOut, eases.elasticIn, eases.elasticOut,
            eases.expoInOut, eases.expoIn, eases.expoOut,
            eases.quadInOut, eases.quadIn, eases.quadOut,
            eases.quartInOut, eases.quartIn, eases.quartOut,
            eases.quintInOut, eases.quintIn, eases.quintOut,
            eases.sineInOut, eases.sineIn, eases.sineOut];
        this.currentEasingFunction = 0;
        this.xNoiseScale = 0.015;
        this.yNoiseScale = 0.015;
        this.noiseTimeScale = 0.001;
        this.noiseFieldScale = 1;

        this.seed = Date.now();
        this.simplex = new OpenSimplexNoise.default(this.seed);
    }



    // Utility Property Functions
    RandomizeProperties() {
        this.noiseType = this.RandomFromList([constants.NOISE_TYPE_SIMPLEX, constants.NOISE_TYPE_BROWNIAN, constants.NOISE_TYPE_RANDOM]);
        this.randomizeEasingFunction();
        this.xNoiseScale = this.RandomRange(0.1, 0.0001);
        this.yNoiseScale = this.RandomRange(0.1, 0.0001);
        this.noiseTimeScale = this.RandomRange(0.1, 0.0001);
        this.noiseFieldScale = this.RandomRangeInt(1, 50);
    }
    GetProperties() {
        return {
            noiseType: this.noiseType,
            easingFunction: this.currentEasingFunction,
            xNoiseScale: this.xNoiseScale,
            yNoiseScale: this.yNoiseScale,
            noiseTimeScale: this.noiseTimeScale,
            noiseFieldScale: this.noiseFieldScale,
            seed: this.seed
        }
    }
    SetProperties(properties, scale) {
        if (!scale) { scale = 1; }
        if ("noiseType" in properties) this.noiseType = properties.noiseType;
        if ("currentEasingFunction" in properties) this.currentEasingFunction = properties.currentEasingFunction;
        if ("xNoiseScale" in properties) this.xNoiseScale = properties.xNoiseScale * scale;
        if ("yNoiseScale" in properties) this.yNoiseScale = properties.yNoiseScale * scale;
        if ("noiseTimeScale" in properties) this.noiseTimeScale = properties.noiseTimeScale * scale;
        if ("noiseFieldScale" in properties) this.noiseFieldScale = properties.noiseFieldScale * scale;
        if ("seed" in properties) {
            this.seed = properties.seed;
            this.simplex = new OpenSimplexNoise.default(this.seed);
        }
    }



    // Color Functions
    RandomPalette () { return palettes[Math.floor(Math.random() * palettes.length)] }
    /*
    RandomMaybeNewPalette () {
        if (Math.random() >= 0.9) {
            return this.GenerateRandomPalette(this.RandomRangeInt(3, 8));
        } else {
            return this.RandomPalette();
        }
    }
    */
    GenerateRandomPalette (size) {
        let palette = [];
        for (let i = 0; i < size; i++) {
            palette.push(this.RandomColor());
        }
        return palette;
    }
    RandomColor () { return '#' + Math.floor(Math.random() * 16777215).toString(16); }
    RandomColorFromPalette (palette) { return palette[Math.floor(Math.random() * palette.length)]; }
    NumberLerp(a, b, amount) {
        return Lerp(a, b, amount);
    }
    ColorLerp (colorA, colorB, amount) {
        let a = colorA.slice(1);
        let b = colorB.slice(1);
        let ar = a.slice(0, 2);
        let ag = a.slice(2, 4);
        let ab = a.slice(4, 6);
        let br = b.slice(0, 2);
        let bg = b.slice(2, 4);
        let bb = b.slice(4, 6);
        let fr = Lerp(parseInt(ar, 16), parseInt(br, 16), amount);
        let fg = Lerp(parseInt(ag, 16), parseInt(bg, 16), amount);
        let fb = Lerp(parseInt(ab, 16), parseInt(bb, 16), amount);
        if (Number.isNaN(fr) || Number.isNaN(fg) || Number.isNaN(fb)) {
            console.log("ERROR: NaN in InvertColor method! Input: " + color + "  output: " + fr + ", " + fg + ", " + fb);
        }
        return "#" + Math.round(fr).toString(16) + Math.round(fg).toString(16) + Math.round(fb).toString(16);
    }
    InvertColor (color) {
        let c = color.slice(1);
        let r = c.slice(0, 2);
        let g = c.slice(2, 4);
        let b = c.slice(4, 6);
        let nr = 255 - parseInt(r, 16);
        let ng = 255 - parseInt(g, 16);
        let nb = 255 - parseInt(b, 16);
        if (Number.isNaN(nr) || Number.isNaN(ng) || Number.isNaN(nb)) {
            console.log("ERROR: NaN in InvertColor method! Input: " + color + "  output: " + nr + ", " + ng + ", " + nb);
        }
        return "#" + nr.toString(16) + ng.toString(16) + nb.toString(16);
    }
    noiseColor (a, b, c) {
        let red = this.clampInt((this.noise3D(a, b, c) + 1) * 127, 0, 255);
        let green = this.clampInt((this.noise3D(c, a, b) + 1) * 127, 0, 255);
        let blue = this.clampInt((this.noise3D(b, c, a) + 1) * 127, 0, 255);
        return "#" + red.toString(16) + green.toString(16) + blue.toString(16);
    }



    // Random/Noise Functions
    RandomRange (min, max) { return Math.random() * (max - min) + min; }
    RandomRangeInt (min, max) { return Math.floor(Math.random() * (max - min)) + min; }
    RandomFromList (list) { return list[Math.floor(Math.random() * list.length)]; }
    RandomAngle () {
        if (this.noiseType === constants.NOISE_TYPE_SIMPLEX) { return this.simplexNoise1D(100 * Date.now() * Math.random(), 0) * 2 * Math.PI }
        if (this.noiseType === constants.NOISE_TYPE_BROWNIAN) { return this.brownianNoise1D(100 * Date.now() * Math.random(), 0) * 2 * Math.PI }
        if (this.noiseType === constants.NOISE_TYPE_RANDOM) { return this.randomNoise() * Math.random() * 2 * Math.PI }
    }
    RandomAngleVector () {
        let angle = this.RandomAngle();
        return new Victor(Math.cos(angle), Math.sin(angle));
    }
    noise1D (a) {
        a = Math.floor(a / this.noiseFieldScale);
        if (this.noiseType === constants.NOISE_TYPE_SIMPLEX) { return this.simplexNoise2D(a, a) }
        if (this.noiseType === constants.NOISE_TYPE_BROWNIAN) { return this.brownianNoise2D(a, a) }
        if (this.noiseType === constants.NOISE_TYPE_RANDOM) { return this.randomNoise() }
    }
    noise2D (a, b) {
        a = Math.floor(a / this.noiseFieldScale);
        b = Math.floor(b / this.noiseFieldScale);
        if (this.noiseType === constants.NOISE_TYPE_SIMPLEX) { return this.simplexNoise2D(a, b) }
        if (this.noiseType === constants.NOISE_TYPE_BROWNIAN) { return this.brownianNoise2D(a, b) }
        if (this.noiseType === constants.NOISE_TYPE_RANDOM) { return this.randomNoise() }
    }
    noise3D (a, b, c) {
        a = Math.floor(a / this.noiseFieldScale);
        b = Math.floor(b / this.noiseFieldScale);
        if (this.noiseType === constants.NOISE_TYPE_SIMPLEX) { return this.simplexNoise3D(a, b, c) }
        if (this.noiseType === constants.NOISE_TYPE_BROWNIAN) { return this.brownianNoise3D(a, b, c) }
        if (this.noiseType === constants.NOISE_TYPE_RANDOM) { return this.randomNoise() }
    }
    simplexNoise1D (a) { return this.simplex.noise2D(a * this.xNoiseScale, 0); }
    simplexNoise2D (a, b) { return this.simplex.noise2D(a * this.xNoiseScale, b * this.yNoiseScale); }
    simplexNoise3D (a, b, c) { return this.simplex.noise3D(a * this.xNoiseScale, b * this.yNoiseScale, c * this.noiseTimeScale); }
    brownianNoise1D(a) {
        let maxAmp = 0;
        let amp = 1;
        let xFreq = this.xNoiseScale;
        let noise = 0;

        for (let i = 0; i < 16; ++i) {
            noise += this.simplex.noise2D(a * xFreq, 0) * amp;
            maxAmp += amp;
            amp *= 0.5;
            xFreq *= 2;
        }
        noise /= maxAmp;
        return noise;
    }
    brownianNoise2D(a, b) {
        let maxAmp = 0;
        let amp = 1;
        let xFreq = this.xNoiseScale;
        let yFreq = this.yNoiseScale;
        let noise = 0;

        for (let i = 0; i < 16; ++i) {
            noise += this.simplex.noise2D(a * xFreq, b * yFreq) * amp;
            maxAmp += amp;
            amp *= 0.5;
            xFreq *= 2;
            yFreq *= 2;
        }
        noise /= maxAmp;
        return noise;
    }
    brownianNoise3D(a, b, c) {
        let maxAmp = 0;
        let amp = 1;
        let xFreq = this.xNoiseScale;
        let yFreq = this.yNoiseScale;
        let tFreq = this.noiseTimeScale;
        let noise = 0;

        for (let i = 0; i < 16; ++i) {
            noise += this.simplex.noise3D(a * xFreq, b * yFreq, c * tFreq) * amp;
            maxAmp += amp;
            amp *= 0.5;
            xFreq *= 2;
            yFreq *= 2;
            tFreq *= 2;
        }
        noise /= maxAmp;
        return noise;
    }
    randomNoise() { return (Math.random() * 2) - 1; }
    generateNoiseField (width, height, t, xOffset=0, yOffset=0) {
        let noiseField = [];
        for (let y = yOffset; y < height + yOffset; y++) {
            let row = [];
            for (let x = xOffset; x < width + xOffset; x++) {
                row.push(this.noise3D(x, y, t));
            }
            noiseField.push(row);
        }
        return noiseField;
    }
    generateAngleNoiseField (width, height, t, xOffset=0, yOffset=0) {
        let noiseField = [];
        for (let y = yOffset; y < height + yOffset; y++) {
            let row = [];
            for (let x = xOffset; x < width + xOffset; x++) {
                row.push(this.noise3D(x, y, t) * Math.PI * 2);
            }
            noiseField.push(row);
        }
        return noiseField;
    }



    // Math Functions
    clamp (n, min, max) { return Math.min(Math.max(n, min), max); }
    clampInt (n, min, max) { return this.clamp(Math.round(n), min, max); }
    RoundToNearest(n, value) { return Math.round(n / value) * value; }



    // Particle Property Functions
    RandomSkipPattern() {
        let pattern = []
        pattern.push(this.RandomRangeInt(1, 15));
        pattern.push(this.RandomRangeInt(1, 15));
        let threshold = 0.5;
        while (Math.random() > threshold) {
            pattern.push(this.RandomRangeInt(1, 15));
            threshold += 0.05;
        }
        return pattern;
    }


    // Run Property Functions
    ScaleRunPropertiesToSize(runProperties, newWidth, newHeight) {
        let widthDiff = newWidth / runProperties.width;
        let heightDiff = newHeight / runProperties.height;
        let scale = (widthDiff + heightDiff) / 2;

        runProperties.utilityProperties.xNoiseScale *= scale;
        runProperties.utilityProperties.yNoiseScale *= scale;
        runProperties.utilityProperties.noiseTimeScale *= scale;
        runProperties.utilityProperties.noiseFieldScale *= scale;

        runProperties.positionController.radiusScale *= scale;

        runProperties.particleDefaults.minSize = Math.max(1, Math.round(runProperties.particleDefaults.minSize * scale));
        runProperties.particleDefaults.maxSize = Math.max(runProperties.particleDefaults.minSize,
                                                          Math.round(runProperties.particleDefaults.maxSize * scale));
        runProperties.particleDefaults.minLifespan = Math.max(1, Math.round(runProperties.particleDefaults.minLifespan * scale));
        runProperties.particleDefaults.maxLifespan = Math.max(runProperties.particleDefaults.minLifespan,
                                                              Math.round(runProperties.particleDefaults.maxLifespan * scale));
        runProperties.particleDefaults.initialSpeed = Math.max(1, Math.round(runProperties.particleDefaults.initialSpeed * scale));
        runProperties.particleDefaults.minSpeed = Math.max(1, runProperties.particleDefaults.minSpeed * scale);
        runProperties.particleDefaults.maxSpeed = Math.max(runProperties.particleDefaults.minSpeed,
                                                           Math.round(runProperties.particleDefaults.maxSpeed * scale));
    }
    NudgeRunProperties(runProperties, chance, magnitude) {
        runProperties.numParticles = this.NudgeIntProperty(runProperties.numParticles, chance, magnitude);

        // Utility Properties
        if (Math.random() < chance) this.noiseType = this.RandomFromList([constants.NOISE_TYPE_SIMPLEX, constants.NOISE_TYPE_BROWNIAN, constnats.NOISE_TYPE_RANDOM]);
        if (Math.random() < chance) this.randomizeEasingFunction();
        this.xNoiseScale = this.NudgeProperty(this.xNoiseScale, chance, magnitude);
        this.yNoiseScale = this.NudgeProperty(this.yNoiseScale, chance, magnitude);
        this.noiseTimeScale = this.NudgeProperty(this.noiseTimeScale, chance, magnitude);
        this.noiseFieldScale = this.NudgeIntProperty(this.noiseFieldScale, chance, magnitude, 1);

        // Particle properties
        runProperties.particleDefaults.minSize = this.NudgeIntProperty(runProperties.particleDefaults.minSize, chance, magnitude, 1);
        runProperties.particleDefaults.maxSize = this.NudgeIntProperty(runProperties.particleDefaults.maxSize, chance, magnitude,
            runProperties.particleDefaults.minSize);
        runProperties.particleDefaults.minLifespan = this.NudgeIntProperty(runProperties.particleDefaults.minLifespan, chance, magnitude, 1);
        runProperties.particleDefaults.maxLifespan = this.NudgeIntProperty(runProperties.particleDefaults.maxLifespan, chance, magnitude,
            runProperties.particleDefaults.minLifespan);
        runProperties.particleDefaults.initialSpeed = this.NudgeIntProperty(runProperties.particleDefaults.initialSpeed, chance, magnitude);
        runProperties.particleDefaults.minSpeed = this.NudgeIntProperty(runProperties.particleDefaults.minSpeed, chance, magnitude, 1);
        runProperties.particleDefaults.maxSpeed = this.NudgeIntProperty(runProperties.particleDefaults.maxSpeed, magnitude, chance,
            runProperties.particleDefaults.minSpeed);
        if (Math.random() < chance) {
            if (runProperties.particleDefaults.skipPattern !== null) {
                runProperties.particleDefaults.skipPattern = null;
            } else {
                runProperties.particleDefaults.skipPattern = this.RandomSkipPattern();
            }
        }
        if (Math.random() < chance) runProperties.particleDefaults.lineCapBehavior = this.RandomRangeInt(0, 3);
        if (Math.random() < chance) runProperties.particleDefaults.lineJoinBehavior = this.RandomRangeInt(0, 3);
        if (Math.random() < chance) runProperties.particleDefaults.edgeBehavior = this.RandomRangeInt(0, 5);
        runProperties.particleDefaults.overshoot = this.NudgeProperty(runProperties.particleDefaults.overshoot, magnitude, chance,
            runProperties.particleDefaults.minSpeed);

        // Color properties
        if (Math.random() < chance) {
            runProperties.palette = this.RandomMaybeNewPalette();
        } else {
            runProperties.palette.forEach(color => {
                if (Math.random() < chance) color = this.RandomColor();
            });
        }
        if (Math.random() < chance) runProperties.canvasColor = this.RandomColorFromPalette(runProperties.palette);
    }
    NudgeProperty(value, chance, magnitude, min, max) {
        if (Math.random() >= chance) return value;

        if (!min) min = Number.MIN_VALUE;
        if (!max) max = Number.MAX_VALUE;

        return this.clamp(value + this.RandomRange(1 - magnitude, 1 + magnitude), min, max);
    }
    NudgeIntProperty(value, chance, magnitude, min, max) {
        return Math.round(this.NudgeProperty(value, chance, magnitude, min, max));
    }



    // Interpolation Functions
    randomizeEasingFunction () { this.currentEasingFunction = this.RandomRangeInt(0, this.easingFunctions.length); }
    ease (n) { return this.easingFunctions[this.currentEasingFunction](n); }
    easeNumber (a, b, i) { return a + ((b - a) * this.ease(i)); }
    easeVector (a, b, i) { return new Victor(this.easeNumber(a.x, b.x, i), this.easeNumber(a.y, b.y, i)); }
    easeColor (a, b, i) {
        let ax = a.slice(1);
        let bx = b.slice(1);
        let ar = ax.slice(0, 2);
        let ag = ax.slice(2, 4);
        let ab = ax.slice(4, 6);
        let br = bx.slice(0, 2);
        let bg = bx.slice(2, 4);
        let bb = bx.slice(4, 6);
        //console.log(ax, ar, ag, ab);
        //console.log(bx, br, bg, bb);
        let fr = this.clampInt(this.easeNumber(parseInt(ar, 16), parseInt(br, 16), i), 0, 255);
        let fg = this.clampInt(this.easeNumber(parseInt(ag, 16), parseInt(bg, 16), i), 0, 255);
        let fb = this.clampInt(this.easeNumber(parseInt(ab, 16), parseInt(bb, 16), i), 0, 255);
        //console.log(fr, fg, fb);
        return "#" + Math.round(fr).toString(16).padStart(2, "0") + Math.round(fg).toString(16).padStart(2, "0") + Math.round(fb).toString(16).padStart(2, "0");
    }
}
