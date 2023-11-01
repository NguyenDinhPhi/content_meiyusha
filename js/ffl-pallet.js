/* eslint-disable no-await-in-loop */
/*
  ffl-pallet.js
  ビュアーのペン/消しゴム ⇔ 教材アプリの処理
 */

var CONTENT_W = 1024;
var CONTENT_H = 648;
var allowDeleteObject = true;
var canvasIds = ["Mycanvas", "Mycanvas-21", "Mycanvas-22", "Mycanvas-23"];

var old_X;
var old_Y;
var new_X;
var new_Y;

// 描画ツール情報
var toolInfo = {
    tool: 0, // ツール番号 0:タッチ, 1:ペン, 2:マーカー, 3:消しゴム
    color: "#000000", // ペン色
    size: 6, // ペンサイズ
    opacity: 1.0, // ペン透明度
};

var TOOL_FINGER = 0;
var TOOL_PEN = 1;
var TOOL_MARKER = 2;
var TOOL_ERASER = 3;

var bDraw = false; // 描画フラグ
var bMove = false; // 移動フラグ
var bErase = false; // 消しゴムフラグ
var locusLog = []; // 描画ログ（二重配列）
var locusCnt = 0; // 描画回数
var isDebug = false; // ログレベル

// 描画対象のcanvas、及びコンテキスト
var cEle;
var cCtx;

// ページ送り用のCancas
var pageCanvasLog = [];

var nColor = 0; // 背景色(0:白, 1:黒, 2:水色, 3:緑)
var arrBColor = ["#ffffff", "#000000", "#99ffff", "#005000"];
var initPalletObj = null;
let idCanvas;
const initPallet = () => {
    initPalletObj = {
        getCanvas: () => {
            idCanvas = "";
            if (g_state) {
                if (g_state.menu == 1) {
                    idCanvas = "Mycanvas";
                } else if (g_state.menu == 2) {
                    idCanvas = `Mycanvas-2${g_state.menu_item_selected}`;
                }
            } else {
                idCanvas = "Mycanvas";
            }

            if (canvasIds.indexOf(idCanvas) == -1) idCanvas = canvasIds[0];

            let canvasEls = document.getElementsByClassName("Mycanvas");
            for (let i = 0; i < canvasEls.length; i++) {
                $(canvasEls[i]).css("display", "none");
            }

            $(`#${idCanvas}`).css("display", "block");

            console.log("draw to", idCanvas);

            cEle = document.getElementById(idCanvas);

            cCtx = cEle.getContext("2d");
            cCtx.lineJoin = "round";
            cCtx.lineCap = "round";
        },
        ctrls: function () {
            // 自動リサイズライブラリ呼び出し
            let count = 0;
            let itv = setInterval(() => {
                count += 1;
                fsi_adjustStageSize(CONTENT_W, CONTENT_H);
                if (count > 10) {
                    clearInterval(itv);
                }
            }, 50);

            // canvasの論理サイズ調整
            $(canvasIds.map((x) => `#${x}`).join(", ")).attr("width", CONTENT_W);
            $(canvasIds.map((x) => `#${x}`).join(", ")).attr("height", CONTENT_H);

            // タッチモードにする
            setModeFinger();
        },
        handler: function () {
            // scrollEndTextArea();
            $(window).resize(function () {
                // 自動リサイズライブラリ呼び出し
                let count = 0;
                let itv = setInterval(() => {
                    count += 1;
                    fsi_adjustStageSize(CONTENT_W, CONTENT_H);
                    if (count > 10) {
                        clearInterval(itv);
                    }
                }, 50);
            });

            // iPad対応（ピンチインピンチアウトによる拡大縮小を禁止）
            document.documentElement.addEventListener(
                "touchstart",
                function (e) {
                    if (e.touches.length >= 2) {
                        e.preventDefault();
                    }
                },
                { passive: false }
            );

            var t = 0;
            document.documentElement.addEventListener(
                "touchend",
                function (e) {
                    // iPad対応（ダブルタップによる拡大を禁止）
                    var now = new Date().getTime();
                    if (now - t < 350) {
                        e.preventDefault();
                    }
                    t = now;

                    // CreateJS対応(タッチデバイスでのclickイベント多重発動抑止)
                    if (e.target.nodeName == "CANVAS") {
                        // console.log('prevent default');
                        e.preventDefault();
                    }
                },
                false
            );

            // iPad対応（ページスクロールを無効にする）
            $(window).on("touchmove.noScroll", function (e) {
                e.preventDefault();
            });

            // 背景色変更ボタン押下時
            $("#changeBackColor").click(function () {
                var color = "#ffffff";

                if (nColor > 2) {
                    nColor = 0;
                } else {
                    nColor++;
                }
                color = arrBColor[nColor];

                $("#contbase").css("background-color", color);
            });

            // 親フレームからのツールバー選択状態情報の受信
            $(window).on("message", function (_evt) {
                var arParam = typeof _evt.originalEvent.data == "string" ? _evt.originalEvent.data.split("[,]") : [];

                // 受信したmessageごとの処理
                if (arParam[0] === "FFLCOM_CHANGE_TOOL") {
                    if (arParam[1] == "FFLCOM_TOOL_ERASER") {
                        if (g_state && allowDeleteObject) g_state.setDeleteMode(true);
                    }
                    // ツール変更（ペン・マーカー, 消しゴム, 図形・スタンプ, ポインター, 付箋の各ボタン押下時）
                    var prop = {};
                    if (typeof arParam[2] !== "undefined") {
                        // msg += arParam[2] + "\r\n";
                        prop = JSON.parse(arParam[2]);
                    }
                    setCurrentToolInfo(arParam[1], prop);
                } else if (arParam[0] === "FFLCOM_CLEAR") {
                    canvasClear();
                } else if (arParam[0] === "FFLCOM_SET_MODE_FINGER") {
                    setModeFinger();

                    if (g_state && allowDeleteObject) g_state.setDeleteMode(false);
                } else if (arParam[0] === "FFLCOM_GET_LEARNING_REC" && (arParam[1] || "").indexOf("{") > -1) {
                    loadLocusLog(JSON.parse(arParam[1]));
                }
            });

            // canvasのイベント
            $(canvasIds.map((x) => `#${x}`).join(", ")).on({
                "mousedown touchstart pointerdown": async function (e) {
                    if (allowDeleteObject && g_state.menu == 2) {
                        let menuData = g_state.menu_data[g_state.menu_item_selected];
                        let curPos = cursorPoint(e);
                        let pCursor = new Point3D(curPos.x, curPos.y, 0);
                        let foundDeleteLine = menuData.line_delete.find((l) => {
                            return MathLib.pointInsidePolygon(pCursor, l.vertices);
                        });
                        if (foundDeleteLine) {
                            let lineEl = $(`.select-menu-item-${g_state.menu_item_selected}`).find(
                                `.line-draw-delete[data-idx='${foundDeleteLine.idx}']`
                            );
                            if (lineEl) {
                                let events = ["mousedown", "mouseup"];

                                for (let i = 0; i < events.length; i++) {
                                    const evtName = events[i];
                                    console.log("fake event", evtName);

                                    var simulatedEvent = document.createEvent("MouseEvent");
                                    simulatedEvent.initMouseEvent(
                                        evtName,
                                        true,
                                        true,
                                        window,
                                        1,
                                        e.screenX,
                                        e.screenY,
                                        e.clientX,
                                        e.clientY,
                                        false,
                                        false,
                                        false,
                                        false,
                                        0,
                                        null
                                    );

                                    lineEl[0].dispatchEvent(simulatedEvent);
                                    console.log("fire", evtName);
                                    await delay(200);
                                }

                                return;
                            }
                        }
                    }

                    e.preventDefault();

                    // 既に描画中ではない場合
                    if (!bDraw) {
                        if (toolInfo.tool) {
                            bDraw = true;
                        }

                        // 消しゴムの場合
                        if (toolInfo.tool == TOOL_ERASER) {
                            bDraw = false;
                            bErase = true;
                        }

                        // マウス座標を取得
                        var posP = getPos(e);

                        // マウス座標をcanvasの論理座標に変換
                        var pos = cnvPosLog2Phys(posP.x, posP.y);

                        // 消しゴム
                        if (!bDraw && bErase) {
                            eraseExec(pos);
                        }

                        // 座標保持
                        old_X = pos.x;
                        old_Y = pos.y;

                        new_X = old_X;
                        new_Y = old_Y;

                        new_X = old_X;
                        new_Y = old_Y;
                    }
                },
                "mouseup mouseout mouseleave touchend touchcancel pointerup": function (e) {
                    e.preventDefault();

                    initPalletObj.getCanvas();

                    if (bDraw) {
                        // ペンの場合、かつmoveがない（クリック）場合
                        // 及び、マーカーの場合、このタイミングで記録する
                        if ((toolInfo.tool == TOOL_PEN && !bMove) || toolInfo.tool == TOOL_MARKER) {
                            if (!locusLog[locusCnt]) {
                                locusLog[locusCnt] = [];
                            }

                            if (toolInfo.tool == TOOL_PEN) {
                                new_X = old_X;
                                new_Y = old_Y;
                            } else if (toolInfo.tool == TOOL_MARKER) {
                                if (old_X == new_X && old_Y == new_Y) {
                                    old_X = old_X - 1;
                                    new_X = new_X + 1;
                                }
                            }

                            locusLog[locusCnt].push({
                                tool: toolInfo.tool,
                                sx: old_X,
                                sy: old_Y,
                                ex: new_X,
                                ey: new_Y,
                                color: toolInfo.color,
                                opacity: toolInfo.opacity,
                                size: toolInfo.size,
                                idCanvas,
                            });
                            old_X = new_X;
                            old_Y = new_Y;

                            // まずcanvasの描画をすべて消す
                            cCtx.clearRect(0, 0, cEle.width, cEle.height);

                            // 描画ログをはじめから順に描き直す
                            locusLog.forEach(function (locus) {
                                cCtx.beginPath();
                                locus
                                    .filter((x) => x.idCanvas == idCanvas)
                                    .forEach(function (l) {
                                        // 描画ログの描画情報に合わせてcanvasに描画する
                                        cCtx.moveTo(l.sx, l.sy);
                                        cCtx.lineTo(l.ex, l.ey);
                                        cCtx.strokeStyle = l.color;
                                        cCtx.globalAlpha = l.opacity;
                                        cCtx.lineWidth = l.size;
                                        if (l.tool == TOOL_PEN) {
                                            cCtx.lineJoin = "round";
                                            cCtx.lineCap = "round";
                                        } else if (l.tool == TOOL_MARKER) {
                                            cCtx.lineJoin = "bevel";
                                            cCtx.lineCap = "square";
                                        }
                                    });

                                cCtx.closePath();
                                cCtx.stroke();
                            });
                        }

                        // 描画終わりのフラグ
                        bDraw = false;
                        bMove = false;
                        locusCnt++;

                        if (toolInfo.tool == TOOL_MARKER) {
                            old_X = 0;
                            old_Y = 0;
                        }

                        // 描画ログがある場合
                        if (locusCnt > 0) {
                            // ツールバー上の「全消去」ボタンアイコンを変更する
                            window.parent.postMessage(`${"FFLCOM_CALL_CHANGE_BTN_ICONS" + "[,]" + "fflcom_clear" + "[,]"}${1}`, "*");

                            // 描画情報を保存するためのpostMessageを共通基盤側に送信する
                            window.parent.postMessage(`${"FFLCOM_SET_LEARNING_REC" + "[,]"}${JSON.stringify(locusLog)}`, "*");
                        } else {
                            window.parent.postMessage(`${"FFLCOM_CALL_CHANGE_BTN_ICONS" + "[,]" + "fflcom_clear" + "[,]"}${0}`, "*");
                        }
                    }

                    if (bErase) {
                        bErase = false;
                    }
                },
                "mousemove touchmove pointermove": function (e) {
                    e.preventDefault();
                    initPalletObj.getCanvas();

                    if (toolInfo.tool && bDraw == true) {
                        bMove = true;
                        // マウス座標を取得
                        var posP = getPos(e);

                        // マウス座標をcanvasの論理座標に変換
                        var pos = cnvPosLog2Phys(posP.x, posP.y);
                        new_X = pos.x;
                        new_Y = pos.y;

                        // マーカーの場合（垂直方向か水平方向か）
                        if (toolInfo.tool == TOOL_MARKER) {
                            if (Math.abs(pos.x - old_X) >= Math.abs(pos.y - old_Y)) {
                                new_X = pos.x;
                                new_Y = old_Y;
                            } else {
                                new_X = old_X;
                                new_Y = pos.y;
                            }
                        }

                        // 描画ログ配列データが存在しない場合の初期化
                        if (!locusLog[locusCnt]) {
                            locusLog[locusCnt] = [];
                        }

                        // 描画ログの配列に描画情報を追加
                        locusLog[locusCnt].push({
                            tool: toolInfo.tool,
                            sx: old_X,
                            sy: old_Y,
                            ex: new_X,
                            ey: new_Y,
                            color: toolInfo.color,
                            opacity: toolInfo.opacity,
                            size: toolInfo.size,
                            idCanvas,
                        });

                        // まずcanvasの描画をすべて消す
                        cCtx.clearRect(0, 0, cEle.width, cEle.height);

                        // 描画ログをはじめから順に描き直す
                        locusLog.forEach(function (locus) {
                            cCtx.beginPath();
                            locus
                                .filter((x) => x.idCanvas == idCanvas)
                                .forEach(function (l) {
                                    // 描画ログの描画情報に合わせてcanvasに描画する
                                    cCtx.moveTo(l.sx, l.sy);
                                    cCtx.lineTo(l.ex, l.ey);
                                    cCtx.strokeStyle = l.color;
                                    cCtx.globalAlpha = l.opacity;
                                    cCtx.lineWidth = l.size;
                                    if (l.tool == TOOL_PEN) {
                                        cCtx.lineJoin = "round";
                                        cCtx.lineCap = "round";
                                    } else if (l.tool == TOOL_MARKER) {
                                        cCtx.lineJoin = "bevel";
                                        cCtx.lineCap = "square";
                                    }
                                });
                            cCtx.closePath();
                            cCtx.stroke();
                        });

                        // マーカーの場合、手を離すまで記録はしない
                        if (toolInfo.tool == TOOL_MARKER) {
                            locusLog[locusCnt].pop();
                        }

                        if (toolInfo.tool != TOOL_MARKER) {
                            old_X = new_X;
                            old_Y = new_Y;
                        }
                    }
                    if (toolInfo.tool && !bDraw && bErase) {
                        // マウス座標を取得
                        var posP = getPos(e);

                        // マウス座標をcanvasの論理座標に変換
                        var pos = cnvPosLog2Phys(posP.x, posP.y);
                        eraseExec(pos);
                    }
                },
            });
        },
        initCanvas: function () {
            // cEle = document.getElementById("Mycanvas");
            // // console.log(`cEle = [${typeof cEle}]`);
            // cCtx = cEle.getContext("2d");
            // cCtx.lineJoin = "round";
            // cCtx.lineCap = "round";
            // Acquire Canvas Size
            // CONTENT_W = cEle.width;
            // CONTENT_H = cEle.height;
            initPalletObj.getCanvas();
        },
    };

    initPalletObj.initCanvas();
    initPalletObj.ctrls();
    initPalletObj.handler();
    getParameter();
    window.parent.postMessage("FFLCOM_GET_LEARNING_REC", "*");
    window.parent.postMessage("FFLCOM_GET_TOOLBAR_INFO", "*");
};

var urlParam = location.search.substring(1);

// パラメータを取得
var getParameter = function () {
    var param = urlParam.split("&");
    var paramArray = [];

    for (var i = 0; i < param.length; i++) {
        var paramItem = param[i].split("=");
        // パラメータをキーにして連想配列に追加する
        paramArray[paramItem[0]] = paramItem[1];
    }
    if (param.length > 0 && param[0] != "") {
        var keys = Object.keys(paramArray);
        var txtParam = "パラメータ：" + "\r\n";
        for (var i = 0, l = keys.length; i < l; i += 1) {
            txtParam += `${keys[i]}=${paramArray[keys[i]]}\r\n`;
        }
        $("#txtParameter").val(txtParam);
    } else {
        $("#txtParameter").val("パラメータ：なし");
    }
};

// 描画情報をすべて消す処理
var canvasClear = function () {
    let canvasEls = $(canvasIds.map((x) => `#${x}`).join(", "));
    for (let i = 0; i < canvasEls.length; i++) {
        const canvas = $(canvasEls[i]).get(0);
        var cc_l = canvas.getContext("2d");
        cc_l.beginPath();
        cc_l.clearRect(0, 0, canvas.width, canvas.height);
        cc_l.closePath();
    }

    locusLog = [];
    locusCnt = 0;
    // ツールバー上の「全消去」ボタンアイコンを変更する
    window.parent.postMessage(`${"FFLCOM_CALL_CHANGE_BTN_ICONS" + "[,]" + "fflcom_clear" + "[,]"}${0}`, "*");
    // 描画情報を保存するためのpostMessageを共通基盤側に送信する
    window.parent.postMessage(`${"FFLCOM_SET_LEARNING_REC" + "[,]"}${JSON.stringify(locusLog)}`, "*");
};

// タッチモードにする
var setModeFinger = function () {
    toolInfo.tool = TOOL_FINGER;
    $(canvasIds.map((x) => `#${x}`).join(", ")).css("pointer-events", "none");
};

// ツール情報を設定する
var setCurrentToolInfo = function (_tool, _prop) {
    $(canvasIds.map((x) => `#${x}`).join(", ")).css("pointer-events", "auto");
    if (_tool === "FFLCOM_TOOL_PEN") {
        toolInfo.tool = TOOL_PEN;
        toolInfo.color = _prop.color;
        toolInfo.size = _prop.size;
        toolInfo.opacity = _prop.opacity;
    } else if (_tool === "FFLCOM_TOOL_MARKER") {
        toolInfo.tool = TOOL_MARKER;
        toolInfo.color = _prop.color;
        toolInfo.size = _prop.size;
        toolInfo.opacity = _prop.opacity;
    } else if (_tool === "FFLCOM_TOOL_ERASER") {
        toolInfo.tool = TOOL_ERASER;
    } else {
        setModeFinger();
    }
};

// マウス座標をcanvasの論理サイズに変換する
var cnvPosLog2Phys = function (_x, _y) {
    var rc = document.getElementById(idCanvas).getBoundingClientRect();
    const MyCanvas = $(`#${idCanvas}`);

    return {
        x: Math.round((MyCanvas.attr("width") * (_x - rc.left)) / (rc.right - rc.left)),
        y: Math.round((MyCanvas.attr("height") * (_y - rc.top)) / (rc.bottom - rc.top)),
    };
};

// 保存した描画ログを再読込する
var loadLocusLog = function (_locusLog) {
    locusCnt = 0;
    locusLog = [];

    if (_locusLog.length > 0) {
        let canvasEls = $(canvasIds.map((x) => `#${x}`).join(", "));
        for (let i = 0; i < canvasEls.length; i++) {
            const canvas = $(canvasEls[i]).get(0);

            idCanvas = $(canvas).attr("id");
            cEle = document.getElementById(idCanvas);
            cCtx = cEle.getContext("2d");
            cCtx.lineJoin = "round";
            cCtx.lineCap = "round";

            cCtx.clearRect(0, 0, canvas.width, canvas.height);

            _locusLog.forEach(function (locus) {
                cCtx.beginPath();
                locus
                    .filter((x) => x.idCanvas == idCanvas)
                    .forEach(function (l) {
                        cCtx.moveTo(l.sx, l.sy);
                        cCtx.lineTo(l.ex, l.ey);
                        cCtx.strokeStyle = l.color;
                        cCtx.globalAlpha = l.opacity;
                        cCtx.lineWidth = l.size;
                        if (l.tool == TOOL_PEN) {
                            cCtx.lineJoin = "round";
                            cCtx.lineCap = "round";
                        } else if (l.tool == TOOL_MARKER) {
                            cCtx.lineJoin = "bevel";
                            cCtx.lineCap = "square";
                        }
                    });
                cCtx.closePath();
                cCtx.stroke();
            });
        }

        locusLog = [..._locusLog];
        locusCnt = locusLog.length;
    }

    initPalletObj.getCanvas();

    // 描画ログがある場合に、ツールバー上の「全消去」ボタンアイコンを変更する
    if (locusCnt > 0) {
        window.parent.postMessage(`${"FFLCOM_CALL_CHANGE_BTN_ICONS" + "[,]" + "fflcom_clear" + "[,]"}${1}`, "*");
    } else {
        window.parent.postMessage(`${"FFLCOM_CALL_CHANGE_BTN_ICONS" + "[,]" + "fflcom_clear" + "[,]"}${0}`, "*");
    }
};

// マウスの座標取得
var getPos = function (e) {
    var posP = { x: 0, y: 0 };

    return (
        e.touches && e.touches[0]
            ? (posP = {
                  x: e.touches[0].clientX,
                  y: e.touches[0].clientY,
              })
            : e.originalEvent && e.originalEvent.changedTouches && e.originalEvent.changedTouches[0]
            ? (posP = {
                  x: e.originalEvent.changedTouches[0].clientX,
                  y: e.originalEvent.changedTouches[0].clientY,
              })
            : e.clientX && e.clientY && (posP = { x: e.clientX, y: e.clientY }),
        posP
    );
};

// 消しゴムタップ座標が点上にあるか確認
const isPointOn = function (tool, sx, sy, ex, ey, x, y, threshold, idx, index) {
    var distance_x1 = Math.abs(x - sx);
    var distance_x2 = Math.abs(ex - x);
    var distance_y1 = Math.abs(y - sy);
    var distance_y2 = Math.abs(ey - y);

    if (tool == TOOL_MARKER) {
        // マーカの消し判定
        var isHorizontal = false;
        var isVertical = false;
        if (ex == sx) isVertical = true;
        if (ey == sy) isHorizontal = true;

        if (isVertical) {
            if (distance_x1 <= threshold && distance_x2 <= threshold) {
                if (isDebug) {
                    console.log(`  TOOL_MARKER erase isVertical. idx=[${idx}]`);
                }
                if (y >= sy && y <= ey) return true;
            }
        }

        if (isHorizontal) {
            if (distance_y1 <= threshold && distance_y2 <= threshold) {
                if (isDebug) {
                    console.log(`  TOOL_MARKER erase isHorizontal. idx=[${idx}]`);
                }
                if (x >= sx && x <= ex) return true;
            }
        }
    }

    if (distance_x1 <= threshold && distance_x2 <= threshold) {
        // 点の判定
        if (distance_y1 <= threshold && distance_y2 <= threshold) {
            if (this.isDebug) {
                console.log(`  TOOL_PEN erase single point. idx=[${idx}]`);
            }

            return true;
        }
    }

    return false;
};

const hitTest = function (sx, sy, ex, ey, x, y, threshold, tool) {
    if (tool == TOOL_PEN) {
        // クリック点を原点に平行移動
        var point1_x = sx - x;
        var point1_y = sy - y;

        var point2_x = ex - x;
        var point2_y = ey - y;

        // 座標軸を回転
        var point1_2_rad = Math.atan2(point2_y - point1_y, point2_x - point1_x);
        var rect_sx = point1_x * Math.cos(point1_2_rad) + point1_y * Math.sin(point1_2_rad);
        var rect_sy = -point1_x * Math.sin(point1_2_rad) + point1_y * Math.cos(point1_2_rad);

        var rect_ex = point2_x * Math.cos(point1_2_rad) + point2_y * Math.sin(point1_2_rad);
        var rect_ey = -point2_x * Math.sin(point1_2_rad) + point2_y * Math.cos(point1_2_rad);

        if (rect_sx < 0 && rect_ex > 0 && rect_sy + threshold >= 0 && rect_sy - threshold <= 0) {
            return true;
        }

        return false;
    }

    if (tool == TOOL_MARKER) {
        var end_x = 0;
        var end_y = 0;

        if (Math.abs(ex - sx) >= Math.abs(ey - sy)) {
            end_x = ex;
            end_y = sy;
        } else {
            end_x = sx;
            end_y = ey;
        }

        var left_x = 0;
        var top_y = 0;
        var right_x = 0;
        var bottom_y = 0;

        if (sx <= ex) {
            left_x = sx - threshold / 2;
            right_x = end_x + threshold / 2;
        } else {
            left_x = end_x - threshold / 2;
            right_x = sx + threshold / 2;
        }

        if (sy <= ey) {
            top_y = sy - threshold / 2;
            bottom_y = end_y + threshold / 2;
        } else {
            top_y = end_y - threshold / 2;
            bottom_y = sy + threshold / 2;
        }

        if (sx <= end_x) {
            left_x = sx - threshold / 2;
            right_x = end_x + threshold / 2;
        } else {
            left_x = end_x - threshold / 2;
            right_x = sx + threshold / 2;
        }

        if (left_x <= x && x <= right_x && top_y <= y && y <= bottom_y) {
            return true;
        }

        return false;
    }
};

var eraseExec = function (_pos) {
    initPalletObj.getCanvas();

    if (locusLog.length >= 0) {
        const numStrokes = locusLog.length;
        const _threshold = 8;
        const _x = _pos.x;
        const _y = _pos.y;

        var newLocusLog = [];
        cCtx.clearRect(0, 0, CONTENT_W, CONTENT_H);
        locusLog.forEach(function (locus, index) {
            let isErase = false;
            cCtx.beginPath();
            if (isDebug) {
                console.log(`index = [${index}], locusLog.length = [${locusLog.length}`, `] ,locusCnt = [${locusCnt}]`);
            }

            locus
                .filter((x) => x.idCanvas == idCanvas)
                .forEach(function (l, idx) {
                    cCtx.moveTo(l.sx, l.sy);
                    cCtx.lineTo(l.ex, l.ey);
                    cCtx.strokeStyle = l.color;
                    cCtx.globalAlpha = l.opacity;
                    cCtx.lineWidth = l.size;
                    {
                        cCtx.lineJoin = "round";
                        cCtx.lineCap = "round";
                    }
                    if (l.tool == TOOL_MARKER) {
                        cCtx.lineJoin = "bevel";
                        cCtx.lineCap = "square";
                    }
                    if (!isErase) {
                        if (isPointOn(l.tool, l.sx, l.sy, l.ex, l.ey, _x, _y, _threshold, idx, index)) {
                            isErase = true;
                        } else if (hitTest(l.sx, l.sy, l.ex, l.ey, _x, _y, _threshold, l.tool)) {
                            isErase = true;
                        }
                    }
                });
            cCtx.closePath();
            cCtx.stroke();

            if (!isErase) {
                newLocusLog.push(locus);
            }
        });

        loadLocusLog(newLocusLog);

        if (numStrokes != newLocusLog.length) {
            // 消しゴム処理した結果を記録
            window.parent.postMessage(`${"FFLCOM_SET_LEARNING_REC" + "[,]"}${JSON.stringify(locusLog)}`, "*");

            if (locusLog.length > 0) {
                window.parent.postMessage("FFLCOM_CALL_CHANGE_BTN_ICONS[,]fflcom_clear[,]1", "*");
            } else {
                window.parent.postMessage("FFLCOM_CALL_CHANGE_BTN_ICONS[,]fflcom_clear[,]0", "*");
            }
        }
    }
};

// ページ送り(各コンテンツのページ切換から呼び出される)
function changePageCanvas(currentPage, changePage) {
    if (isDebug) {
        console.log(`changePageCanvas current=[${currentPage}], change=[${changePage}]`);
    }

    // 現在のCancasの描画内容のバックアップ(キャンバスが空の場合もあるので、そのまま保存）
    pageCanvasLog[currentPage] = locusLog;
    canvasClear();

    // バックアップ対象Canvasからの復元
    if (pageCanvasLog[changePage]) {
        const restoreLocusLog = pageCanvasLog[changePage];
        if (restoreLocusLog) {
            loadLocusLog(restoreLocusLog);
        }
    }
}
