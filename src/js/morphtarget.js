import { MMD_TRANSLATE } from './data/translate.js';

import {
    Audio,
    AudioLoader,
    AudioListener,
    AudioAnalyser,
} from 'three';


// model data init
let mesh = {};
let morphTargetDict = {};
let defaultMorphTargetDict = {};

// button init
let readySpeakFlag = false;

// audio init
const listener = new AudioListener();
const audio = new Audio(listener);
const fftSize = 128;
let analyser;

// html element init
let morphTargetControls = {};
let morphTargetKeys = [];
let morphTargetSliders = [];

export function LoadAudio( audioFile ) {
    const loader = new AudioLoader();
    loader.load( audioFile, function ( buffer ) {
        audio.setBuffer( buffer );
        audio.setLoop( false );
        audio.setVolume( 0.5 );
        // audio.play();
        readySpeakFlag = true;
    });
    analyser = new AudioAnalyser( audio, fftSize );
}

function onMorphTargetSliderChanged(event) {
    for (let i = 0; i < morphTargetKeys.length; i++) {
        const value = morphTargetSliders[i].value;
        mesh.morphTargetInfluences[i] = parseFloat(value);
    }
    // renderer.render(scene, camera);
}

function resetMorphTarget() {
    for (let i = 0; i < morphTargetKeys.length; i++) {
        morphTargetSliders[i].value = defaultMorphTargetDict[morphTargetSliders[i].getAttribute("data-key")];
    }
    onMorphTargetSliderChanged();
    // renderer.render(scene, camera);
}

export function LoadModel(_mesh) {
    // get value
    mesh = _mesh;

    // init value
    morphTargetDict = {};
    defaultMorphTargetDict = {};
    morphTargetControls = {};
    morphTargetKeys = [];
    morphTargetSliders = [];
    
    // set value
    morphTargetDict = mesh.morphTargetDictionary;
    for (const key in morphTargetDict) {
        morphTargetControls[key] = 0.0;
        morphTargetKeys.push(key);
        defaultMorphTargetDict[key] = 0.0;
    }
    // morphTargetControls.pose = -1;

    // create morphTarget sliders
    const $div = $("#morph_target_ctls");
    $div.empty();
    for (const key in morphTargetDict) {
        const subDiv = document.createElement("div");
        subDiv.setAttribute("class", "morph_target_item");
        const slider = document.createElement("input");
        slider.setAttribute("type", "range");
        slider.setAttribute("min", 0);
        slider.setAttribute("max", 1);
        slider.setAttribute("step", 0.01);
        slider.setAttribute("data-key", key);
        slider.setAttribute("value", 0.0);
        const span = document.createElement("span");
        let text = key in MMD_TRANSLATE ? MMD_TRANSLATE[key] : key + "(no translate)";
        span.innerText = text;
        span.setAttribute("title", text);
        subDiv.appendChild(span);
        subDiv.appendChild(slider);
        morphTargetSliders.push(slider);
        $div.append(subDiv);
    }
    // judge if div have event and the event is input
    if ($div.data("events") && $div.data("events").input) {
        $div.off("input");
    }
    $div.on("input", onMorphTargetSliderChanged);

    // reset morphTarget
    resetMorphTarget();

    // bind button event
    let $pauseSpeakBtn = $("#pause_speak_btn");
    if ($pauseSpeakBtn.data("events") && $pauseSpeakBtn.data("events").click) {
        $pauseSpeakBtn.off("click");
    }
    $pauseSpeakBtn.on("click", function() {
        if (audio.isPlaying) {
            audio.pause();
            $(this).text("继续播放");
        } else {
            audio.play();
            $(this).text("暂停说话");
        }
    });
    let $startSpeakBtn = $("#start_speak_btn");
    if ($startSpeakBtn.data("events") && $startSpeakBtn.data("events").click) {
        $startSpeakBtn.off("click");
    }
    $startSpeakBtn.on("click", function() {
        if (readySpeakFlag) {
            audio.play();
            $(this).attr("disabled", true);
        }
    });
    let $resetMorphBtn = $("#reset_morph_btn");
    if ($resetMorphBtn.data("events") && $resetMorphBtn.data("events").click) {
        $resetMorphBtn.off("click");
    }
    $resetMorphBtn.on("click", resetMorphTarget);
}


export function onMorphTargetChanged(controls) {
    for (let i = 0; i < morphTargetKeys.length; i++) {
        const key = morphTargetKeys[i];
        const value = controls[key];
        morphTargetSliders[i].value = value;
        mesh.morphTargetInfluences[i] = value;
    }
}

function transformValue(v, x=0, y=1) {
    // v: 0-255
    // return: x-y 
    return v / 256 * (y - x) + x;
}

const fftMap = {
    // 嘴O形缩放
    "あ": {
        idx: 0,
        x: 0.35,
        y: 0.4
    },
    // 嘴左右方形缩放
    "い": {
        idx: 54,
        x: 0,
        y: 1
    },
    // 嘴向中间挤压
    "お": {
        idx: 6,
        x: 0,
        y: 1
    },
    // 惊喜（上睫毛上提）
    "びっくり": {
        idx: 57,
        x: 0,
        y: 1
    },
    // 眉毛微笑
    "にこり": {
        idx: 48,
        x: 0,
        y: 1
    },
    // 眉毛上移
    "上": {
        idx: 24,
        x: 0,
        y: 1
    },
    "俯瞰煽り": {
        idx: 12,
        x: 0,
        y: 1
    },
}

function fft2Morph(fft) {
    let ret = {};
    Object.assign(ret, defaultMorphTargetDict);
    for (const key in fftMap) {
        const val = fftMap[key];
        ret[key] = transformValue(fft[val.idx], val.x, val.y);
    }
    return ret;
}

export function UpdateMorphTargetByAudio() {
    let fft;
    if (audio.isPlaying) {
        analyser.getFrequencyData();
        fft = analyser.data;

        const morphs = fft2Morph(fft);
        onMorphTargetChanged(morphs);
    }
}
