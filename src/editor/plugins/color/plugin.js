
KISSY.Editor.add("plugins~color", function(E) {

    var Y = YAHOO.util, Dom = Y.Dom, Event = Y.Event,
        UA = YAHOO.env.ua,
        isIE = UA.ie,
        TYPE = E.PLUGIN_TYPE,

        PALETTE_TABLE_TMPL = '<div class="ks-editor-palette-table"><table><tbody>{TR}</tbody></table></div>',
        PALETTE_CELL_TMPL = '<td class="ks-editor-palette-cell"><div class="ks-editor-palette-colorswatch" title="{COLOR}" style="background-color:{COLOR}"></div></td>',

        COLOR_GRAY = ["000", "444", "666", "999", "CCC", "EEE", "F3F3F3", "FFF"],
        COLOR_NORMAL = ["F00", "F90", "FF0", "0F0", "0FF", "00F", "90F", "F0F"],
        COLOR_DETAIL = [
                "F4CCCC", "FCE5CD", "FFF2CC", "D9EAD3", "D0E0E3", "CFE2F3", "D9D2E9", "EAD1DC",
                "EA9999", "F9CB9C", "FFE599", "B6D7A8", "A2C4C9", "9FC5E8", "B4A7D6", "D5A6BD",
                "E06666", "F6B26B", "FFD966", "93C47D", "76A5AF", "6FA8DC", "8E7CC3", "C27BAD",
                "CC0000", "E69138", "F1C232", "6AA84F", "45818E", "3D85C6", "674EA7", "A64D79",
                "990000", "B45F06", "BF9000", "38761D", "134F5C", "0B5394", "351C75", "741B47",
                "660000", "783F04", "7F6000", "274E13", "0C343D", "073763", "20124D", "4C1130"
        ],

        PALETTE_CELL_CLS = "ks-editor-palette-colorswatch",
        PALETTE_CELL_SELECTED = "ks-editor-palette-cell-selected";

    E.addPlugin(["foreColor", "backColor"], {
        /**
         * 种类：菜单按钮
         */
        type: TYPE.TOOLBAR_MENU_BUTTON,

        /**
         * 当前选取色
         */
        color: "",

        /**
         * 当前颜色指示条
         */
        _indicator: null,

        /**
         * 取色块
         */
        swatches: null,

        /**
         * 关联的下拉菜单框
         */
        dropMenu: null,

        range: null,

        /**
         * 初始化
         */
        init: function() {
            var el = this.domEl,
                caption = el.getElementsByTagName("span")[0].parentNode;

            this.color = this._getDefaultColor();

            Dom.addClass(el, "ks-editor-toolbar-color-button");
            caption.innerHTML = '<div class="ks-editor-toolbar-color-button-indicator" style="border-bottom-color:' + this.color + '">'
                               + caption.innerHTML
                               + '</div>';

            this._indicator = caption.firstChild;

            this._renderUI();
            this._bindUI();

            this.swatches = Dom.getElementsByClassName(PALETTE_CELL_CLS, "div", this.dropMenu);
        },

        _renderUI: function() {
            // 有两种方案：
            //  1. 仿照 MS Office 2007, 仅当点击下拉箭头时，才弹出下拉框。点击 caption 时，直接设置颜色。
            //  2. 仿照 Google Docs, 不区分 caption 和 dropdown，让每次点击都弹出下拉框。
            // 从逻辑上讲，方案1不错。但是，考虑 web 页面上，按钮比较小，方案2这样反而能增加易用性。
            // 这里采用方案2

            this.dropMenu = E.Menu.generateDropMenu(this.editor, this.domEl, [1, 0]);

            // 生成下拉框内的内容
            this._generatePalettes();

            // 针对 ie，设置不可选择
            if (isIE) E.Dom.setItemUnselectable(this.dropMenu);
        },

        _bindUI: function() {
            // 注册选取事件
            this._bindPickEvent();

            Event.on(this.domEl, "click", function() {
                // 保存 range, 以便还原
                this.range = this.editor.getSelectionRange();

                // 聚集到按钮上，隐藏光标，否则 ie 下光标会显示在层上面
                // 注：通过 blur / focus 等方式在 ie7- 下无效
                isIE && this.editor.contentDoc.selection.empty();

                // 更新选中色
                this._updateSelectedColor(this.color);
            }, this, true);
        },

        /**
         * 生成取色板
         */
        _generatePalettes: function() {
            var htmlCode = "";

            // 黑白色板
            htmlCode += this._getPaletteTable(COLOR_GRAY);

            // 常用色板
            htmlCode += this._getPaletteTable(COLOR_NORMAL);

            // 详细色板
            htmlCode += this._getPaletteTable(COLOR_DETAIL);

            // 添加到 DOM 中
            this.dropMenu.innerHTML = htmlCode;
        },

        _getPaletteTable: function(colors) {
            var i, len = colors.length, color,
                trs = "<tr>";

            for(i = 0, len = colors.length; i < len; ++i) {
                if(i != 0 && i % 8 == 0) {
                    trs += "</tr><tr>";
                }

                color = E.Color.toRGB("#" + colors[i]).toUpperCase();
                //console.log("color = " + color);
                trs += PALETTE_CELL_TMPL.replace(/{COLOR}/g, color);
            }
            trs += "</tr>";

            return PALETTE_TABLE_TMPL.replace("{TR}", trs);
        },

        /**
         * 绑定取色事件
         */
        _bindPickEvent: function() {
            var self = this;

            Event.on(this.dropMenu, "click", function(ev) {
                var target = Event.getTarget(ev),
                    attr = target.getAttribute("title");

                if(attr && attr.indexOf("RGB") === 0) {
                    self._doAction(attr);
                }

                // 关闭悬浮框
                Event.stopPropagation(ev);
                E.Menu.hideActiveDropMenu(self.editor);
                // 注：在这里阻止掉事件冒泡，自己处理对话框的关闭，是因为
                // 在 Firefox 下，当执行 doAction 后，doc 获取到 click
                // 触发 updateState 时，还获取不到当前的颜色值。
                // 这样做，对性能也有好处，这种情况下不需要更新 updateState
            });
        },

        /**
         * 执行操作
         */
        _doAction: function(val) {
            if (!val) return;

            // 更新当前值
            this.setColor(E.Color.toHex(val));

            // 还原选区
            var range = this.range;
            if (isIE && range.select) range.select();

            // 执行命令
            this.editor.execCommand(this.name, this.color);
        },
        
        /**
         * 设置颜色
         * @param {string} val 格式 #RRGGBB or #RGB
         */
        setColor: function(val) {
            this.color = val;

            this._updateIndicatorColor(val);
            this._updateSelectedColor(val);
        },

        /**
         * 更新指示器的颜色
         * @param val HEX 格式
         */
        _updateIndicatorColor: function(val) {
            // 更新 indicator
            this._indicator.style.borderBottomColor = val;
        },

        /**
         * 更新下拉菜单中选中的颜色
         * @param {string} val 格式 #RRGGBB or #RGB
         */
        _updateSelectedColor: function(val) {
            var i, len, swatch, swatches = this.swatches;

            for(i = 0, len = swatches.length; i < len; ++i) {
                swatch = swatches[i];

                // 获取的 backgroundColor 在不同浏览器下，格式有差异，需要统一转换后再比较
                if(E.Color.toHex(swatch.style.backgroundColor) == val) {
                    Dom.addClass(swatch.parentNode, PALETTE_CELL_SELECTED);
                } else {
                    Dom.removeClass(swatch.parentNode, PALETTE_CELL_SELECTED);
                }
            }
        },

        /**
         * 更新按钮状态
         */
        // ie 下，queryCommandValue 无法正确获取到 backColor 的值
        // 干脆禁用此功能，模仿 Office2007 的处理，显示最后的选取色
//        updateState: function() {
//            var doc = this.editor.contentDoc,
//                name = this.name, t, val;
//
//            if(name == "backColor" && UA.gecko) name = "hiliteColor";
//
//            try {
//                if (doc.queryCommandEnabled(name)) {
//                    t = doc.queryCommandValue(name);
//
//                    if(isIE && typeof t == "number") { // ie下，对于 backColor, 有时返回 int 格式，有时又会直接返回 hex 格式
//                        t = E.Color.int2hex(t);
//                    }
//                    if (t === "transparent") t = ""; // 背景色为透明色时，取默认色
//                    if(t === "rgba(0, 0, 0, 0)") t = ""; // webkit 的背景色是 rgba 的
//
//                    val = t ? E.Color.toHex(t) : this._getDefaultColor(); // t 为空字符串时，表示点击在空行或尚未设置样式的地方
//                    if (val && val != this.color) {
//                        this.color = val;
//                        this._updateIndicatorColor(val);
//                    }
//                }
//            } catch(ex) {
//            }
//        },

        _getDefaultColor: function() {
            return (this.name == "foreColor") ? "#000000" : "#ffffff";
        }
    });

});

// TODO
//  1. 仿 google, 对键盘事件的支持
