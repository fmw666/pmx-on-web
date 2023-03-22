import { InitMenu } from './menu.js';
import { LoadModel, LoadAudio, ResetAudio, UpdateMorphTargetByAudio, onMorphTargetChanged } from './morphtarget.js';
import { MODEL_FILES, VMD_FILES, VPD_FILES } from './data/filelist.js';

// three.js -- check if it has been loaded successfully.
import * as THREE from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { MMDAnimationHelper } from 'three/addons/animation/MMDAnimationHelper.js';

InitMenu();

//***********************************************************************************************
// variable setting
//***********************************************************************************************
// MMD 3d-models the variables related to motion
const ANIMATION_HELPER = new MMDAnimationHelper();
const CLOCK = new THREE.Clock();
let animationMixer = {};
let motions = [];
// when the motion index is -1, it indicates that the motion is not being applied.
let motionIndex = -1;
// when the pose index is -1, it indicates that the pose is not being applied.
let poseIndex = -1;

// if start the recording
let isRecording = false;
let mediaRecorder = {};

let modelShadow = true;
let motionSpeed = 0.8;
let modelPhysics = false;

let audioFile = {};
const progressBgDiv = document.getElementById('progressBg');
const progressBarDiv = document.getElementById('progressBar');
const progressDiv = document.getElementById('progress');

// the variables related to rendering.
let camera = {};
let controls = {};
let effect = {};
let light = {};
let mesh = {};
let meshCache = {};
let renderer = {};
let scene = {};
let charactercenter;
// The size of the canvas element displaying WebGL.
// Get the width of a responsive div element (960px) and extract only the numerical value (960).
let canvasSizeW;
let canvasSizeH;
// For 16:9, it is 9/16. For 4:3, it is 3/4.
// canvasSizeW = parseInt(window.getComputedStyle(document.getElementById('webgl')).height) * 3 / 4;
canvasSizeW = parseInt(window.getComputedStyle(document.getElementById('webgl')).width);
canvasSizeH = parseInt(window.getComputedStyle(document.getElementById('webgl')).height);
// initial camera position and rotation
let initCameraPosition = {};
let initCameraRotation = {};

//***********************************************************************************************
// Main program
//***********************************************************************************************

// Execute the main program when the DOM analysis is completed.
window.addEventListener('load', function () {
    // Avoid the error 'Ammo.btDefaultCollisionConfiguration is not a function' in Ammo.
    // https://stayawhile.site/2021/10/14/post0012/
    var d = getParam('d');
    if (!(d in MODEL_FILES)) {
        d = Object.keys(MODEL_FILES)[0];
    }
    $('#model_select').val(d);

    Ammo().then(function (AmmoLib) {
        Ammo = AmmoLib;
        // (1) Preparing the scene.
        prepareScene();
        // (2) Load MMD 3D models and add them to the scene.
        loadMMD(d);
        // (3) Rendering (rendering loop).
        sceneRender();
    });
}, false);

//-----------------------------------------------------------------------------------------------
// (1) Preparing the scene.
//-----------------------------------------------------------------------------------------------
function prepareScene() {
    // Create a renderer.
    renderer = new THREE.WebGLRenderer({ antialias: true });
    // Setting the resolution.
    renderer.setPixelRatio(window.devicePixelRatio);
    // Setting the rendering size.
    renderer.setSize(canvasSizeW, canvasSizeH);
    // Setting the background color and transparency.
    renderer.setClearColor(0xffffff, 1.0);
    // Setting up shadow mapping.
    renderer.shadowMap.enabled = true;
    // Specifying the type of shadow mapping.
    // THREE.BasicShadowMap、THREE.PCFShadowMap (default)、THREE.PCFSoftShadowMap、THREE.VSMShadowMap
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.LinearEncoding;
    // Setting the HTML element to which the renderer output is directed (the canvas is generated automatically).
    document.getElementById('webgl').appendChild(renderer.domElement);
    // OutlineEffect applicable
    effect = new OutlineEffect(renderer, { defaultThickness: 0.5, defaultColor: [255, 0, 0], defaultAlpha: 1 });
    // Create a scene.
    scene = new THREE.Scene();
    // Create an ambient light and add it to the scene.
    scene.add(new THREE.AmbientLight(0xfff4fc, 0.7));
    // Create a directional light.
    light = new THREE.DirectionalLight(0xffe0ed, 0.4);
    // Setting up dynamic shadows with a directional light
    light.castShadow = true;
    // Setting the position of the light.
    light.position.copy(new THREE.Vector3(2, 4.7, 2));
    // The size of the shadow mapping with a spotlight light
    light.shadow.mapSize.copy(new THREE.Vector2(2 ** 10.5, 2 ** 10.5));
    // The resolution of the shadow with a spotlight light.
    light.shadow.focus = 1;
    // Setting the offset bias of the shadow map to reduce shadow acne.
    light.shadow.normalBias = 0.02;
    light.shadow.bias = -0.0005;
    light.shadow.camera.left = -5;
    light.shadow.camera.right = 5;
    light.shadow.camera.top = 5;
    light.shadow.camera.bottom = -5;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 20;
    // Add a directional light to the scene
    scene.add(light);
    // light.target.position.copy( new THREE.Vector3( 0, 0, 0 ) );
    // Add a target to the directional light in the scene.
    scene.add(light.target);
    // Create a camera.
    // Determine the field of view. The focal length (equivalent to 35mm film) and the vertical field of view for an aspect ratio of 16:9 are as follows
    // 24 mm = 45.75、 35 mm = 32.27、50 mm = 22.90
    camera = new THREE.PerspectiveCamera(22.9, canvasSizeW / canvasSizeH, 0.1, 200);
    // OrbitControls setting up for use.
    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.zoomSpeed = 1.2;
    // Create a floor.
    const planeGeometry = new THREE.PlaneGeometry(12, 12, 1, 1);
    const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.25, depthTest: false, depthWrite: true });
    const GROUND_MESH = new THREE.Mesh(planeGeometry, planeMaterial);
    GROUND_MESH.castShadow = true;
    // Rotate the mesh 90 degrees and change it from the X-Y plane to the X-Z plane.
    GROUND_MESH.geometry.rotateX(-90 * Math.PI / 180);
    GROUND_MESH.receiveShadow = true;
    scene.add(GROUND_MESH);
}

//-----------------------------------------------------------------------------------------------
// (2) MMD 3d-models load and add to the scene
//-----------------------------------------------------------------------------------------------
function loadMMD(modelName) {
    // creating an instance
    const LOADER = new MMDLoader();

    // .pmd / .pmx file loading
    var selectModelPath = MODEL_FILES[modelName];
    document.querySelector('title').textContent = modelName;

    // when loading, show the cover page
    progressDiv.style.width = '0';
    progressBgDiv.style.display = 'block';
    progressBarDiv.style.display = 'block';

    LOADER.load(
        selectModelPath,
        function (mmd) {
            mesh = mmd;
            for (let i = 0; i < mesh.material.length; i++) {
                mesh.material[i].emissive.multiplyScalar(0.3);
                mesh.material[i].userData.outlineParameters.thickness = 0.001;
                mesh.material[i].transparent = true;
            }
            
            mesh.castShadow = modelShadow;
            mesh.receiveShadow = true;
            // applying a magnification
            // In three.js, 1 unit is equal to 1 meter. 
            // For example, to make the height of the NicoNico Douga character Alicia Solid 148 cm,
            // which is 0.071 times her actual height, you would scale her mesh accordingly.
            // set to the height of the Fishl scale
            mesh.scale.copy(new THREE.Vector3(1, 1, 1).multiplyScalar(0.25)); // 0.086
            // To obtain the height information of the model, create a bounding box
            const BOUNDING_BOX = new THREE.Box3().setFromObject(mesh);
            // scale adjustment
            charactercenter = (BOUNDING_BOX.max.y + BOUNDING_BOX.min.y) / 2;
            var height = charactercenter * 2 * 100;
            // set the camera position
            camera.position.set(0, charactercenter, (0.03 * height) - 0.37);
            // save the initial camera position and rotation
            initCameraPosition = camera.position.clone();
            initCameraRotation = camera.rotation.clone();
            // set the position of the controls target
            controls.target = new THREE.Vector3(0, charactercenter, 0);
            // set the position of the spotlight target
            light.target.position.set(0, charactercenter, 0);

            // load animation
            motions = [];
            for (let i = 0; i < VMD_FILES.length; i++) {
                LOADER.loadAnimation(VMD_FILES[i].file, mesh, function (motion) {
                    motions[i] = motion;
                    motions[i].name = VMD_FILES[i].name;
                });
            }

            // options: audio, physics, camera...
            ANIMATION_HELPER.add(mesh, { animation: motions, physics: modelPhysics });
            // get an AnimationMixer to control playback, stop, and pause
            animationMixer = ANIMATION_HELPER.objects.get(mesh).mixer;
            // stop a motion started by AnimationHelper
            animationMixer.stopAllAction();
            // set the initial pose
            mesh.pose();
            // Add mesh to the scene.
            scene.add(mesh);

            // set the initial position. when model moved and reload, reset the position
            resetPosition();
            
            // save the mesh to the meshCache, when model reload, get the mesh from the meshCache
            meshCache[modelName] = mesh;
            // get MorphTargetDictionary value
            LoadModel(mesh);
            // load audio
            LoadAudio('../assets/audio/test.wav');

            // loading page. 3s later, ever 0.3s update the progress
            let timeCount = 0;
            let timeInterval = 300;
            let timeTotalCount = 10;
            const intervalId = setInterval(() => {
                timeCount++;
                if (timeCount <= timeTotalCount) {
                    progressDiv.style.width = `${timeCount * 5 + 50}%`;
                }
                if (timeCount === (timeTotalCount + 2)) {
                    clearInterval(intervalId);
                    progressDiv.style.width = '0';
                    progressBgDiv.style.display = 'none';
                    progressBarDiv.style.display = 'none';
                    // progressDiv.style.zIndex = '990';
                    // progressBgDiv.style.zIndex = '990';
                    // progressBarDiv.style.zIndex = '990';
                }
            }, timeInterval);
        },
        // onProgress callback
        function (xhr) {
            const progress = (xhr.loaded / xhr.total);
            progressDiv.style.width = `${progress * 50}%`;
        },
        // onError callback
        function (err) {
            console.error('An error happened');
        }
    );
}

//-----------------------------------------------------------------------------------------------
// (3) Rendering (rendering loop).
//-----------------------------------------------------------------------------------------------
let fps = 30;  // Target FPS.
let now;
let then = Date.now();
let interval = 1000 / fps;
let delta;
function sceneRender() {
    window.requestAnimationFrame(sceneRender);

    UpdateMorphTargetByAudio();

    now = Date.now();
    delta = now - then;

    if (delta > interval) {
        then = now - (delta % interval);
        // Write the code to run animation here
        stats.begin();

        if (motionIndex !== -1) {
            // if the animation has multiple emoticons, update morphTarget slider value here.
            setMorphTargetSliderValue();
            // update animation
            ANIMATION_HELPER.update(CLOCK.getDelta());
        }
        // Applying OutlineEffect
        effect.render(scene, camera);

        stats.end();
    }

}

//***********************************************************************************************
// Event
//***********************************************************************************************
//-----------------------------------------------------------------------------------------------
// Handling browser (window) resize event.
//-----------------------------------------------------------------------------------------------
window.addEventListener('resize', function () {
    // Responsive design.
    effect.setSize(canvasSizeW, canvasSizeH);
    // camera.aspect = window.innerWidth / window.innerHeight;
    // camera.updateProjectionMatrix();
    // renderer.setSize(window.innerWidth, window.innerHeight);
}, false);


function setMorphTargetSliderValue() {
    let morphTargetDict = mesh.morphTargetDictionary;
    let morphTargetInfluences = mesh.morphTargetInfluences;
    let index = 0;
    for (let key in morphTargetDict) {
        morphTargetDict[key] = morphTargetInfluences[index];
        index++;
    }
    onMorphTargetChanged(morphTargetDict);
}

function resetPosition() {
    camera.position.copy(initCameraPosition);
    camera.rotation.copy(initCameraRotation);
    controls.target = new THREE.Vector3(0, charactercenter, 0);
    controls.update(0);
}

// tool form buttons event
// motion, dynamic add motion
for (let i = 0; i < VMD_FILES.length; i++) {
    var button = document.createElement("button");
    button.innerHTML = VMD_FILES[i].name;
    button.setAttribute("type", "button");
    button.setAttribute("class", "btn pose-btn");
    button.addEventListener('click', function () {
        // if motionIndex is -1, it means that no motion is playing. then play the motion.
        if (motionIndex === -1) {
            if (poseIndex !== -1) {
                document.pose_form.elements[poseIndex].classList.remove("active-btn");
            }
            document.motion_form.elements[i].classList.add("active-btn");
            animationMixer.clipAction(motions[i]).timeScale = motionSpeed;
            animationMixer.clipAction(motions[i]).play();
            animationMixer.clipAction(motions[i]).setLoop(THREE.Loop);
            motionIndex = i;
            poseIndex = -1;
        // if the motion is active and not paused, pause the motion.
        } else if (motionIndex === i && animationMixer.clipAction(motions[i]).paused === false) {
            document.motion_form.elements[i].classList.remove("active-btn");
            document.motion_form.elements[i].classList.add("pause-btn");
            animationMixer.clipAction(motions[i]).paused = true;
        // if the motion is active but paused, resume the motion.
        } else if (motionIndex === i && animationMixer.clipAction(motions[i]).paused === true) {
            document.motion_form.elements[i].classList.add("active-btn");
            document.motion_form.elements[i].classList.remove("pause-btn");
            animationMixer.clipAction(motions[i]).paused = false;
        // if the motion is active, but not this motion, stop the active motion and play this motion.
        } else {
            document.motion_form.elements[motionIndex].classList.remove("active-btn");
            document.motion_form.elements[motionIndex].classList.remove("pause-btn");
            document.motion_form.elements[i].classList.add("active-btn");
            animationMixer.clipAction(motions[motionIndex]).stop();
            animationMixer.clipAction(motions[i]).timeScale = motionSpeed;
            animationMixer.clipAction(motions[i]).play();
            animationMixer.clipAction(motions[i]).setLoop(THREE.Loop);
            motionIndex = i;
            poseIndex = -1;
        }
        ANIMATION_HELPER.update(CLOCK.getDelta());
        setMorphTargetSliderValue();
    }, false);

    document.motion_form.appendChild(button);
}
// pose, dynamic add button
for (let i = 0; i < VPD_FILES.length; i++) {
    var button = document.createElement("button");
    button.innerHTML = VPD_FILES[i].name;
    button.setAttribute("type", "button");
    button.setAttribute("class", "btn pose-btn");
    button.addEventListener('click', function () {
        const LOADER = new MMDLoader();
        // if poseIndex is -1, it means that no pose is active. then load the pose.
        if (poseIndex === -1) {
            if (motionIndex !== -1) {
                document.motion_form.elements[motionIndex].classList.remove("active-btn");
                document.motion_form.elements[motionIndex].classList.remove("pause-btn");
            }
            document.pose_form.elements[i].classList.add("active-btn");
            animationMixer.stopAllAction();
            LOADER.loadVPD(VPD_FILES[i].file, false, function (pose) {
                ANIMATION_HELPER.pose(mesh, pose, {
                    resetPose: true,
                    ik: true,
                    grant: true
                });
            });
            motionIndex = -1;
            poseIndex = i;
        // if the pose is active, reset the pose.
        } else if (poseIndex === i) {
            document.pose_form.elements[i].classList.remove("active-btn");
            mesh.pose();
            poseIndex = -1;
        // if the other pose is active, reset the pose and load this pose.
        } else {
            document.pose_form.elements[poseIndex].classList.remove("active-btn");
            document.pose_form.elements[i].classList.add("active-btn");
            LOADER.loadVPD(VPD_FILES[i].file, false, function(pose) {
                ANIMATION_HELPER.pose(mesh, pose, {
                    resetPose: true
                });
            });
            motionIndex = -1;
            poseIndex = i;
        }
        // update morphTarget slider value
        setMorphTargetSliderValue();
    }, false);

    document.pose_form.appendChild(button);
}
// record button event
$('#webm_recorder').on('click', function () {
    $(this).toggleClass('recording');
    if (isRecording === false) {
        // set button text
        this.innerHTML = '停止记录';
        isRecording = true;
        const MEDIA_STREAM = renderer.domElement.captureStream(24);
        mediaRecorder = new MediaRecorder(MEDIA_STREAM, {
            mimeType: 'video/webm; codecs=vp9'
        });
        mediaRecorder.start();
        mediaRecorder.ondataavailable = function(event) {
            const BLOB_URL = URL.createObjectURL(new Blob([event.data], {
                type: event.data.type
            }));
            const A = document.createElement('a');
            A.download = 'webmfile.webm';
            A.href = BLOB_URL;
            A.click();
            URL.revokeObjectURL(BLOB_URL);
        };
    } else if (isRecording === true) {
        this.innerHTML = 'webm 媒体记录';
        isRecording = false;
        mediaRecorder.stop();
    }
});
$('#png_download').on('click', function () {
    renderer.domElement.getContext('webgl2', {
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setScissor(0, 0, canvasSizeW / 2, canvasSizeH);
    renderer.setViewport(-1 * canvasSizeW / 4, 0, canvasSizeW, canvasSizeH);
    effect.render(scene, camera);
    renderer.setScissor(canvasSizeW / 2, 0, canvasSizeW / 2, canvasSizeH);
    renderer.setViewport(canvasSizeW / 4, 0, canvasSizeW, canvasSizeH);
    effect.render(scene, camera);
    renderer.domElement.toBlob(function(blob) {
        const BLOB_URL = URL.createObjectURL(blob);
        const A = document.createElement('a');
        A.download = 'pngfile.png';
        A.href = BLOB_URL;
        A.click();
        URL.revokeObjectURL(BLOB_URL);
    }, 'image/png');
    renderer.domElement.getContext('webgl2', {
        antialias: true,
        preserveDrawingBuffer: false
    });
});
// reset button event
$('#reset_position').on('click', function () {
    resetPosition();
});
$('#shadow_toggle').on('click', function () {
    $(this).toggleClass('press_down');
    if (modelShadow === false) {
        modelShadow = true;
        $(this).text('模型阴影: 开');
    } else if (modelShadow === true) {
        modelShadow = false;
        $(this).text('模型阴影: 关');
    }
    mesh.castShadow = modelShadow;
});

let $physicsToggle = $('#physics_toggle');
let $popup = $('.popup');

function updatePhysics() {
    $physicsToggle.toggleClass('press_down');
    if (modelPhysics === false) {
        modelPhysics = true;
        $physicsToggle.text('物理效果: 开');
    } else if (modelPhysics === true) {
        modelPhysics = false;
        $physicsToggle.text('物理效果: 关');
    }
    ANIMATION_HELPER.enable('physics', modelPhysics);
    ANIMATION_HELPER.update(0);
}

$physicsToggle.on('click', function () {
    if (modelPhysics === false) {
        $popup.toggleClass('active');
    } else {
        updatePhysics();
    }
});
// popup window event: confirm button
$('#popup_confirm').on('click', function () {
    updatePhysics();
    $popup.removeClass('active');
});
// popup window event: cancel button
$('#popup_cancel').on('click', function () {
    $popup.removeClass('active');
});
$(document).mouseup(function(e) {
    let container = $(".popup-container");
    if (!container.is(e.target) && container.has(e.target).length === 0) {
        $popup.removeClass('active');
    }
});

// motion speed slider event
$('#motion_speed_slider').on("input", function() {
    let value = $(this).val();
    motionSpeed = value;
    // 判断 mesh 是否正在播放动画
    if (motionIndex !== -1) {
        animationMixer.clipAction(motions[motionIndex]).timeScale = motionSpeed;
    }
    $("#motion_speed_value").text(value);
});
$('#reload_model').on('click', function () {
    scene.remove(mesh);
    loadMMD($('#model_select').val());
    // reset motion and pose
    if (motionIndex !== -1) {
        document.motion_form.elements[motionIndex].classList.remove("active-btn");
        document.motion_form.elements[motionIndex].classList.remove("pause-btn");
        motionIndex = -1;
    }
    if (poseIndex !== -1) {
        document.pose_form.elements[poseIndex].classList.remove("active-btn");
        poseIndex = -1;
    }
});
// model select event
$('#model_select').on('change', function() {
    let val = $(this).val();
    // reset audio
    ResetAudio();
    // destroy the previous model
    if (mesh !== {}) {
        mesh.pose();
        scene.remove(mesh);
        mesh = {};
    }
    // check if the model is loaded
    if (val in meshCache) {
        mesh = meshCache[val];
        LoadModel(mesh);
        // get the animation mixer
        animationMixer = ANIMATION_HELPER.objects.get(mesh).mixer;
        // stop a motion started by AnimationHelper
        animationMixer.stopAllAction();
        // To obtain the height information of the model, create a bounding box
        const BOUNDING_BOX = new THREE.Box3().setFromObject(mesh);
        // set the position of the camera
        // scale adjustment
        charactercenter = (BOUNDING_BOX.max.y + BOUNDING_BOX.min.y) / 2;
        var height = charactercenter * 2 * 100;
        // set the camera position
        camera.position.set(0, charactercenter, (0.03 * height) - 0.37);
        // save the initial camera position and rotation
        initCameraPosition = camera.position.clone();
        initCameraRotation = camera.rotation.clone();
        // set the position of the controls target
        controls.target = new THREE.Vector3(0, charactercenter, 0);
        // set the position of the spotlight target
        light.target.position.set(0, charactercenter, 0);
        // set the initial pose
        mesh.pose();
        scene.add(mesh);
    } else {
        loadMMD(val);
    }
    // reset motion and pose
    if (motionIndex !== -1) {
        document.motion_form.elements[motionIndex].classList.remove("active-btn");
        document.motion_form.elements[motionIndex].classList.remove("pause-btn");
        motionIndex = -1;
    }
    if (poseIndex !== -1) {
        document.pose_form.elements[poseIndex].classList.remove("active-btn");
        poseIndex = -1;
    }
});


// Displaying FPS in the bottom-right corner of the screen.
var stats = new Stats();
stats.showPanel(0);
Object.assign(stats.dom.style, {
    'position': 'fixed',
    'height': 'max-content',
    'left': 'auto',
    'right': 0,
    'top': 'auto',
    'bottom': '0',
    'z-index': '1000'
});
document.body.appendChild(stats.dom);

function getParam(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
