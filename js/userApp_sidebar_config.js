var userApp_sidebar_config = {
    imgBaseL: "",
    imgBaseR: "",
    barTabL: [],
    barTabR: [],
    bars: [
        {
            barName: "アプリ",
            items: [
                //          { id: "fflcom_close", img: [] },
                //          { id: "fflcom_bookshelf", img: [] },
                //          { id: "fflcom_index", img: [] },
                { id: "fflcom_finger", img: [] },
                {
                    id: "fflcom_pen",
                    img: [
                        ["/img/fsisb_pen_red_n.png", "/img/fsisb_pen_red_a.png", "/img/fsisb_pen_marker_d.png"],
                        ["/img/fsisb_pen_yellow_n.png", "/img/fsisb_pen_yellow_a.png", "/img/fsisb_pen_marker_d.png"],
                        ["/img/fsisb_pen_green_n.png", "/img/fsisb_pen_green_a.png", "/img/fsisb_pen_marker_d.png"],
                        ["/img/fsisb_pen_blue_n.png", "/img/fsisb_pen_blue_a.png", "/img/fsisb_pen_marker_d.png"],
                        ["/img/fsisb_pen_black_n.png", "/img/fsisb_pen_black_a.png", "/img/fsisb_pen_marker_d.png"],
                        ["/img/fsisb_pen_white_n.png", "/img/fsisb_pen_white_a.png", "/img/fsisb_pen_marker_d.png"],
                        [],
                        [],
                        [],
                        [],
                        ["/img/fsisb_marker_red_n.png", "/img/fsisb_marker_red_a.png", "/img/fsisb_pen_marker_d.png"],
                        ["/img/fsisb_marker_yellow_n.png", "/img/fsisb_marker_yellow_a.png", "/img/fsisb_pen_marker_d.png"],
                        ["/img/fsisb_marker_green_n.png", "/img/fsisb_marker_green_a.png", "/img/fsisb_pen_marker_d.png"],
                        ["/img/fsisb_marker_blue_n.png", "/img/fsisb_marker_blue_a.png", "/img/fsisb_pen_marker_d.png"],
                        ["/img/fsisb_marker_black_n.png", "/img/fsisb_marker_black_a.png", "/img/fsisb_pen_marker_d.png"],
                        ["/img/fsisb_marker_white_n.png", "/img/fsisb_marker_white_a.png", "/img/fsisb_pen_marker_d.png"],
                    ],
                },
                { id: "fflcom_eraser", img: [] },
                { id: "fflcom_clear", img: [] },
                { id: "fflcom_secretSideBar", secret: "fflcom_tools", img: ["./icons/img_fflcom_tools_ksk.png"] },
                { id: "fflcom_secretSideBar", secret: "fflcom_saveload", img: [] },
                { id: "fflcom_secretSideBar", secret: "fflcom_shows", img: ["./icons/img_fflcom_shows_ksk.png"] },
            ],
        },
        {
            barName: "きろく",
            secret: "fflcom_saveload",
            items: [
                { id: "fflcom_save", img: [] },
                { id: "fflcom_load", img: [] },
                //       { id: "fflcom_saveImage", img: [] },
                //       { id: "fflcom_print", img: [] },
            ],
        },
        {
            barName: "表示",
            secret: "fflcom_shows",
            items: [{ id: "fflcom_fullscreen", img: [] }],
        },
        {
            barName: "どうぐ",
            secret: "fflcom_tools",
            items: [
                { id: "fflcom_timer", img: [] },
                { id: "fflcom_pointer", img: [] },
            ],
        },
    ],
};
