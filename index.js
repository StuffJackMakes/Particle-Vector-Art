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
//   General Program Setup
// ------------------------------------

// Some steps need to be skipped or added if running in a browser
let inBrowser = typeof window !== "undefined";
let browserIsPaused = true;
let animationFrameRequestId;

// Create the directories to save output to
FileHelper.CreateRequiredDirectories(inBrowser);

// Heightmaps provide data for particles to interact with
let heightmaps = FileHelper.LoadHeightmaps(inBrowser);

// Track run statistics
let runTimes = [];


// -------------------
//   Generate Images
// -------------------
let GenerateImages = (heightmapFiles, overrideRunProperties) => {
    if (inBrowser) DisableImageDownload();

    if (heightmapFiles.length <= 0) {
        let total = 0;
        for (let i = 0; i < runTimes.length; i++) {
            total += runTimes[i];
        }
        console.log("All heightmaps completed in %ds (%ds average)", total.toFixed(2), (total / runTimes.length).toFixed(2));
        return;
    }

    FileHelper.LoadRunProperties(inBrowser, (baseRunProperties) => {
        if (overrideRunProperties) baseRunProperties = overrideRunProperties;
        // Load properties for this run if there is a property file
        let run = baseRunProperties;
        run.heightmapFile = heightmapFiles[0];


        // The utilities object manages randomization and math helper functions
        let Util = new Utilities();
        Util.SetProperties(run.utilityProperties);


        // Fill in high-level missing optional properties
        if (!("numParticles" in run)) run.numParticles = Util.RandomRangeInt(1, 8);
        if (!("totalSteps" in run)) run.totalSteps = Util.RandomRangeInt(100, 500);
        if (!("allowBackgroundColor" in run)) run.allowBackgroundColor = Math.random() > 0.5 ? true : false;
        if (!("nudgePropertiesChance" in run.random)) run.random.nudgePropertiesChance = 0;
        if (!("nudgePropertiesMagnitude" in run.random)) run.random.nudgePropertiesMagnitude = 0.2;
        if (!("brandNewPaletteChance" in run.random)) run.random.brandNewPaletteChance = 0;

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

            // The particle manager object manages setup and execution of all particles
            let particleManager = new ParticleManager(Util, run);
            particleManager.SetProperties(run.particleDefaults);


            // Create the controllers for each aspect of the particles
            let angleController = new AngleController(Util, run);
            let magnitudeController = new MagnitudeController(Util, run);
            let sizeController = new SizeController(Util, run);
            let colorController = new ColorController(Util, run);
            let positionController = new PositionController(Util, run);


            // Setup the controllers
            if (run.positionController) positionController.SetProperties(run.positionController);
            else run.positionController = positionController.GetProperties();

            if (run.angleController) angleController.SetProperties(run.angleController);
            else run.angleController = angleController.GetProperties();

            if (run.magnitudeController) magnitudeController.SetProperties(run.magnitudeController);
            else run.magnitudeController = magnitudeController.GetProperties();

            if (run.sizeController) sizeController.SetProperties(run.sizeController);
            else run.sizeController = sizeController.GetProperties();

            if (run.colorController) colorController.SetProperties(run.colorController);
            else run.colorController = colorController.GetProperties();

            particleManager.SetControllers(angleController, magnitudeController, sizeController, colorController, positionController);


            // Create the paper.js canvas
            let canvas,
                ctx;
            if (inBrowser) {
                ctx = paper.setup(document.getElementById("drawingCanvas"));
            } else {
                ctx = paper.setup(new paper.Size(run.width, run.height));
            }
            ctx.imageSmoothingEnabled = true;


            // Create the background and make it hidable in the browser
            let background = new paper.Path.Rectangle(new paper.Point(0, 0), new paper.Point(run.width, run.height));
            background.fillColor = run.backgroundColor;
            if (inBrowser) {
                window.BrowserShowHideBackground = () => { background.visible = !background.visible; }
            }


            // Create the particles
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
                    } else {
                        EnableImageDownload(paper.project.exportSVG({
                            asString: true,
                            precision: 2,
                            matchShapes: true,
                            embedImages: false
                        }), paper);
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

                FileHelper.SaveMetadata(run, filename);

                // Save the resulting canvas as an image
                FileHelper.SaveCanvasAsVector(paper, filename, () => {
                    let endTime = process.hrtime(startTime);
                    endTime = endTime[0] + (endTime[1] / 1000000000); // seconds
                    console.log("Heightmap '" + run.heightmapFile + "' complete in %ds", endTime.toFixed(2));
                    runTimes.push(endTime);
                    GenerateImages(heightmapFiles.slice(1), overrideRunProperties ? overrideRunProperties : null);
                });
            }
        }

        if (inBrowser) {
            HeightmapLoaded(document.getElementById("image"));
        } else {
            loadImage(run.heightmapFile).then(HeightmapLoaded);
        }
    });
}

if (inBrowser) {
    window.RestartRun = (runProperties) => {
        browserIsPaused = true;
        window.cancelAnimationFrame(animationFrameRequestId);
        paper.clear();
        DisableImageDownload();
        if (runProperties) {
            GenerateImages(heightmaps, runProperties);
        } else {
            GenerateImages(heightmaps);
        }
    }
    window.onload = () => {
        SetupEditor();
        GenerateImages(heightmaps);
    }
} else {
    console.log("processing " + heightmaps.length + " heightmaps");
    FileHelper.LoadRunProperties(inBrowser, (baseRunProperties) => {
        if (!("repeatTimes" in baseRunProperties)) baseRunProperties.repeatTimes = 0;
        console.log("repeating " + baseRunProperties.repeatTimes + " times");
        let repeatHeightmaps = [];
        console.log(repeatHeightmaps.length);
        for (let i = 0; i < 1 + baseRunProperties.repeatTimes; i++) {
            repeatHeightmaps.push.apply(repeatHeightmaps, heightmaps);
        }
        console.log(repeatHeightmaps.length);
        GenerateImages(repeatHeightmaps);
    });
}
