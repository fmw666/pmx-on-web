/*
    this file only can be used in node.js.
    when you need the datas, you can run with: node filereader.js
    and then you can get the datas in the console.
*/

const fs = require("fs");
const path = require("path");

const motionDir = "./../assets/motion/";
const motionExt = ".vmd";

const poseDir = "./../assets/pose/";
const poseExt = ".vpd";

// file reader
fs.readdir(motionDir, function (err, files) {
    if (err) {
        console.error("fail to read dir: " + err);
        return;
    }

    const vmdFiles = files.filter(function (file) {
        return path.extname(file) === motionExt;
    });

    const VMD_FILES = vmdFiles.map(function (file) {
        return {
            name: path.basename(file, motionExt),
            file: path.join(motionDir, file),
        };
    });

    console.log(VMD_FILES);
});

fs.readdir(poseDir, function (err, files) {
    if (err) {
        console.error("fail to read dir: " + err);
        return;
    }

    const vpdFiles = files.filter(function (file) {
        return path.extname(file) === poseExt;
    });

    const VPD_FILES = vpdFiles.map(function (file) {
        return {
            name: path.basename(file, poseExt),
            file: path.join(poseDir, file),
        };
    });

    console.log(VPD_FILES);
});
