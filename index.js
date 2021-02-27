// This file is the main entry point of the program

// Runtime constants
const constants = require("./code/constants");

// Third-party libraries
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const Victor = require("victor");
const paper = require("paper");

// Custom libraries
const FileHelper = require("./code/file_helper.js");
const Utilities = require("./code/utilities");
const PositionController = require("./code/controllers/position_controller");
const AngleController = require("./code/controllers/angle_controller");
const MagnitudeController = require("./code/controllers/magnitude_functions");
const SizeController = require("./code/controllers/size_controller");
const ColorController = require("./code/controllers/color_controller");
const ParticleManager = require("./code/particle_manager");


// ------------------------------------
//   Program Defaults - DO NOT MODIFY
// ------------------------------------

// Some steps need to be skipped or added if running in a browser
let inBrowser = typeof window !== "undefined";
let browserIsPaused = true;

// Create the directories to save output to
FileHelper.CreateRequiredDirectories(inBrowser);

// Heightmaps provide data on the canvas for particles to interact with
let heightmaps = FileHelper.LoadHeightmaps(inBrowser);

// Track run statistics
let runTimes = [];

// Allow runs to be cancelled mid-execution
let animationFrameRequestId;


/*
let LoadProperties = () => {
    // Load the run properties
    FileHelper.LoadRunProperties(inBrowser, (baseRunProperties) => {
        //let baseRunProperties = properties;

        // Image sizing
        //let canvasWidth = baseRunProperties.width;
        //let canvasHeight = baseRunProperties.height;

        // Property files to use for each heightmap
        // Currently uses one property file for all heightmaps
        //let propertyFile = null;

        GenerateImages(heightmaps, baseRunProperties);
    });
}
*/

// -------------------
//   Generate Images
// -------------------
let GenerateImages = (heightmapFiles, baseRunProperties) => {
    if (heightmapFiles.length <= 0) {
        let total = 0;
        for (let i = 0; i < runTimes.length; i++) {
            total += runTimes[i];
        }
        console.log("All heightmaps completed in %ds (%ds average)", total.toFixed(2), (total / runTimes.length).toFixed(2));
        return;
    }

    // Load properties for this run if there is a property file
    let run = baseRunProperties;

    // Fill in high-level missing optional properties
    if (!("repeatTimes" in run)) run.repeatTimes = 0;
    if (!("numParticles" in run)) run.numParticles = Util.RandomRangeInt(1, 8);
    if (!("totalSteps" in run)) run.totalSteps = Util.RandomRangeInt(100, 800);
    if (!("allowBackgroundColor" in run)) run.allowBackgroundColor = Math.random() > 0.5 ? true : false;
    if (!("nudgePropertiesChance" in run.random)) run.random.nudgePropertiesChance = 0;
    if (!("nudgePropertiesMagnitude" in run.random)) run.random.nudgePropertiesMagnitude = 0.2;
    if (!("brandNewPaletteChance" in run.random)) run.random.brandNewPaletteChance = 0;

    /*
    if (propertyFilename !== null) {
        if (inBrowser) {
            // If the proprety filename provided is a string, load the default properties file
            // Otherwise use it as the run properties
            if (typeof propertyFilename === "string") {
                let request = new XMLHttpRequest();
                request.overrideMimeType("application/json");
                run = JSON.parse(request.open('GET', '/properties.json', false));
            } else {
                run = propertyFilename;
            }
        } else {
            run = JSON.parse(fs.readFileSync(propertyFilename));
        }

        if ((run.width && run.width !== canvasWidth) || (run.height && run.height !== canvasHeight)) {
            Util.ScaleRunPropertiesToSize(run, canvasWidth, canvasHeight);
        }

        if (run.random.nudgePropertiesChance > 0) {
            Util.NudgeRunProperties(run, run.random.nudgePropertiesChance, run.random.nudgePropertiesMagnitude);
        }
    }
    */
    run.heightmapFile = heightmapFiles[0];

    // The utilities object managed randomization and math helper functions
    let Util = new Utilities();
    Util.SetProperties(run.utilityProperties);

    if (run.random.nudgePropertiesChance > 0) {
        Util.NudgeRunProperties(run, run.random.nudgePropertiesChance, run.random.nudgePropertiesMagnitude);
    }

    // Define the color palette and background color
    if (!run.palette) {
        if (Math.random() >= run.random.brandNewPaletteChance) {
            run.palette = Util.RandomPalette();
        } else {
            run.palette = Util.GenerateRandomPalette();
        }
    }

    if (!run.backgroundColor) {
        run.backgroundColor = Util.RandomColorFromPalette(run.palette);
    }

    if (!run.allowBackgroundColor && run.palette.indexOf(run.backgroundColor) !== -1) {
        run.palette.splice(run.palette.indexOf(run.backgroundColor), 1);
    }
    /*
    let noBackgroundPalette = [];
    for (let color of run.palette) {
        if (run.palette.allowBackgroundColor || color != run.backgroundColor) {
            noBackgroundPalette.push(color);
        }
    }
    */
    let HeightmapLoaded = (heightmapImage) => {
        console.log("Loaded heightmap '" + run.heightmapFile + "'");
        let startTime;
        if (!inBrowser) { startTime = process.hrtime(); }

        // Set the run property `height` and 1width` if needed
        if (!("width" in run)) run.width = heightmapImage.width;
        if (!("height" in run)) run.height = heightmapImage.height;

        // Draw the loaded image onto a canvas so we can access individual pixel data
        let heightmapCanvas;
        if (inBrowser) {
            heightmapCanvas = document.getElementById("heightmapCanvas");
        } else {
            heightmapCanvas = createCanvas(heightmapImage.width, heightmapImage.height);
        }
        let heightmapCtx = heightmapCanvas.getContext("2d");
        heightmapCtx.drawImage(heightmapImage, 0, 0);
        let canvasWidthToHeightmap = heightmapImage.width / run.width;
        let canvasHeightToHeightmap = heightmapImage.height / run.height;

        // Create the function to get information from  the heightmap
        let heightmapFunction = (inX, inY) => {
            x = Util.clampInt(inX * canvasWidthToHeightmap, 0, heightmapCanvas.width - 1);
            y = Util.clampInt(inY * canvasHeightToHeightmap, 0, heightmapCanvas.height - 1);
            let data = heightmapCtx.getImageData(x, y, 1, 1).data;
            let values = [];
            values.push(data[0] / 255); // Red on a scale of 0.0 - 1.0
            values.push(data[1] / 255); // Green on a scale of 0.0 - 1.0
            values.push(data[2] / 255); // Blue on a scale of 0.0 - 1.0
            values.push((values[0] + values[1] + values[2]) / 3); // RGB on a scale of 0.0 - 1.0
            return values;
        }

        // Setup the utility properties
        //Util.SetProperties(run.utilityProperties);
        /*
        if (run.utilityProperties) {
            Util.SetProperties(run.utilityProperties);
        } else {
            Util.RandomizeProperties();
            run.utilityProperties = Util.GetProperties();
        }
        */
        // Setup the particle manager properties

        // The particle manager object manages setup and execution of all particles
        let particleManager = new ParticleManager(Util, run);
        particleManager.SetProperties(run.particleDefaults);

        /*
        if (run.particleDefaults) {
            particleManager.SetProperties(run.particleDefaults);
        } else {
            particleManager.RandomizeParticleDefaults(Util, run);
            run.particleDefaults = particleManager.GetProperties();
        }
        */

        // Create the controllers for each aspect of the particles
        let angleController = new AngleController(Util, run);
        let magnitudeController = new MagnitudeController(Util, run);
        let sizeController = new SizeController(Util, run);
        let colorController = new ColorController(Util, run);
        let positionController = new PositionController(Util, run);

        // Set/randomize properties that require other information
        magnitudeController.globalConstantMagnitude = particleManager.defaultMinSpeed + Util.RandomRangeInt(0, particleManager.defaultMaxSpeed + 1);
        if (Math.random() > 0.9) {
            angleController.roundAngleResults = true;
        }

        // Setup the properties for each controller
        if (run.positionController) {
            positionController.SetProperties(run.positionController);
        } else {
            positionController.RandomizeControl();
            run.positionController = positionController.GetProperties();
        }

        if (run.angleController) {
            angleController.SetProperties(run.angleController);
        } else {
            angleController.RandomizeControl();
            run.angleController = angleController.GetProperties();
        }

        if (run.magnitudeController) {
            magnitudeController.SetProperties(run.magnitudeController);
        } else {
            magnitudeController.RandomizeControl();
            run.magnitudeController = magnitudeController.GetProperties();
        }

        if (run.sizeController) {
            sizeController.SetProperties(run.sizeController);
        } else {
            sizeController.RandomizeControl();
            run.sizeController = sizeController.GetProperties();
        }

        if (run.colorController) {
            colorController.SetProperties(run.colorController);
        } else {
            colorController.RandomizeControl();
            run.colorController = colorController.GetProperties();
        }

        particleManager.SetControllers(angleController, magnitudeController, sizeController, colorController, positionController);


        // Create the paper.js canvas
        let canvas,
            ctx;
        if (inBrowser) {
            ctx = paper.setup(document.getElementById("drawingCanvas"));
        } else {
            ctx = paper.setup(new paper.Size(baseRunProperties.width, baseRunProperties.height));
        }
        ctx.imageSmoothingEnabled = true

        // Create the background and make it hidable in the browser
        let background = new paper.Path.Rectangle(new paper.Point(0, 0), new paper.Point(run.width, run.height));
        background.fillColor = run.backgroundColor;
        if (inBrowser) {
            window.BrowserShowHideBackground = () => { background.visible = !background.visible; }
        }


        // Create the particles
        /*
        let particleProperties = {
            Util: Util,
            heightmapFunction: heightmapFunction,
            positionController: positionController,
            canvasWidth: run.width,
            canvasHeight: run.height,
            canvasColor: run.backgroundColor,
            palette: run.palette
        }
        particleManager.ClearParticles();
        for (let i = 0; i < run.numParticles; i++) {
            particleManager.SpawnParticle(particleProperties);
        }
        */
        particleManager.ClearParticles();
        for (let i = 0; i < run.numParticles; i++) {
            particleManager.SpawnParticle(heightmapFunction, run);
        }

        // Define a function that activates each particle
        let t = 0;
        particleManager.ResetControllers();
        let TimeStep = () => {
            particleManager.StepParticles(t, paper);

            // Request another call of this function if running in the browser
            if (inBrowser) {
                UpdateStepCounter(t, run.totalSteps);
                if (t < run.totalSteps) {
                    if (!browserIsPaused) { animationFrameRequestId = window.requestAnimationFrame(TimeStep); }
                }
            }

            t += 1;
        }


        // Run the simulation
        if (inBrowser) {
            SetRunProperties(run);
            window.BrowserPauseResume = () => {
                if (browserIsPaused) { animationFrameRequestId = window.requestAnimationFrame(TimeStep); }
                browserIsPaused = !browserIsPaused;
            }
            BrowserPauseResume();
        } else {
            for (let step = 0; step < run.totalSteps; step++) {
                TimeStep();
            }
        }


        // Save files related to this run
        if (!inBrowser) {
            let filename = Date.now() + "_" + run.heightmapFile.slice(run.heightmapFile.lastIndexOf("/") + 1, run.heightmapFile.lastIndexOf("."));

            // Save the properties used on this run if not using existing properties
            //if (propertyFilename === null || (propertyFilename !== null && run.random.nudgePropertiesChance > 0)) {
            if (run.random.nudgePropertiesChance > 0) {
                FileHelper.SaveMetadata(run, filename);
                //Util.SaveJsonObject(run, filename + ".json");
            }

            // Save the resulting canvas as an image
            FileHelper.SaveCanvasAsVector(paper, filename, () => {
                let endTime = process.hrtime(startTime);
                endTime = endTime[0] + (endTime[1] / 1000000000); // seconds
                console.log("Heightmap '" + run.heightmapFile + "' complete in %ds", endTime.toFixed(2));
                runTimes.push(endTime);
                GenerateImages(heightmapFiles.slice(1), baseRunProperties);
            });
        }
    }

    if (inBrowser) {
        HeightmapLoaded(document.getElementById("image"));
    } else {
        loadImage(run.heightmapFile).then(HeightmapLoaded);
    }
}

if (inBrowser) {
    window.RestartRun = (runProperties) => {
        browserIsPaused = true;
        window.cancelAnimationFrame(animationFrameRequestId);
        paper.clear();
        GenerateImages(heightmaps, runProperties);
    }
    window.onload = () => {
        SetupEditor();
        //GenerateImages(heightmaps, null); //propertyFile);
        FileHelper.LoadRunProperties(inBrowser, (baseRunProperties) => {
            GenerateImages(heightmaps, baseRunProperties);
        });
    }
} else {
    console.log("processing " + heightmaps.length + " heightmaps");
    //GenerateImages(heightmaps, null); //propertyFile);
    FileHelper.LoadRunProperties(inBrowser, (baseRunProperties) => {
        GenerateImages(heightmaps, baseRunProperties);
    });
}
