// This class defines existing behavior for all controllers


module.exports = class Controller {
    constructor (Util, runProperties) {
        this.Util = Util;
        this.canvasWidth = runProperties.width;
        this.canvasHeight = runProperties.height;
        this.canvasMinDim = Math.min(this.canvasWidth, this.canvasHeight);
        this.totalSteps = runProperties.totalSteps;
        this.t = 0;

        this.controlFunction = null;
        this.controlMuxA = null;
        this.controlMuxB = null;

        this.savableProperties = ["noiseOffset", "heightmapChannel", "controlFunction", "controlMuxA", "controlMuxB"];
    }

    GetProperties () {
        let output = {};
        for (let p of this.savableProperties) {
            if (p === "controlFunction") {
                output[p] = this.controlFunction.name;
            } else if (p === "controlMuxA") {
                output[p] = this.controlMuxA ? this.controlMuxA.name : null;
            } else if (p === "controlMuxB") {
                output[p] = this.controlMuxB ? this.controlMuxB.name : null;
            } else {
                output[p] = this[p];
            }
        }
        return output;
    }

    SetProperties (properties) {
        for (let p in properties) {
            if (p === "controlFunction") {
                this.controlFunction = this[properties[p]];
            } else if (p === "controlMuxA") {
                this.controlMuxA = this[properties[p]];
            } else if (p === "controlMuxB") {
                this.controlMuxB = this[properties[p]];
            } else {
                this[p] = properties[p];
                if (p == "noiseOffset") {
                    this.xNoiseOffset = this.noiseOffset * this.canvasWidth;
                    this.yNoiseOffset = this.noiseOffset * this.canvasHeight;
                }
            }
        }
        this.SetControlFunction();
    }

    RandomizeChannel () {
        this.heightmapChannel = Math.floor(Math.random() * 4);
    }

    RandomizeControl () {
        let randomControl = this.Util.RandomFromList(this.controlFunctions);
        this.controlFunction = randomControl;
        if (randomControl.name.indexOf("Mux") !== -1) {
            this.controlMuxA = this.Util.RandomFromList(this.controlFunctionsNoMux);
            this.controlMuxB = this.Util.RandomFromList(this.controlFunctionsNoMux);
        } else {
            this.controlMuxA = null;
            this.controlMuxB = null;
        }
        this.SetControlFunction();
    }

    RandomizeHeightmapControl () {
        this.RandomizeChannel();
        this.controlFunction = this.HeightmapMux;
        this.controlMuxA = this.Util.RandomFromList(this.controlFunctionsNoMux);
        this.controlMuxB = this.Util.RandomFromList(this.controlFunctionsNoMux);
        this.SetControlFunction();
    }

    SetControlFunction() {
        this.Control = (particle) => {
            return this.controlFunction.call(this, particle, 
                (particle) => { return this.controlMuxA.call(this, particle); },
                (particle) => { return this.controlMuxB.call(this, particle); });
        }
    }
}