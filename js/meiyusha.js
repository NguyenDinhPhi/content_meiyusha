/* eslint-disable no-new */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-case-declarations */
/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
/* eslint-disable no-shadow */

/* eslint-disable no-unused-expressions */
var g_buttonAnimateInterval = {};
var g_actionState;
var g_selectedButton;
var g_isPlaying = false;
var g_stepCount;
var g_isChanged = false;
var g_isDisabledBtn1 = true;
var g_isDisabledBtn2 = false;
var g_isDisabledBtn3 = true;
var g_isAnimatingButton = {};
var g_checkboxActive = true;
var g_latestMousePress = "";
var g_interval;
var g_interval2;
var g_isRunning = false;
var duration = 10000;
var nFrame = 300;
var intialP = -624;
var intialQ = 760;
var middleP;
var middleQ;
var stepP = intialP / nFrame;
var stepQ = intialQ / nFrame;
var g_currentPosition = "middle";

// ===== state =====

let g_state;

const initState = () => {
    let popupInfo = {
        width: 882,
        height: 292,
        min_visible_x: 0.5 * 882,
        min_visible_y: 0.5 * 292,
        init_x: 199,
        init_y: 334,
    };

    let popupInfo_2 = {
        width: 732,
        height: 272,
        min_visible_x: 0.5 * 732,
        min_visible_y: 0.5 * 272,
        init_x: 82.65 + 191.35,
        init_y: 275.41 + 68.59,
    };

    g_state = {
        version: "20230413",
        is_show_log: false,
        is_init_canvas: false,

        menu: 1, // 1,  2, 3
        menu_item_selected: 1, // null, 1, 2, 3
        show_popup: false,
        delete_mode: false,

        c_screen_width: 1280,
        c_screen_height: 960,
        origin_radius: { x: 601, y: 409 },
        menu_data: {
            1: {
                allow_rotate: false,
                points_origin: [],
                center: null,
                points: [
                    { x: 536.86, y: 380.54, z: 0 },
                    { x: 669.86, y: 214.28, z: 0 },
                    { x: 669.86, y: 380.54, z: 0 },
                ],
                rotate: 0,
                rotate_ruler: 0,
                translate_ruler: { tx: 0, ty: 0 },
            },
            2: {
                allow_rotate: false,

                points_origin: [],
                center: null,
                points: [
                    { x: 536.23, y: 380.54, z: 0 },
                    { x: 602.73, y: 228.14, z: 0 },
                    { x: 669.23, y: 380.54, z: 0 },
                ],
                rotate: 0,
                rotate_ruler: 0,
                translate_ruler: { tx: 0, ty: 0 },
            },
            3: {
                allow_rotate: false,
                points_origin: [],
                center: null,
                points: [
                    { x: 538.77, y: 380.54, z: 0 },
                    { x: 612.27, y: 253.41, z: 0 },
                    { x: 685.77, y: 380.54, z: 0 },
                ],
                rotate: 0,
                rotate_ruler: 0,
                translate_ruler: { tx: 0, ty: 0 },
            },
        },

        fnCalculateShapePoints: function (points, point_number) {
            let u = _(points.split(" "))
                .chunk(2)
                .value()
                .map((x) => new Point3D(Number(x[0]), Number(x[1]), 0))
                .slice(-point_number);
            console.log(JSON.stringify(u));
        },

        fnCalculateRotatedPoint: function (a2) {
            let dragRulerCtrl = getControl("drag-ruler");
            let ctrl = getControl("drag-ruler-rotate");
            let a0 = new Point3D(Number(getEl("#rule-top-point").attr("cx")), Number(getEl("#rule-top-point").attr("cy")), 0);
            let a1 = a0.add({ x: 0, y: 0, z: 1 });
            // let a2 = new Point3D(Number(getEl("#rule-top-point").attr("cx")), Number(getEl("#rule-top-point").attr("cy")), 0);
            let a3 = MathLib.customRotate(a2, a0, a1, ctrl.rotate || 0);
            let a4 = new Point3D(
                (dragRulerCtrl.info.tx || 0) + dragRulerCtrl.info.init_x,
                (dragRulerCtrl.info.ty || 0) + dragRulerCtrl.info.init_y,
                0
            );

            let p = a3.add(a4);

            return p;
        },
        fnCalculateRotatedPoint2: function (el) {
            let rSVG = getSVGRect(el);

            // console.log(rSVG);
            let pSVG = new Point3D(rSVG.x + rSVG.width / 2, rSVG.y + rSVG.height / 2, 0);

            return pSVG;
        },
        setDeleteMode: function (mode) {
            g_state.delete_mode = !!mode;
            console.log("set delete mode", g_state.delete_mode);
            getControl("btn-rotate").render();
        },
        fnCheckReload: function () {
            console.log("fnCheckReload");
            let isReload = false;
            isReload = _.some([
                g_state.controls.find((x, idx) => !x.is_skip_check_reload && x.value != g_default_state.controls[idx].value),
                g_state.is_init_canvas
                    ? // check if canvas camera is rotated
                      Math.abs(g_cameraRotationInit.x - camera.rotation.x) > CONST.EPSILON ||
                      Math.abs(g_cameraRotationInit.y - camera.rotation.y) > CONST.EPSILON ||
                      Math.abs(g_cameraRotationInit.z - camera.rotation.z) > CONST.EPSILON
                    : false,
            ]);

            let ctrlReload = getControl("reload");

            if (isReload) {
                ctrlReload.value = "inactive";
            } else {
                // skip disabled reload now
            }

            ctrlReload.render();
        },

        controls: [
            // "shape-point"
            new Control({
                name: "shape-point",
                type: "drag",
                class_name: "draw-point",
                is_dynamic: true,
                value: "inactive",
                is_mouseup_on_el: true,
                event_for_active_state: true,
                ignore_mouseup: true,

                fn_drag: function ({ value, eventName }) {
                    let ctrl = this;

                    let menuData = g_state.menu_data[g_state.menu_item_selected];

                    ctrl.eventName = eventName;

                    if (eventName == "mousedown") {
                        ctrl.point_begin = new Point3D(ctrl.curPos.x, ctrl.curPos.y, 0);
                    } else {
                        ctrl.point_end = new Point3D(ctrl.curPos.x, ctrl.curPos.y, 0);
                    }

                    let foundPoint = null;

                    let mDist = 4;

                    let pCursor = new Point3D(ctrl.curPos.x, ctrl.curPos.y, 0);
                    if (ctrl.foundDeleteLine) {
                        pCursor = ctrl.curPosMousemove;
                    }

                    switch (eventName) {
                        case "mousedown":
                            let origin_O = new Point3D(g_state.origin_radius.x, g_state.origin_radius.y, 0);

                            let origin_A = new Point3D(ctrl.point_begin.x, ctrl.point_begin.y, 0);

                            let length_R = 210;

                            let coor_cricle = MathLib.getPointByLength(origin_O, origin_A, length_R);

                            ctrl.point_begin = coor_cricle;

                            foundPoint = ctrl.point_begin;

                            let foundDeleteLine = false;
                            if (menuData.line_delete.length) {
                                foundDeleteLine = menuData.line_delete.find((l) => {
                                    return MathLib.length3D(l.point_begin, pCursor) < 20;
                                });
                            }

                            ctrl.is_delete_line = false;

                            if (foundDeleteLine) {
                                if ($("#point-cricle-1").children("polygon").length == 0) {
                                    $(`#point-cricle-1 .point-drawed[data-idx="${foundDeleteLine.idx}"]`).remove();
                                    $(`#point-cricle-1 .line-drawed[data-idx="${foundDeleteLine.idx}"]`).remove();
                                    if ($("#point-cricle-1").children("line").length == 1) {
                                        getControl("btn-show-rectangle").value = "disabled";
                                        getControl("btn-show-rectangle").render();
                                    }
                                }

                                if ($("#point-cricle-2").children("polygon").length == 0) {
                                    $(`#point-cricle-2 .point-drawed[data-idx="${foundDeleteLine.idx}"]`).remove();
                                    $(`#point-cricle-2 .line-drawed[data-idx="${foundDeleteLine.idx}"]`).remove();

                                    if ($("#point-cricle-2").children("line").length == 1) {
                                        getControl("btn-show-rectangle").value = "disabled";
                                        getControl("btn-show-rectangle").render();
                                    }
                                    // console.log(foundDeleteLine.idx)

                                    // if(foundDeleteLine.idx == 4 || foundDeleteLine.idx == 6){
                                    //     getControl("btn-show-rectangle").value = "disabled"
                                    //     getControl("btn-show-rectangle").render()
                                    // }
                                }

                                menuData.line_delete = menuData.line_delete.filter((x) => x.idx != foundDeleteLine.idx);
                                ctrl.point_begin = null;
                                ctrl.point_end = null;
                                ctrl.is_delete_line = true;
                                return;
                            }

                            if (foundPoint) {
                                ctrl.point_begin = foundPoint;

                                menuData.line_delete.push({
                                    point_begin: ctrl.point_begin,
                                    idx: (_.max(menuData.line_delete.map((x) => x.idx)) || 0) + 1,
                                });

                                ctrl.drawing_point = [
                                    $(
                                        SVGLib.createTag("circle", {
                                            cx: ctrl.point_begin.x,
                                            cy: ctrl.point_begin.y,
                                            fill: "red",
                                            r: 5,
                                            class: "point-drawed",
                                            "data-idx": _.max(menuData.line_delete.map((x) => x.idx)) || 0,
                                        })
                                    ),
                                ];
                                ctrl.drawing_line = [
                                    $(
                                        SVGLib.createTag("line", {
                                            x1: g_state.origin_radius.x,
                                            y1: g_state.origin_radius.y,
                                            x2: ctrl.point_begin.x,
                                            y2: ctrl.point_begin.y,
                                            stroke: "black",
                                            class: "line-drawed",
                                            "stroke-width": "2px",
                                            "data-idx": _.max(menuData.line_delete.map((x) => x.idx)) || 0,
                                        })
                                    ),
                                ];

                                if ($("#point-cricle-1 circle").length != 2) {
                                    ctrl.drawing_point.forEach((el) => {
                                        $("#point-cricle-1").append(el);
                                    });

                                    ctrl.drawing_line.forEach((el) => {
                                        $("#point-cricle-1").prepend(el);
                                    });
                                }

                                if ($("#point-cricle-1 circle").length == 2) {
                                    getControl("btn-show-rectangle").value = "inactive";
                                    getControl("btn-show-rectangle").render();
                                }

                                if ($("#point-cricle-1").children("polygon").length == 1) {
                                    getControl("btn-show-rectangle").value = "disabled";
                                    getControl("btn-show-rectangle").render();

                                    if ($("#point-cricle-2 circle").length != 2) {
                                        ctrl.drawing_point.forEach((el) => {
                                            $("#point-cricle-2").append(el);
                                        });

                                        ctrl.drawing_line.forEach((el) => {
                                            $("#point-cricle-2").prepend(el);
                                        });
                                        getControl("btn-show-rectangle").value = "disabled";
                                        getControl("btn-show-rectangle").render();
                                    }
                                }

                                if ($("#point-cricle-2 polygon").length == 1) {
                                    getControl("btn-show-rectangle").value = "disabled";
                                    getControl("btn-show-rectangle").render();
                                }

                                if ($("#point-cricle-2 circle").length == 2 && $("#point-cricle-2 polygon").length != 1) {
                                    getControl("btn-show-rectangle").value = "inactive";
                                    getControl("btn-show-rectangle").render();
                                }
                            } else {
                                ctrl.point_begin = null;
                            }

                            break;

                        default:
                            break;
                    }
                    ctrl.render();
                },
                mousemove: function (event) {
                    let ctrl = this;

                    let menuData = g_state.menu_data[g_state.menu_item_selected];

                    var curPos = cursorPoint(event);
                    let pCursor = new Point3D(curPos.x, curPos.y, 0);

                    let foundDeleteLine = false;
                    if (menuData.line_delete.length) {
                        foundDeleteLine = menuData.line_delete.find((l) => {
                            return MathLib.length3D(l.point_begin, pCursor) < 10;
                        });
                    }

                    ctrl.curPosMousemove = pCursor;

                    if (foundDeleteLine) {
                        ctrl.foundDeleteLine = true;
                        return;
                    }
                },
                render: function () {
                    let menuData = g_state.menu_data[g_state.menu_item_selected];

                    let ctrl = this;
                    if (ctrl.eventName == "mouseup") {
                        ctrl.is_drag = false;
                    }
                },
            }),

            new Control({
                name: "btn-show-rectangle",
                type: "button",
                id: "btn-show-rectangle",
                value: "disabled",
                mousedown: function () {},
                mouseup: function () {
                    const ctrl = this;
                    let coorPolygon;

                    if ($("#point-cricle-2 circle").length == 2) {
                        coorPolygon = [
                            { x: `${$("#point-cricle-2 circle")[0].cx.baseVal.value}`, y: `${$("#point-cricle-2 circle")[0].cy.baseVal.value}` },
                            { x: `${g_state.origin_radius.x}`, y: `${g_state.origin_radius.y}` },
                            { x: `${$("#point-cricle-2 circle")[1].cx.baseVal.value}`, y: `${$("#point-cricle-2 circle")[1].cy.baseVal.value}` },
                        ];
                    } else if ($("#point-cricle-1 circle").length == 2) {
                        coorPolygon = [
                            { x: `${$("#point-cricle-1 circle")[0].cx.baseVal.value}`, y: `${$("#point-cricle-1 circle")[0].cy.baseVal.value}` },
                            { x: `${g_state.origin_radius.x}`, y: `${g_state.origin_radius.y}` },
                            { x: `${$("#point-cricle-1 circle")[1].cx.baseVal.value}`, y: `${$("#point-cricle-1 circle")[1].cy.baseVal.value}` },
                        ];
                    }

                    ctrl.drawing_rectangle = [
                        $(
                            SVGLib.createTag("polygon", {
                                points: `${coorPolygon[0].x}, ${coorPolygon[0].y} ${coorPolygon[1].x}, ${coorPolygon[1].y} ${coorPolygon[2].x}, ${coorPolygon[2].y}`,
                                fill: "#E1FDC4",
                            })
                        ),
                    ];

                    ctrl.drawing_line = [
                        $(
                            SVGLib.createTag("line", {
                                x1: `${coorPolygon[0].x}`,
                                y1: `${coorPolygon[0].y}`,
                                x2: `${coorPolygon[2].x}`,
                                y2: `${coorPolygon[2].y}`,
                                stroke: "black",
                                "stroke-width": "2px",
                            })
                        ),
                    ];

                    if ($("#point-cricle-1 polygon").length == 1) {
                        ctrl.drawing_line.forEach((el) => {
                            $("#point-cricle-2").prepend(el);
                        });
                        ctrl.drawing_rectangle.forEach((el) => {
                            $("#point-cricle-2").prepend(el);
                        });
                    }

                    if ($("#point-cricle-1 circle").length == 2 && $("#point-cricle-2 circle").length != 2) {
                        ctrl.drawing_line.forEach((el) => {
                            $("#point-cricle-1").prepend(el);
                        });
                        ctrl.drawing_rectangle.forEach((el) => {
                            $("#point-cricle-1").prepend(el);
                        });
                    }

                    $(".point-drawed").attr("fill", "black");

                    ctrl.value = "disabled";
                    applyControlChange();
                },
                render: function () {
                    const ctrl = this;
                    showElement(`.${ctrl.id}`, false);
                    showElement(`#${ctrl.id}-${ctrl.value}`, true);
                },
            }),

            // "rect-bg"
            new Control({
                name: "rect-bg",
                type: "clickable",
                id: "rect-bg",
                mouseup: function () {
                    let ctrlRulerRotate = getControl("drag-ruler-rotate");
                    ctrlRulerRotate.visible = false;
                    ctrlRulerRotate.render();
                },
                render: function () {},
            }),
            // "btn-rotate"
            new Control({
                name: "btn-rotate",
                type: "button",
                id: "btn-rotate",
                value: "inactive",
                event_for_active_state: true,
                ignore_mouseup: true,

                // mouseup_immediately: function () {
                //     const ctrl = this;
                //     ctrl.value = "inactive";
                //     ctrl.render();
                // },
                mouseup: function () {
                    const ctrl = this;
                    ctrl.value = {
                        active: "inactive",
                        inactive: "active",
                    }[ctrl.value];

                    let menuData = g_state.menu_data[g_state.menu_item_selected];
                    menuData.allow_rotate = ctrl.value == "active";

                    ctrl.render();

                    applyControlChange();
                },
                mousedown: function () {
                    let ctrl = this;
                    ctrl.render();

                    let ctrlRulerRotate = getControl("drag-ruler-rotate");
                    ctrlRulerRotate.visible = false;
                    ctrlRulerRotate.render();

                    applyControlChange();
                },
                render: function () {
                    const ctrl = this;
                    showElement(`.${ctrl.id}`, false);
                    showElement(getEl("#drag-rule-rotate"), false);
                    if (g_state.menu == 2) {
                        showElement(`#${ctrl.id}-${ctrl.value}`, true);
                        showElement(getEl("#drag-rule-rotate"), ctrl.value == "inactive");
                    }
                    showElement(getEl("#view-rotate-angle"), g_state.menu == 2 && ctrl.value == "active");

                    // getEl(".shape_drag_rotate").removeClass("cursor-pointer");
                    getEl(".shape_rotate").removeClass("cursor-pointer");
                    if (ctrl.value == "active") {
                        // getEl(".shape_drag_rotate").detach().insertAfter(getEl(".select-menu-item").last());
                        getEl("#drag-ruler").removeClass("cursor-pointer");
                    } else {
                        // getEl(".shape_drag_rotate").detach().insertBefore(getEl(".select-menu-item").first());
                        getEl("#drag-ruler").addClass("cursor-pointer");
                    }
                    if (g_state.delete_mode) {
                        // getEl(".shape_drag_rotate").detach().insertBefore(getEl(".select-menu-item").first());
                        $(".line-draw-delete").addClass("cursor-pointer");
                    } else {
                        $(".line-draw-delete").removeClass("cursor-pointer");
                    }
                },
            }),
            // "btn-go-top-menu"
            new Control({
                name: "btn-go-top-menu",
                type: "button",
                id: "btn-go-top-menu",
                value: "inactive",
                mouseup_immediately: function () {
                    const ctrl = this;
                    ctrl.value = "inactive";
                    ctrl.render();
                },
                mouseup: function () {
                    const ctrl = this;
                    let menuData = g_state.menu_data[g_state.menu_item_selected];
                    menuData.allow_rotate = menuData.allow_rotate_origin;

                    g_state.menu = 1;
                    g_state.menu_item_selected = null;

                    getControl("btn-show-popup").render();
                },
                mousedown: function () {
                    let ctrlRulerRotate = getControl("drag-ruler-rotate");
                    ctrlRulerRotate.visible = false;
                    ctrlRulerRotate.render();
                },
                render: function () {
                    const ctrl = this;
                    showElement(`.${ctrl.id}`, false);
                    if (g_state.menu == 2) {
                        showElement(`#${ctrl.id}-${ctrl.value}`, true);
                    }

                    if (initPalletObj) initPalletObj.getCanvas();
                },
            }),
            // "btn-show-popup"
            new Control({
                name: "btn-show-popup",
                type: "button",
                id: "btn-show-popup",
                value: "inactive",
                event_for_active_state: true,
                ignore_mouseup: true,
                // mouseup_immediately: function () {
                //     const ctrl = this;
                //     ctrl.value = "inactive";
                //     ctrl.render();
                // },
                mouseup: function () {
                    const ctrl = this;
                    g_state.show_popup = !g_state.show_popup;
                    ctrl.value = {
                        active: "inactive",
                        inactive: "active",
                    }[ctrl.value];

                    ctrl.render();

                    applyControlChange();
                },
                mousedown: function () {
                    let ctrl = this;
                    ctrl.render();
                    applyControlChange();
                },
                render: function () {
                    const ctrl = this;

                    getEl("#rect-bg").css(
                        g_state.show_popup
                            ? {
                                  fill: "transparent",
                                  cursor: "pointer",
                              }
                            : {
                                  fill: "transparent",
                                  cursor: "default",
                              }
                    );

                    showElement(`.${ctrl.id}`, false);
                    showElement(`#${ctrl.id}-${ctrl.value}`, true);
                    showElement(getEl("#popup"), g_state.show_popup);

                    let ctrlRulerRotate = getControl("drag-ruler-rotate");
                    ctrlRulerRotate.visible = false;
                    ctrlRulerRotate.render();
                },
            }),
            new Control({
                name: "btn-show-popup-2",
                type: "button",
                id: "btn-show-popup-2",
                value: "inactive",
                event_for_active_state: true,
                ignore_mouseup: true,
                // mouseup_immediately: function () {
                //     const ctrl = this;
                //     ctrl.value = "inactive";
                //     ctrl.render();
                // },
                mouseup: function () {
                    const ctrl = this;
                    g_state.show_popup_2 = !g_state.show_popup_2;
                    ctrl.value = {
                        active: "inactive",
                        inactive: "active",
                    }[ctrl.value];

                    ctrl.render();

                    applyControlChange();
                },
                mousedown: function () {
                    let ctrl = this;
                    ctrl.render();
                    applyControlChange();
                },
                render: function () {
                    const ctrl = this;

                    getEl("#rect-bg").css(
                        g_state.show_popup_2
                            ? {
                                  fill: "transparent",
                                  cursor: "pointer",
                              }
                            : {
                                  fill: "transparent",
                                  cursor: "default",
                              }
                    );

                    showElement(`.${ctrl.id}`, false);
                    showElement(`#${ctrl.id}-${ctrl.value}`, true);
                    showElement(getEl("#popup_2"), g_state.show_popup_2);
                    // showElement(`#popup-content`, false);
                    // showElement(`#popup-content-2`, true);
                },
            }),
            // "drag-popup"
            new Control({
                name: "drag-popup",
                type: "drag",
                id: "drag-popup",
                x_scope: [0, 1],
                scope: [0, 1],
                minimum: 0.001,
                value: 0,
                info: popupInfo,
                fn_drag: function ({ value, eventName }) {
                    let ctrl = this;
                    ctrl.eventName = eventName;

                    if (eventName == "mousedown") {
                        ctrl.offset = {
                            x: ctrl.curPos.x,
                            y: ctrl.curPos.y,
                        };
                        ctrl.translate = SVGLib.getTranslate(getEl("#popup-content"));
                    } else {
                        ctrl.render();
                    }

                    if (eventName == "mouseup") {
                        delete ctrl.offset;
                    }
                },
                render: function () {
                    let ctrl = this;
                    if (ctrl.offset) {
                        let { translate } = ctrl;

                        if (!ctrl.scopeTx) {
                            let width = _.get(ctrl, ["info", "width"], 0);
                            let height = _.get(ctrl, ["info", "height"], 0);
                            let initX = _.get(ctrl, ["info", "init_x"], 0);
                            let initY = _.get(ctrl, ["info", "init_y"], 0);

                            let minVisibleX = _.get(ctrl, ["info", "min_visible_x"], 0);
                            let minVisibleY = _.get(ctrl, ["info", "min_visible_y"], 0);

                            let scopeTx = [-width + minVisibleX - initX, g_state.c_screen_width - minVisibleX - initX];
                            let scopeTy = [-height + minVisibleY - initY, g_state.c_screen_height - initY - minVisibleY];

                            ctrl.scopeTx = scopeTx;
                            ctrl.scopeTy = scopeTy;
                        }

                        let { scopeTx, scopeTy } = ctrl;

                        let tx = ctrl.curPos.x - ctrl.offset.x + translate.left;
                        let ty = ctrl.curPos.y - ctrl.offset.y + translate.top;

                        let isMeetBounding = false;
                        if (tx > scopeTx[1]) {
                            isMeetBounding = true;
                            tx = scopeTx[1];
                            // console.log("meet bounding tx max");
                        }
                        if (tx < scopeTx[0]) {
                            isMeetBounding = true;
                            tx = scopeTx[0];
                            // console.log("meet bounding tx min");
                        }

                        if (ty > scopeTy[1]) {
                            isMeetBounding = true;
                            ty = scopeTy[1];
                            // console.log("meet bounding ty min");
                        }
                        if (ty < scopeTy[0]) {
                            isMeetBounding = true;
                            ty = scopeTy[0];
                            // console.log("meet bounding ty max");
                        }

                        getEl("#popup-content").attr("transform", `translate(${tx} ${ty})`);
                    }
                },
            }),
            // "drag-popup-2"
            new Control({
                name: "drag-popup-2",
                type: "drag",
                id: "drag-popup-2",
                x_scope: [0, 1],
                scope: [0, 1],
                minimum: 0.001,
                value: 0,
                info: popupInfo_2,
                fn_drag: function ({ value, eventName }) {
                    let ctrl = this;
                    ctrl.eventName = eventName;

                    if (eventName == "mousedown") {
                        ctrl.offset = {
                            x: ctrl.curPos.x,
                            y: ctrl.curPos.y,
                        };
                        ctrl.translate = SVGLib.getTranslate(getEl("#popup-content-2"));
                    } else {
                        ctrl.render();
                    }

                    if (eventName == "mouseup") {
                        delete ctrl.offset;
                    }
                },
                render: function () {
                    let ctrl = this;
                    if (ctrl.offset) {
                        let { translate } = ctrl;

                        if (!ctrl.scopeTx) {
                            let width = _.get(ctrl, ["info", "width"], 0);
                            let height = _.get(ctrl, ["info", "height"], 0);
                            let initX = _.get(ctrl, ["info", "init_x"], 0);
                            let initY = _.get(ctrl, ["info", "init_y"], 0);

                            let minVisibleX = _.get(ctrl, ["info", "min_visible_x"], 0);
                            let minVisibleY = _.get(ctrl, ["info", "min_visible_y"], 0);

                            let scopeTx = [-width + minVisibleX - initX, g_state.c_screen_width - minVisibleX - initX];
                            let scopeTy = [-height + minVisibleY - initY, g_state.c_screen_height - initY - minVisibleY];

                            ctrl.scopeTx = scopeTx;
                            ctrl.scopeTy = scopeTy;
                        }

                        let { scopeTx, scopeTy } = ctrl;

                        let tx = ctrl.curPos.x - ctrl.offset.x + translate.left;
                        let ty = ctrl.curPos.y - ctrl.offset.y + translate.top;

                        let isMeetBounding = false;
                        if (tx > scopeTx[1]) {
                            isMeetBounding = true;
                            tx = scopeTx[1];
                            // console.log("meet bounding tx max");
                        }
                        if (tx < scopeTx[0]) {
                            isMeetBounding = true;
                            tx = scopeTx[0];
                            // console.log("meet bounding tx min");
                        }

                        if (ty > scopeTy[1]) {
                            isMeetBounding = true;
                            ty = scopeTy[1];
                            // console.log("meet bounding ty min");
                        }
                        if (ty < scopeTy[0]) {
                            isMeetBounding = true;
                            ty = scopeTy[0];
                            // console.log("meet bounding ty max");
                        }

                        getEl("#popup-content-2").attr("transform", `translate(${tx} ${ty})`);
                    }
                },
            }),
            // "close-popup"
            new Control({
                name: "close-popup",
                type: "clickable",
                class_name: "close-popup",
                mouseup: function () {
                    let ctrl = this;
                    g_state.show_popup = false;

                    let ctrlShowPopup = getControl("btn-show-popup");
                    ctrlShowPopup.value = "inactive";
                    ctrl.render();

                    // g_state.fnCheckReload();
                    applyControlChange();
                },
                render: function () {
                    getControl("btn-show-popup").render();
                },
            }),
            // "drag-ruler"
            new Control({
                name: "drag-ruler",
                type: "drag",
                id: "drag-ruler",
                x_scope: [0, 1],
                scope: [0, 1],
                minimum: 0.001,
                value: 0,
                info: {
                    width: 847,
                    height: 138.35,
                    min_visible_x: 75,
                    min_visible_y: 75,
                    init_x: 71.5,
                    init_y: 720,
                },
                fn_drag: function ({ value, eventName }) {
                    // if (getControl("btn-rotate").value == "active") return;

                    let ctrl = this;
                    ctrl.eventName = eventName;

                    let ctrlRulerRotate = getControl("drag-ruler-rotate");

                    if (eventName == "mousedown") {
                        ctrl.offset = {
                            x: ctrl.curPos.x,
                            y: ctrl.curPos.y,
                        };
                        ctrl.translate = SVGLib.getTranslate(getEl("#ruler"));
                    } else {
                        ctrl.render();
                    }

                    if (eventName == "mousemove") {
                        if (!ctrl.is_drag_real) {
                            ctrlRulerRotate.visible = true;
                        } else {
                            ctrlRulerRotate.visible = false;
                        }
                    }

                    if (eventName == "mouseup") {
                        if (!ctrl.is_drag_real) {
                            ctrlRulerRotate.visible = true;
                        } else {
                            ctrlRulerRotate.visible = false;
                        }
                        delete ctrl.offset;
                    }

                    ctrlRulerRotate.render();
                },
                render: function () {
                    let ctrl = this;
                    if (ctrl.offset) {
                        let { translate } = ctrl;
                        fnCalculateSVGRatio();

                        let rectBounding = getBoundingClientRect("#drag-ruler");
                        let width = rectBounding.width / g_svgRatio;
                        let height = rectBounding.height / g_svgRatio;

                        let pos = cursorPoint(rectBounding);

                        let prevTx = _.get(ctrl, ["info", "tx"], 0);
                        let prevTy = _.get(ctrl, ["info", "ty"], 0);

                        let dx = ctrl.curPos.x - ctrl.offset.x;
                        let dy = ctrl.curPos.y - ctrl.offset.y;

                        let prevValueX = prevTx;
                        let prevValueY = prevTy;

                        let rectEl = getSVGRect($(`#${ctrl.id}`));

                        let min_visible_x = -rectEl.width / 2 + ctrl.info.min_visible_x;
                        let min_visible_y = -rectEl.height / 2 + ctrl.info.min_visible_y;

                        let scopeTX = [min_visible_x, g_state.c_screen_width - min_visible_x];
                        let scopeTY = [min_visible_y, g_state.c_screen_height - min_visible_y];

                        let selector = ctrl.id ? `#${ctrl.id}` : `.${ctrl.class}`;
                        let el = $(selector);

                        let points0 = [
                            MathLib.centerPoint(
                                ["rule-top-point", "rule-top-point-2", "rule-top-point-3", "rule-top-point-4"].map((x, idx) => {
                                    let pos = g_state.fnCalculateRotatedPoint2(getEl(`#${x}`));

                                    return pos;
                                })
                            ),
                        ]
                            .map((p) => [p.x - scopeTX[0], scopeTX[1] - p.x, p.y - scopeTY[0], scopeTY[1] - p.y])
                            .filter((x) => !_.some(x, (y) => y < 0));

                        if (points0.length) {
                            let scopeDx = [
                                -_(points0)
                                    .map((p) => p[0])
                                    .max() + 1,

                                _(points0)
                                    .map((p) => p[1])
                                    .max() - 1,
                            ];
                            let scopeDy = [
                                -_(points0)
                                    .map((p) => p[2])
                                    .max() + 1,

                                _(points0)
                                    .map((p) => p[3])
                                    .max() - 1,
                            ];
                            if (dx < scopeDx[0]) dx = scopeDx[0];
                            if (dx > scopeDx[1]) dx = scopeDx[1];
                            if (dy < scopeDy[0]) dy = scopeDy[0];
                            if (dy > scopeDy[1]) dy = scopeDy[1];
                        }

                        // ctrl.value1.x += dx;
                        // ctrl.value1.y += dy;

                        let tx = prevTx + dx;
                        let ty = prevTy + dy;

                        ctrl.offset.x += tx - prevValueX;
                        ctrl.offset.y += ty - prevValueY;

                        ctrl.info.tx = tx;
                        ctrl.info.ty = ty;

                        let menuData = g_state.menu_data[g_state.menu_item_selected];
                        menuData.translate_ruler = { tx, ty };

                        getEl("#ruler").attr("transform", `translate(${tx} ${ty})`);
                    } else {
                        let { tx, ty } = ctrl.info;
                        getEl("#ruler").attr("transform", `translate(${tx || 0} ${ty || 0})`);
                    }
                },
            }),
            // "drag-rotate-shape"
            new Control({
                name: "drag-rotate-shape",
                type: "drag",
                class_name: "shape_rotate",
                x_scope: [0, 1],
                scope: [0, 1],
                minimum: 0.001,
                is_dynamic: true,
                value: 0,
                info: {},
                fn_drag: function ({ value, eventName }) {
                    let ctrl = this;
                    ctrl.eventName = eventName;

                    let menuData = g_state.menu_data[g_state.menu_item_selected];

                    if (ctrl.eventName == "mousedown") {
                        let ctrlRulerRotate = getControl("drag-ruler-rotate");
                        ctrlRulerRotate.visible = false;
                        ctrlRulerRotate.render();

                        ctrl.prev_cursor = new Point3D(ctrl.curPos.x, ctrl.curPos.y, 0);
                        if (menuData.startAngle) return;
                    }

                    if (getControl("btn-rotate").value == "inactive" || g_state.menu != 2) return;

                    let curPos = new Point3D(ctrl.curPos.x + 0.0001, ctrl.curPos.y, 0);

                    let dAngle = MathLib.angleBetweenVectors(menuData.center, ctrl.prev_cursor, curPos) || 0;
                    let v1 = ctrl.prev_cursor.sub(menuData.center);
                    let v2 = curPos.sub(menuData.center);
                    let n = v1.crossProduct(v2);

                    dAngle = dAngle * Math.sign(n.z);

                    let angle = menuData.rotate + dAngle;

                    console.log("angle", angle, "dAngle", dAngle, "n", n, "sign", Math.sign(n.z));

                    ctrl.prev_cursor = curPos;

                    if (angle == 360 || _.round(angle) == 360) angle = 0;

                    if (dAngle > 0 && angle > 180) angle = 180;
                    else if (dAngle < 0 && angle < -180) angle = -180;

                    if (eventName == "mouseup") {
                        angle = _.round(angle);
                        ctrl.prev_cursor = null;
                    }

                    menuData.rotate = angle;
                    ctrl.render();
                    applyControlChange();
                },
                render: function () {
                    let ctrl = this;
                    let menuData = g_state.menu_data[g_state.menu_item_selected];

                    let angleValue = _.round(menuData.rotate >= 0 ? menuData.rotate : -menuData.rotate).toString();
                    getEl("#text-rotate-angle")
                        .text(angleValue)
                        .parent()
                        .attr("transform", `translate(${{ 1: 0, 2: -45, 3: -45 * 2 }[angleValue.length] || 0} 0)`);
                },
            }),
            // "drag-ruler-rotate"
            new Control({
                name: "drag-ruler-rotate",
                type: "drag",
                id: "drag-ruler-rotate",
                x_scope: [0, 1],
                scope: [0, 1],
                minimum: 0.001,
                value: 0,
                info: {},
                fn_drag: function ({ value, eventName }) {
                    // if (getControl("btn-rotate").value == "inactive" || g_state.menu != 2) return;

                    let menuData = g_state.menu_data[g_state.menu_item_selected];

                    let ctrl = this;
                    ctrl.eventName = eventName;

                    let dragRulerCtrl = getControl("drag-ruler");

                    let p = g_state.fnCalculateRotatedPoint(
                        new Point3D(Number(getEl("#rule-top-point").attr("cx")), Number(getEl("#rule-top-point").attr("cy")) + 135, 0)
                    );
                    let q = g_state.fnCalculateRotatedPoint(
                        new Point3D(Number(getEl("#rule-top-point-4").attr("cx")), Number(getEl("#rule-top-point").attr("cy")), 0)
                    );
                    let c = new Point3D(ctrl.curPos.x, ctrl.curPos.y, 0);

                    let v1 = p.sub(q);
                    let n1 = new Point3D(-v1.y, v1.x, 0);
                    let c1 = c.add(n1);
                    let c2 = MathLib.lineIntersectLine(p, q, c, c1).intersectPoint;
                    let c3 = MathLib.getPointByLength(c, c2, 0);
                    let curPos = c3;

                    let p1 = p.add({ x: 1, y: 0, z: 0 });
                    let angle = MathLib.angleBetweenVectors(p, p1, curPos);
                    console.log("angle", angle);
                    if (curPos.y <= p.y) {
                        angle = 180 * 2 - angle;
                    }

                    // getEl("#cursor-point-1").attr({ cx: curPos.x, cy: curPos.y });
                    // getEl("#cursor-point-2").attr({ cx: p.x, cy: p.y });

                    ctrl.rotate = angle;
                    menuData.rotate_ruler = angle;

                    ctrl.render();

                    applyControlChange();
                },
                render: function () {
                    let ctrl = this;
                    getEl("#rule-rotate").attr("transform", `rotate(${ctrl.rotate || 0}, 0.75, -139.1)`);
                    showElement(getEl("#drag-ruler-rotate"), ctrl.visible);
                },
            }),
            // "btn-reset"
            new Control({
                name: "btn-reset",
                type: "button",
                id: "btn-reset",
                value: "inactive",
                mouseup_immediately: function () {
                    const ctrl = this;
                    ctrl.value = "inactive";
                    ctrl.render();
                },
                mouseup: function () {
                    const ctrl = this;

                    let menuData = g_state.menu_data[g_state.menu_item_selected];
                    menuData.allow_rotate = menuData.allow_rotate_origin;
                    menuData.rotate = menuData.rotate_origin;
                    menuData.rotate_ruler = menuData.rotate_ruler_origin;
                    menuData.translate_ruler = _.clone(menuData.translate_ruler_origin);
                    menuData.line_delete = menuData.line_delete_origin;

                    getControl("drag-rotate-shape").render();
                    let ctrlDragRullerRotate = getControl("drag-ruler-rotate");
                    ctrlDragRullerRotate.rotate = menuData.rotate_ruler;
                    ctrlDragRullerRotate.render();

                    let ctrlDragRuler = getControl("drag-ruler");
                    ctrlDragRuler.info.tx = menuData.translate_ruler.tx;
                    ctrlDragRuler.info.ty = menuData.translate_ruler.ty;

                    ctrlDragRuler.render();

                    let ctrlRotate = getControl("btn-rotate");
                    ctrlRotate.value = menuData.allow_rotate ? "active" : "inactive";
                    ctrlRotate.render();

                    getEl(`.select-menu-item-${g_state.menu_item_selected}`).find(".lines-drawed").empty();

                    //applyControlChange();

                    getEl("#point-cricle-1").children().remove();
                    getEl("#point-cricle-2").children().remove();

                    $("#popup-content").attr("transform", "translate(280 330)");
                    $("#popup-content-2").attr("transform", "translate(0 0)");

                    getControl("btn-show-rectangle").value = "disabled";
                    getControl("btn-show-rectangle").render();
                },
                mousedown: function () {
                    let ctrlRulerRotate = getControl("drag-ruler-rotate");
                    ctrlRulerRotate.visible = false;
                    ctrlRulerRotate.render();
                },
                render: function () {
                    const ctrl = this;
                    showElement(`.${ctrl.id}`, false);
                    showElement(`#${ctrl.id}-${ctrl.value}`, true);
                },
            }),
            // "reload"
            new Control({
                name: "reload",
                type: "button",
                id: "btn-reload",
                value: "disabled",
                is_skip_check_reload: true,
                mouseup: function () {
                    const ctrl = this;

                    g_state.a = JSON.parse(JSON.stringify(g_default_state.a));
                    g_state.b = JSON.parse(JSON.stringify(g_default_state.b));
                    g_state.plength = JSON.parse(JSON.stringify(g_default_state.plength));

                    g_state.show_p1 = g_default_state.show_p1;
                    g_state.show_p2 = g_default_state.show_p2;

                    g_state.controls
                        // .filter((x) => !x.is_skip_check_reload)
                        .forEach((ctrl, idx) => {
                            let defaultValue = g_default_state.controls.find((c) => c.name == ctrl.name);
                            ctrl.value = defaultValue.value;
                            if (ctrl.render) ctrl.render();
                        });

                    if (g_state.is_init_canvas) camera.position.set(g_cameraInitPos.x, g_cameraInitPos.y, g_cameraInitPos.z);

                    getEl("#btn-show-modal-group").attr("transform", "");

                    applyControlChange();
                },
                render: function () {
                    const ctrl = this;
                    showElement(`.${ctrl.id}`, false);
                    showElement(`#${ctrl.id}-${ctrl.value}`, true);
                },
            }),
        ],
    };

    Object.keys(g_state.menu_data).forEach((k) => {
        g_state.menu_data[k].points = g_state.menu_data[k].points.map((p) => new Point3D(p.x, p.y, p.z));
        g_state.menu_data[k].center = MathLib.centerPoint(g_state.menu_data[k].points);
        g_state.menu_data[k].points_origin = g_state.menu_data[k].points.map((p) => p.copy());
        g_state.menu_data[k].translate_ruler_origin = _.clone(g_state.menu_data[k].translate_ruler);
        g_state.menu_data[k].rotate_origin = g_state.menu_data[k].rotate;
        g_state.menu_data[k].rotate_ruler_origin = g_state.menu_data[k].rotate_ruler;
        g_state.menu_data[k].allow_rotate_origin = g_state.menu_data[k].allow_rotate;
        g_state.menu_data[k].line_delete = [];
        g_state.menu_data[k].line_delete_origin = g_state.menu_data[k].line_delete;
    });

    // getEl("#grp-text-n").attr("transform", CONFIG.n.scope[0] <= -10 ? "translate(-14 0)" : "");
};

const loadConfigAndStaticSVG = () => {
    // const urlParams = new URLSearchParams(window.location.search);
    // const pattern = urlParams.get("pattern");
    // if (pattern) CONFIG.selected_pattern = Number(pattern);

    g_default_state = JSON.parse(JSON.stringify(g_state));

    // getEl("#名称未設定グラデーション_7").find("stop").eq(0).attr("stop-color", CONFIG.colors.face_radient[0]);
    // getEl("#名称未設定グラデーション_7").find("stop").eq(1).attr("stop-color", CONFIG.colors.face_radient[1]);

    console.log("version", g_state.version);

    // console._log = console.log;
    // console.log = function () {
    //     // eslint-disable-next-line prefer-rest-params
    //     if (g_state.is_show_log) console._log(...arguments);
    // };
};

let g_default_state;
let g_eventId = 0;
let g_isRenderingGraph = false;
// ===== end =====

// ===== Template  =====

window.addEventListener("mousemove", function (ev) {
    ev.preventDefault ? ev.preventDefault() : (ev.returnValue = false);
});

window.addEventListener(
    "touchmove",
    function (e) {
        e.preventDefault();
    },
    {
        passive: false,
    }
);

function showElement(element, visible) {
    return $(element).css("visibility", visible ? "visible" : "hidden");
}

async function animateButtonEffect(id, isDown, cb, dy) {
    if (g_isAnimatingButton[id] && isDown) return;
    // while (g_isAnimatingButton[id]) {
    //     await delay(50);
    // }

    g_isAnimatingButton[id] = true;

    let defaultDy = 0;
    var self = $(id);
    var duration = 100;
    var nFrame = 10;
    var dy1 = isDown ? 0 : dy || defaultDy;
    var dy2 = isDown ? dy || defaultDy : 0;
    var ddy = (dy2 - dy1) / nFrame;

    let count = 0;

    if (!dy) {
        if (cb) cb();
    } else {
        var itv = setInterval(() => {
            count += 1;
            dy1 += ddy;

            self.attr("transform", SVGLib.getStrMatrix(1, 0, 0, 1, 0, dy1));

            if (count >= nFrame) {
                clearInterval(itv);
                delete g_isAnimatingButton[id];
                if (cb) cb();
            }
        }, duration / nFrame);
    }
}
let g_isMouseDown = false;

var itvKeepSVGNotMove;
function keepDraggableSvgNotMove() {
    if (g_dragablePosition.top == undefined || g_dragablePosition.top === null) {
        g_dragablePosition.top = parseInt($(".draggable-zone").css("top"), 10) || 0;
        g_dragablePosition.left = parseInt($(".draggable-zone").css("left"), 10) || 0;
    } else {
        setTimeout(function () {
            $(".draggable-zone").css("top", g_dragablePosition.top);
            $(".draggable-zone").css("left", g_dragablePosition.left);
        }, 50);
    }

    if (!itvKeepSVGNotMove)
        itvKeepSVGNotMove = setInterval(() => {
            keepDraggableSvgNotMove();
        }, 200);
}

function keepScrollBarNotMove(el) {
    setTimeout(function () {
        $(el).css("top", 0);
        $(el).css("left", 0);
    }, 50);
}

// ---------------------------------------------------------
var Draw = {
    setting: {
        svgDom: $("#svg"),
        grid: 100,
        lineStyle: {
            stroke: "black",
            "stroke-width": "2.5px",
        },
    },

    init: function () {
        this.shapeGroup = SVGLib.createTag(CONST.SVG.TAG.GROUP, {
            id: "svg_shape",
            transform: SVGLib.getStrMatrix(1, 0, 0, 1, 512, 324),
        });
        this.setting.svgDom.append(this.shapeGroup);

        this.rotateEvent(".draggable-zone");
    },

    appendToShapeGroup: function (childElement) {
        this.shapeGroup.append(childElement);

        return childElement;
    },

    appendToFloatingShapeGroup: function (childElement) {
        this.floatingShapeGroup.append(childElement);
    },
};

const getBoundingClientRect = (el) => {
    return $(el)[0].getBoundingClientRect();
};

const delay = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const getCenterOfCircle = (el) => {
    const bbox = getBoundingClientRect(el);

    return {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2,
    };
};

const checkifEventValid = (currentEventId) => {
    return currentEventId == g_eventId;
};

let g_isPressMouse = false;
let g_svgRatio = 1;

let fnCalculateSVGRatio = () => {
    g_svgRatio = getBoundingClientRect(getEl("#rect-bg")).width / 1280;
    // console.log("g_svgRatio", g_svgRatio);
};

function getMousePosition(e) {
    let evt = e;
    var CTM = svg.getScreenCTM();
    if (evt.touches) {
        evt = evt.touches[0];
    }

    return {
        x: (evt.clientX - CTM.e) / CTM.a,
        y: (evt.clientY - CTM.f) / CTM.d,
    };
}

const getPatternPoints = () => {
    let pointCount = 100;
    let graphPoints = {};
    let patters = ["pattern-1", "pattern-2", "pattern-3", "pattern-4", "pattern-5"];
    patters.forEach((pt) => {
        graphPoints[pt] = {
            pattern: pt,
            points: [],
        };
        console.log("pattern", pt);
        let snapPath = Snap(`#svg-${pt} #graph`);
        let totalLength = snapPath.getTotalLength();
        let dLength = totalLength / pointCount;
        for (let i = 0; i < pointCount; i += 1) {
            let length = _.round(i * dLength, 2);
            let point = snapPath.getPointAtLength(length);
            graphPoints[pt].points.push({
                x: point.x,
                y: point.y,
            });
        }

        let firstPoint = JSON.parse(JSON.stringify(_.first(graphPoints[pt].points)));
        graphPoints[pt].points.forEach((p) => {
            p.x = _.round(p.x - firstPoint.x, 2);
            p.y = _.round(firstPoint.y - p.y, 2);
        });

        // graphPoints[pt].points = graphPoints[pt].points.filter(
        //     (x, idx) => idx % 2 == 0 || idx == graphPoints[pt].points.length - 1
        // );
    });

    console.log("getPatternPoints", JSON.stringify(graphPoints));
};

$(document).ready(function () {
    initState();
    loadConfigAndStaticSVG();
    // if (g_state.is_init_canvas) initCanvas();
    initDragEvent(_.flattenDeep(["Mycanvas"]));

    $(window).resize(function () {
        fnCalculateSVGRatio();
    });
    fnCalculateSVGRatio();

    let dZoom = 0.1;
    let isPinch = false;
    let isMouseDownZoomArea = false;

    let prevPos = {
        x: 0,
        y: 0,
    };

    var svg = document.querySelector("svg");
    // Create an SVGPoint for future math
    var pt = svg.createSVGPoint();

    function cursorPoint(evt) {
        var c = /Edge/.test(window.navigator.userAgent) ? document.getElementById("svg") : svg;
        pt.x = evt.clientX || evt.x || 0;
        pt.y = evt.clientY || evt.y || 0;
        var ctm = c.getScreenCTM();
        var inverse = ctm.inverse();
        var p = pt.matrixTransform(inverse);

        let ratio = 1;
        let isChrome = !!navigator.userAgent.match(/Chrome/i) || window.chrome;

        if (getEl("#stage_1").length && !isChrome) {
            let stg1El = getEl("#stage_1")[0];
            let scale = stg1El.getBoundingClientRect().width / stg1El.offsetWidth;
            if (scale) {
                ratio = 1 / scale;

                console.log("scale", scale);
            }
        }

        return {
            x: p.x * ratio,
            y: p.y * ratio,
        };
    }

    window.cursorPoint = cursorPoint;

    const fnControlScrollbar = (ctrl) => {
        console.log("fnControlScrollbar initial", ctrl.name);
        let elSelector = ctrl.id ? `#${ctrl.id}` : `.${ctrl.class}`;
        let el = $(elSelector);
        const scrollPoint = $(ctrl.scroll_point);
        let isDrag = false;
        let prevValue = null;

        let fnDrag = (event, isSnap, eventName) => {
            g_latestMousePress = ctrl.id || ctrl.class || ctrl.name;
            // console.log("fnDrag", ctrl.name, isSnap, eventName);
            //  event.stopPropagation();

            const [x0, x1] = ctrl.x_scope || [];
            const [y0, y1] = ctrl.y_scope || [];

            var layoutLoc = SVGLib.getTranslate(el);
            // console.log("layoutLoc", layoutLoc);
            var curPos = cursorPoint(event);

            var x = curPos.x - layoutLoc.left;
            var y = -(curPos.y - layoutLoc.top);

            ctrl.curPos = curPos;

            let percent = (x - x0) / (x1 - x0);
            let percentY = 0;
            let isHavePercentY = false;
            if (ctrl.y_scope) {
                if (!_.get(ctrl, ["x_scope", "length"])) {
                    percent = (y1 - Math.abs(y)) / (y1 - y0);
                } else {
                    percentY = (y1 - Math.abs(y)) / (y1 - y0);
                    isHavePercentY = true;
                }
            }

            if (percent < 0) percent = 0;
            if (percent > 1) percent = 1;

            if (percentY < 0) percentY = 0;
            if (percentY > 1) percentY = 1;

            let roundLength = _.get(ctrl.minimum.toString().split(".")[1], "length", 0);

            ctrl.value = _.round(percent * (ctrl.scope[1] - ctrl.scope[0]) + ctrl.scope[0], roundLength);

            if (ctrl.value < ctrl.scope[0]) ctrl.value = ctrl.scope[0];
            if (ctrl.value > ctrl.scope[1]) ctrl.value = ctrl.scope[1];

            if (isHavePercentY) {
                ctrl.valueY = _.round(percentY * (ctrl.scope[1] - ctrl.scope[0]) + ctrl.scope[0], roundLength);

                if (ctrl.valueY < ctrl.scope[0]) ctrl.valueY = ctrl.scope[0];
                if (ctrl.valueY > ctrl.scope[1]) ctrl.valueY = ctrl.scope[1];
            }

            const stopPoints = ctrl.snap_point || [];
            const stopValue = stopPoints.find((x) => Math.abs(ctrl.value - x) < 1.2 * ctrl.minimum);
            if (stopValue != undefined) {
                ctrl.value = stopValue;
                // console.log("found stop value", stopValue);
            } else if (isSnap) {
                ctrl.value = _.round(_.round(ctrl.value / ctrl.minimum) * ctrl.minimum, roundLength);
            }

            if (eventName == "mousedown") {
                prevValue = ctrl.value;
            }

            ctrl.render();

            if (ctrl.fn_drag)
                ctrl.fn_drag({
                    prevValue,
                    eventName,
                });

            if (eventName == "mousemove") {
                prevValue = ctrl.value;
            }

            // console.log("prevValue", prevValue, eventName);

            keepScrollBarNotMove(el);
        };

        if (ctrl.is_dynamic) {
            $(document)
                .on("mousedown", elSelector, function (event) {
                    ctrl.el = this;
                    ctrl.is_drag = false;
                    isDrag = true;
                    prevValue = null;
                    fnDrag(event, true, "mousedown");
                })
                .css("position", "absolute");
        } else {
            $(el)
                .on("mousedown", function (event) {
                    ctrl.el = this;
                    ctrl.is_drag = false;
                    isDrag = true;
                    prevValue = null;
                    fnDrag(event, true, "mousedown");
                })
                .css("position", "absolute");
        }

        $(document).on("mousemove", function (event) {
            if (isDrag) {
                ctrl.is_drag = true;
                fnDrag(event, false, "mousemove");
                keepScrollBarNotMove(el);
            } else if (ctrl.mousemove) {
                let dx = event.clientX - prevMove.x;
                let dy = event.clientY - prevMove.y;
                if (Math.pow(dx, 2) + Math.pow(dy, 2) < 5) return;
                ctrl.mousemove(event);

                prevMove = {
                    x: event.clientX,
                    y: event.clientY,
                };
            }
        });

        $(document).on("mouseup", function (event) {
            if (isDrag) {
                fnDrag(event, true, "mouseup");
                keepScrollBarNotMove(el);
                isDrag = false;
                prevValue = null;
                ctrl.is_drag = false;
                delete ctrl.el;
            }
        });

        if (ctrl.mouseover) {
            $(el).on("mouseover", function (event) {
                ctrl.mouseover(event);
                ctrl.is_hover = true;
            });
        }
        if (ctrl.mouseout) {
            $(el).on("mouseout", function (event) {
                ctrl.mouseout(event);
                ctrl.is_hover = false;
            });
        }
    };

    const fnControlDrag = (ctrl) => {
        console.log("fnControlDrag initial", ctrl.name);
        let elSelector = ctrl.id ? `#${ctrl.id}` : `.${ctrl.class}`;
        let el = $(elSelector);
        let isDrag = false;
        let prevValue = null;

        ctrl.init_el = el;

        let prev = { x: 0, y: 0 };
        let fnDrag = (event, isSnap, eventName, isKeepCheckDist) => {
            g_latestMousePress = ctrl.id || ctrl.class;
            event.stopPropagation();

            const [x0, x1] = ctrl.x_scope || [];
            const [y0, y1] = ctrl.y_scope || [];

            var layoutLoc = SVGLib.getTranslate(el);
            // console.log("layoutLoc", layoutLoc);
            var curPos = cursorPoint(event);

            var x = curPos.x - layoutLoc.left;
            var y = curPos.y - layoutLoc.top;

            ctrl.curPos = curPos;

            let dx = event.clientX - prev.x;
            let dy = event.clientY - prev.y;
            if (!isKeepCheckDist && Math.pow(dx, 2) + Math.pow(dy, 2) < 5) return;

            prev = {
                x: event.clientX,
                y: event.clientY,
            };

            if (x < x0) x = x0;
            else if (x > x1) x = x1;

            if (y < y0) y = y0;
            else if (y > y1) y = y1;

            ctrl.value = { x, y };

            if (eventName == "mousedown") {
                prevValue = ctrl.value;
            }

            // console.log(ctrl.name, ctrl.value);

            ctrl.render();

            if (ctrl.fn_drag)
                ctrl.fn_drag({
                    prevValue,
                    eventName,
                });

            if (eventName == "mousemove") {
                prevValue = ctrl.value;
            }

            // console.log("prevValue", prevValue, eventName);

            keepScrollBarNotMove(el);
        };

        if (ctrl.is_dynamic) {
            $(document).on("mousedown", elSelector, function (event) {
                ctrl.id = $(this).attr("id");
                ctrl.el = this;

                isDrag = true;
                prevValue = null;
                ctrl.is_drag = false;
                ctrl.is_drag_real = false;

                fnDrag(event, true, "mousedown", true);
                prev = { x: 0, y: 0 };
            });
        } else {
            $(el)
                .on("mousedown", function (event) {
                    ctrl.id = $(this).attr("id");
                    ctrl.el = this;

                    isDrag = true;
                    prevValue = null;
                    ctrl.is_drag = false;
                    ctrl.is_drag_real = false;

                    fnDrag(event, true, "mousedown", true);
                    prev = { x: 0, y: 0 };
                })
                .css("position", "absolute");
        }

        let prevMove = { x: 0, y: 0 };
        $(document).on("mousemove", function (event) {
            if (isDrag) {
                let dx = event.clientX - prevMove.x;
                let dy = event.clientY - prevMove.y;
                if (Math.pow(dx, 2) + Math.pow(dy, 2) < 5) return;

                ctrl.is_drag = true;
                ctrl.is_drag_real = true;

                fnDrag(event, false, "mousemove");
                keepScrollBarNotMove(el);
                prevMove = {
                    x: event.clientX,
                    y: event.clientY,
                };
            } else if (ctrl.mousemove) {
                let dx = event.clientX - prevMove.x;
                let dy = event.clientY - prevMove.y;
                if (Math.pow(dx, 2) + Math.pow(dy, 2) < 5) return;
                ctrl.mousemove(event);

                prevMove = {
                    x: event.clientX,
                    y: event.clientY,
                };
            }
        });

        $(document).on("mouseup", function (event) {
            if (isDrag) {
                fnDrag(event, true, "mouseup", true);
                keepScrollBarNotMove(el);
                isDrag = false;
                prevValue = null;
                ctrl.is_drag = false;
                delete ctrl.el;
            }
        });
        if (ctrl.mouseover) {
            $(el).on("mouseenter", function (event) {
                ctrl.mouseover(event);
                ctrl.is_hover = true;
            });
        }
        if (ctrl.mouseout) {
            $(el).on("mouseleave", function (event) {
                ctrl.mouseout(event);
                ctrl.is_hover = false;
            });
        }
    };

    const fnControlRadio = (ctrl) => {
        console.log("fnControlRatio initial", ctrl.name);
        let el = $(`#${ctrl.id}`);
        $(el).on("mousedown", function (event) {
            event.preventDefault();
            if (!ctrl.ignore_event_tracking) g_eventId += 1;
            g_latestMousePress = ctrl.id;

            if (ctrl.mousedown) ctrl.mousedown();
        });
    };

    const fnControlClickable = (ctrl) => {
        console.log("fnControlClickable initial", ctrl.name);
        let el = $(ctrl.id ? `#${ctrl.id}` : `.${ctrl.class}`);
        $(el).on("mousedown", function (event) {
            ctrl.id = $(this).attr("id");
            event.preventDefault();
            if (!ctrl.ignore_event_tracking) g_eventId += 1;
            g_latestMousePress = ctrl.id || ctrl.class;

            if (ctrl.mousedown) ctrl.mousedown();
        });
    };

    const fnControlCheckbox = (ctrl) => {
        let el = $(`#${ctrl.id}`);
        $(el).on("mousedown", function (event) {
            event.preventDefault();
            if (!ctrl.ignore_event_tracking) g_eventId += 1;
            g_latestMousePress = ctrl.id;

            if (ctrl.mousedown) ctrl.mousedown();
        });
    };
    const fnControlButton = (ctrl) => {
        console.log(
            "fnControlButton initial",
            ctrl.is_group
                ? Object.keys(ctrl.flow_member)
                      .map((x) => `${ctrl.name}-${x}`)
                      .join(", ")
                : ctrl.name
        );

        let buttons = [];
        if (ctrl.is_group) {
            buttons = [
                ...Object.keys(ctrl.flow_member).map((x) => `#${ctrl.id}-${x}-inactive`), // inactive state
                ...(ctrl.event_for_active_state ? Object.keys(ctrl.flow_member).map((x) => `#${ctrl.id}-${x}-active`) : []), // active state
            ].filter((x) => x);
        } else {
            buttons = [`#${ctrl.id}-inactive`];
            if (ctrl.event_for_active_state) {
                buttons.push(`#${ctrl.id}-active`);
            }
        }

        let els = $(buttons.join(", "));

        els.on("mousedown", function (e) {
            if (!ctrl.ignore_event_tracking) g_eventId += 1;
            let currentEventId = g_eventId;
            g_latestMousePress = ctrl.id;
            ctrl.from_state = ctrl.value;
            // ctrl.value = "active";
            ctrl.render();

            if (ctrl.type == "button" && ctrl.from_state == "active" && ctrl.event_for_active_state) {
                // do nothing
            } else {
                animateButtonEffect(`#${ctrl.id}-group`, true, null, 0);
            }

            if (ctrl.allow_press) {
                let { mouse_press_delay } = ctrl;
                let itvPress;
                let count = 0;
                let fn = () => {
                    count += 1;
                    if (currentEventId != g_eventId) {
                        clearInterval(itvPress);

                        return;
                    }
                    ctrl.fn_mouseup({ isKeyPress: true, count });
                };

                setTimeout(() => {
                    if (currentEventId == g_eventId) {
                        g_isPressMouse = true;
                        fn();
                        itvPress = setInterval(fn, mouse_press_delay);
                    }
                }, 1000);
            }

            if (ctrl.mousedown) ctrl.mousedown();
        });
    };

    g_state.controls.forEach((ctrl) => {
        switch (ctrl.type) {
            case "scrollbar":
                fnControlScrollbar(ctrl);
                break;

            case "drag":
                fnControlDrag(ctrl);
                break;

            case "radio":
                fnControlRadio(ctrl);

                break;

            case "checkbox":
                fnControlCheckbox(ctrl);
                break;

            case "button":
                fnControlButton(ctrl);
                break;

            case "clickable":
                fnControlClickable(ctrl);
                break;

            default:
                break;
        }

        if (ctrl.render) ctrl.render();
    });

    //applyControlChange(true);

    $(document).on("mouseup", async function (e) {
        g_isMouseDown = false;

        let fn = () => {
            let ctrl = g_state.controls.find((c) => c.id == g_latestMousePress || c.class == g_latestMousePress);
            if (ctrl) {
                if (!ctrl.ignore_event_tracking) g_eventId += 1;
                if (!ctrl.ignore_mouseup) {
                    if (ctrl.type == "button") {
                        if (ctrl.is_group) {
                            ctrl.value = "inactive";
                            ctrl.value1 = ctrl.flow_member[ctrl.value1];
                            ctrl.render();
                        } else {
                            ctrl.value = "disabled";
                            ctrl.render();
                        }

                        if (ctrl.mouseup_immediately) ctrl.mouseup_immediately();

                        // animateButtonEffect(
                        //     `#${ctrl.id}-group`,
                        //     false,
                        //     function () {
                        //         ctrl.value = "inactive";
                        //         ctrl.render();

                        //         if (ctrl.mouseup) ctrl.mouseup(e);
                        //     },
                        //     0
                        // );
                        if (ctrl.mouseup) ctrl.mouseup(e);
                    } else if (ctrl.mouseup) ctrl.mouseup(e);
                } else if (ctrl.type == "button" && ctrl.event_for_active_state) {
                    ctrl.mouseup(e);
                }
            }

            g_latestMousePress = "";
            g_isPressMouse = false;
        };

        if (
            (!g_latestMousePress ||
                (g_latestMousePress && g_latestMousePress != "btn-show-popup" && g_latestMousePress.indexOf("drag-popup") == -1)) &&
            g_state.show_popup
        ) {
            g_state.show_popup = false;
            let ctrlShowPopup = getControl("btn-show-popup");
            ctrlShowPopup.value = "inactive";
            ctrlShowPopup.render();
        } else if (
            (!g_latestMousePress ||
                (g_latestMousePress && g_latestMousePress != "btn-show-popup-2" && g_latestMousePress.indexOf("drag-popup-2") == -1)) &&
            g_state.show_popup_2
        ) {
            g_state.show_popup_2 = false;
            let ctrlShowPopup_2 = getControl("btn-show-popup-2");
            ctrlShowPopup_2.value = "inactive";
            ctrlShowPopup_2.render();
        }

        fn();
    });

    setTimeout(async () => {
        initPallet();
        await delay(100);

        initMain();
        await delay(100);

        showElement("#divBody, #stage_0", true).css("opacity", "1");
    }, 100);
});

const toggleButton = document.getElementById("toggleButton");
const toggleButton_off = document.getElementById("toggleButton_off");
const targetElement = document.getElementById("grid");

        toggleButton.addEventListener("click", function() {
            if (targetElement.style.opacity === "1") {
                targetElement.style.opacity = "0";
                toggleButton.style.opacity ="1";
            } else {
                targetElement.style.opacity = "1";
                toggleButton.style.opacity ="0";
                toggleButton_off.style.opacity ="1";
            }
        });


const toggleButton_green = document.getElementById("btn_green");
const toggleButton_red = document.getElementById("btn_red");
const toggleButton_orange = document.getElementById("btn_orange");

        toggleButton_green.addEventListener("click", function() {
            
            if (toggleButton_green.style.opacity === "1") {
                toggleButton_green.style.opacity = "0";
                
            } 
            else if(toggleButton_red.style.opacity === "0"){
                toggleButton_green.style.opacity = "0";
                toggleButton_red.style.opacity = "1";
                toggleButton_orange.style.opacity = "1";
            }else if (toggleButton_orange.style.opacity = "0"){
                toggleButton_green.style.opacity = "1";
                toggleButton_red.style.opacity = "0";
                toggleButton_orange.style.opacity = "1";
            }
        });
// const toggleButton1 = document.getElementById("btn_green");
// const toggleButton2 = document.getElementById("btn_red");
//         let isOn = true;

//         toggleButton1.addEventListener("click", function() {
//             if (isOn) {
//                 toggleButton1.style.opacity = "0";
//                 isOn = false;
//             } else {
//                 toggleButton2.style.opacity = "1";
//                 isOn = true;
//             }
//         });

let controlValuesPrev = JSON.stringify({});

const applyControlChange = (isSkipCache) => {
    let controlValues = JSON.stringify({
        ..._.pick(g_state, ["menu", "menu_item_selected", "menu_data"]),
        controls: g_state.controls.filter((x) => !x.is_skip_check_reload).map((x) => _.pick(x, ["name", "value"])),
    });

    if (controlValues == controlValuesPrev && !isSkipCache) {
        return;
    }
    controlValuesPrev = controlValues;

    if (!$(".shape_origin_dash").length) {
        Object.keys(g_state.menu_data).forEach((k) => {
            let elItem = getEl(`.select-menu-item-${k}`);
            let menuData = g_state.menu_data[k];

            elItem.append(
                SVGLib.createTag("polygon", {
                    style: CONFIG.colors.shape_rotate,
                    class: "shape_view",
                })
            );

            elItem.append(
                SVGLib.createTag("path", {
                    d: menuData.points_origin
                        .map((p, idx) => `${idx == 0 ? "M" : "L"}${p.x} ${p.y}${idx == menuData.points_origin.length - 1 ? "Z" : ""}`)
                        .join(" "),
                    style: CONFIG.colors.shape_origin_dash,
                    class: "shape_origin_dash",
                })
            );
            elItem.append(
                SVGLib.createTag("polygon", {
                    style: "fill: transparent",
                    class: "shape_rotate",
                })
            );

            elItem.append(
                SVGLib.createTag("circle", {
                    cx: menuData.center.x,
                    cy: menuData.center.y,
                    r: 8,
                    style: CONFIG.colors.shape_center,
                    class: "shape_center",
                })
            );

            elItem.append(
                SVGLib.createTag("line", {
                    style: CONFIG.colors.shape_angle_line_from,
                    class: "shape_angle_line_from",
                })
            );

            elItem.append(
                SVGLib.createTag("line", {
                    style: CONFIG.colors.shape_angle_line_to,
                    class: "shape_angle_line_to",
                })
            );

            elItem.append(
                SVGLib.createTag("polyline", {
                    style: CONFIG.colors.shape_angle_curve_in,
                    class: "shape_angle_curve_in",
                })
            );
            elItem.append(
                SVGLib.createTag("polyline", {
                    style: CONFIG.colors.shape_angle_curve_in,
                    class: "shape_angle_curve_out",
                })
            );
            elItem.append(
                SVGLib.createTag("g", {
                    class: "lines-drawed",
                })
            );
        });
    }

    
};
