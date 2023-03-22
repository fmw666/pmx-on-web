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
// 0-开始说话 1-暂停说话 2-继续结束
let speakStatus = 0;
let $startSpeakBtn = $("#start_speak_btn");

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

export function ResetAudio() {
    audio.stop();
    audio.currentTime = 0;
    audio.isPlaying = false;

    speakStatus = 0;
    $startSpeakBtn.text("开始说话");
    if ($startSpeakBtn.hasClass("pause-btn")) {
        $startSpeakBtn.toggleClass("pause-btn");
    }
}

// audio play end callback
audio.onEnded = function() {
    resetMorphTarget();
    ResetAudio();
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
    $div.off("input").on("input", onMorphTargetSliderChanged);

    // reset morphTarget
    resetMorphTarget();

    // bind button event
    $startSpeakBtn.off("click").on("click", function() {
        // 0-开始说话 1-暂停说话 2-继续结束
        if (speakStatus === 0) {
            if (readySpeakFlag) {
                audio.play();
                speakStatus = 1;
                $(this).text("暂停说话")
                $(this).toggleClass("pause-btn");
            }
        } else if (speakStatus === 1) {
            if (audio.isPlaying) {
                audio.pause();
                speakStatus = 2;
                $(this).text("继续说话")
                $(this).toggleClass("pause-btn");
            }
        } else if (speakStatus === 2) {
            if (!audio.isPlaying) {
                audio.play();
                speakStatus = 1;
                $(this).text("暂停说话")
                $(this).toggleClass("pause-btn");
            }
        }
    });

    let $loadAudioBtn = $("#load_audio_btn");
    $loadAudioBtn.off("change").on("change", function() {
        let file = $loadAudioBtn.prop("files")[0];

        // 用户选择文件，只能选择 mp3, wav, ogg 格式
        if (/\.(mp3|wav|ogg)$/i.test(file.name)) {
            if (audio.isPlaying) {
                audio.stop();
            }
            $startSpeakBtn.text("加载中...");
            $startSpeakBtn.prop("disabled", true);
            if ($startSpeakBtn.hasClass("pause-btn")) {
                $startSpeakBtn.toggleClass("pause-btn");
            }
            
            const loader = new AudioLoader();
            loader.load( URL.createObjectURL(file), function ( buffer ) {
                audio.setBuffer( buffer );
                audio.setLoop( false );
                audio.setVolume( 0.5 );
                // audio.play();
                readySpeakFlag = true;
                $startSpeakBtn.text("开始说话");
                $startSpeakBtn.prop("disabled", false);
                speakStatus = 0;
            });
            analyser = new AudioAnalyser( audio, fftSize );
        } else {
            alert("请上传 mp3, wav 或 ogg 格式的音频文件！");
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
