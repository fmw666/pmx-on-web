import { MODEL_FILES } from './data/filelist.js';


export function InitMenu() {
    // open and close menu
    let $menuToggle = $('#menu_toggle');
    let $toolMenu = $('#tool_menu');
    // get all .section
    let $sections = $('.section');

    $menuToggle.on('click', function() {
        $toolMenu.toggleClass('open');
        $menuToggle.toggleClass('open');
        $sections.toggleClass('open');
    });

    // init model select
    let $modelSelect = $('#model_select');
    let options = '';
    const modelKeys = Object.keys(MODEL_FILES);
    for (let i = 0; i < modelKeys.length; i++) {
        options += `<option value="${modelKeys[i]}">${modelKeys[i]}</option>`;
    }
    $modelSelect.append(options);

    // motion form and pose form
    let $motionForm = $('form[name="motion_form"]');
    let $poseForm = $('form[name="pose_form"]');
    
    let $motionFormToggle = $('#motion_form_toggle');
    let $poseFormToggle = $('#pose_form_toggle');

    let motionOpenFlag = false;
    let poseOpenFlag = false;

    $motionFormToggle.on('click', function() {
        $motionFormToggle.toggleClass('press_down');
        if (motionOpenFlag) {
            $motionForm.css('height', '0');
            $motionForm.css('overflow', 'hidden');
            $motionForm.animate({scrollTop: 0}, 800);
            motionOpenFlag = false;
        } else {
            $motionForm.css('height', '41vh');
            $motionForm.css('overflow-y', 'auto');
            motionOpenFlag = true;

            if (poseOpenFlag) {
                $poseFormToggle.toggleClass('press_down');
                $poseForm.css('height', '0');
                $poseForm.css('overflow', 'hidden');
                $poseForm.animate({scrollTop: 0}, 800);
                poseOpenFlag = false;
            }
        }
    });

    $poseFormToggle.on('click', function() {
        $poseFormToggle.toggleClass('press_down');
        if (poseOpenFlag) {
            $poseForm.css('height', '0');
            $poseForm.css('overflow', 'hidden');
            $poseForm.animate({scrollTop: 0}, 800);
            poseOpenFlag = false;
        } else {
            $poseForm.css('height', '41vh');
            $poseForm.css('overflow-y', 'auto');
            poseOpenFlag = true;

            if (motionOpenFlag) {
                $motionFormToggle.toggleClass('press_down');
                $motionForm.css('height', '0');
                $motionForm.css('overflow', 'hidden');
                $motionForm.animate({scrollTop: 0}, 800);
                motionOpenFlag = false;
            }
        }
    });

    $('#motion_pull').css('display', 'none');

    $('#motion_pull').on('click', function() {
        $('#motion_section').css('height', '61vh');
        $('#speak_section').css('height', '10vh');
        $('#speak_pull').css('display', 'block');
        $('#motion_pull').css('display', 'none');
    });

    $('#speak_pull').on('click', function() {
        $('#motion_section').css('height', '13vh');
        $('#speak_section').css('height', '57vh');
        $('#speak_pull').css('display', 'none');
        $('#motion_pull').css('display', 'block');
    });
}
