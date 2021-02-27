// This file handles interfacing with the filesystem

// Third-party libraries
const fs = require("fs");
const path = require("path");

// Constants
const OUTPUT_PATH = "/output";
const METADATA_PATH = OUTPUT_PATH + "/metadata";
const RUN_PROPERTY_FILE = "run-properties.json";
const HEIGHTMAP_PATH = "/heightmaps";
const DEFAULT_HEIGHTMAP = "heightmap.png";

// Creates the OUTPUT_PATH and METADATA_PATH directories, if they don't exist
exports.CreateRequiredDirectories = function (inBrowser) {
    if (inBrowser) return;
    fs.mkdirSync(path.join(process.cwd(), METADATA_PATH), { recursive: true });
}

// Loads the contents of the RUN_PROPERTY_FILE file
exports.LoadRunProperties = function (inBrowser, callback) {
    if (inBrowser) {
        fetch(RUN_PROPERTY_FILE)
            .then(response => response.json())
            .then(data => callback(data));
    } else {
        //return JSON.parse(fs.readFileSync(RUN_PROPERTY_FILE));
        fs.readFile(RUN_PROPERTY_FILE, (err, data) => { callback(JSON.parse(data)); } );
    }
}

// Loads all images in the HEIGHTMAP_PATH directory
exports.LoadHeightmaps = function (inBrowser) {
    if (inBrowser) return ["/" + DEFAULT_HEIGHTMAP];
    let heightmaps = [];
    heightmaps = fs.readdirSync(path.join(process.cwd(), HEIGHTMAP_PATH));
    heightmaps = heightmaps.filter((e) => { return e.lastIndexOf(".") > 0; });
    heightmaps = heightmaps.map((e) => { return path.join(process.cwd(), HEIGHTMAP_PATH, e); });
    return heightmaps;
}

// Saves the metadata object as a .json file to the METADATA_PATH folder
exports.SaveMetadata = function (metadata, filename) {
    fs.writeFileSync(path.join(process.cwd(), METADATA_PATH, filename + ".json"), JSON.stringify(metadata, null, 4));
}

// Save the Paper.js canvas as an svg to the OUTPUT_PATH folder
exports.SaveCanvasAsVector = function (paper, filename, callback) {
    let svg = paper.project.exportSVG({
        asString: true,
        precision: 2,
        matchShapes: true,
        embedImages: false
    });

    fs.writeFile(path.join(process.cwd(), OUTPUT_PATH, filename + ".svg"), svg, function (err) {
        if (err) {
            console.error("Error saving canvas '" + filename + "' as a vector");
            throw err;
        }
        callback();
    });
}
