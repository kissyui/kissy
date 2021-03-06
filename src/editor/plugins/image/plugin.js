
KISSY.Editor.add("plugins~image", function(E) {

    var Y = YAHOO.util, Dom = Y.Dom, Event = Y.Event, Connect = Y.Connect, Lang = YAHOO.lang,
        UA = YAHOO.env.ua,
        isIE = UA.ie,
        TYPE = E.PLUGIN_TYPE,

        DIALOG_CLS = "ks-editor-image",
        BTN_OK_CLS = "ks-editor-btn-ok",
        BTN_CANCEL_CLS = "ks-editor-btn-cancel",
        TAB_CLS = "ks-editor-image-tabs",
        TAB_CONTENT_CLS = "ks-editor-image-tab-content",
        UPLOADING_CLS = "ks-editor-image-uploading",
        ACTIONS_CLS = "ks-editor-dialog-actions",
        NO_TAB_CLS = "ks-editor-image-no-tab",
        SELECTED_TAB_CLS = "ks-editor-image-tab-selected",

        REG_LINK_FILTER = /^(?:.*?:\/\/)?(.*?)\/.*$/,

        TABS_TMPL = { local: '<li rel="local" class="' + SELECTED_TAB_CLS  + '">{tab_local}</li>',
                      link: '<li rel="link">{tab_link}</li>',
                      album: '<li rel="album">{tab_album}</li>'
                    },

        DIALOG_TMPL = ['<form action="javascript: void(0)">',
                          '<ul class="', TAB_CLS ,' ks-clearfix">',
                          '</ul>',
                          '<div class="', TAB_CONTENT_CLS, '" rel="local" style="display: none">',
                              '<label>{label_local}</label>',
                              '<input type="file" size="40" name="imgFile" unselectable="on" />',
                              '{local_extraCode}',
                          '</div>',
                          '<div class="', TAB_CONTENT_CLS, '" rel="link">',
                              '<label>{label_link}</label>',
                              '<input name="imgUrl" size="50" />',
                          '</div>',
                          '<div class="', TAB_CONTENT_CLS, '" rel="album" style="display: none">',
                              '<label>{label_album}</label>',
                              '<p style="width: 300px">尚未实现...</p>', // TODO: 从相册中选择图片
                          '</div>',
                          '<div class="', UPLOADING_CLS, '" style="display: none">',
                              '<p style="width: 300px">{uploading}</p>',
                          '</div>',
                          '<div class="', ACTIONS_CLS ,'">',
                              '<button name="ok" class="', BTN_OK_CLS, '">{ok}</button>',
                              '<span class="', BTN_CANCEL_CLS ,'">{cancel}</span>',
                          '</div>',
                      '</form>'].join(""),

        defaultConfig = {
            tabs: ["link"],
            upload: {
                actionUrl: "",
                filter: "png|gif|jpg|jpeg",
                filterMsg: "", // 默认为 this.lang.upload_filter
                linkFilter: "",
                linkFilterMsg: "", // 默认为 this.lang.upload_linkFilter
                enableXdr: false,
                connectionSwf: "http://a.tbcdn.cn/yui/2.8.0r4/build/connection/connection.swf",
                formatResponse: function(data) {
                    var ret = [];
                    for (var key in data) ret.push(data[key]);
                    return ret;
                },
                extraCode: ""
            }
        };

    E.addPlugin("image", {

        /**
         * 种类：按钮
         */
        type: TYPE.TOOLBAR_BUTTON,

        /**
         * 配置项
         */
        config: {},

        /**
         * 关联的对话框
         */
        dialog: null,

        /**
         * 关联的表单
         */
        form: null,

        /**
         * 关联的 range 对象
         */
        range: null,

        currentTab: null,
        currentPanel: null,
        uploadingPanel: null,
        actionsBar: null,

        /**
         * 初始化函数
         */
        init: function() {
            var pluginConfig = this.editor.config.pluginsConfig[this.name] || {};
            defaultConfig.upload.filterMsg = this.lang["upload_filter"];
            defaultConfig.upload.linkFilterMsg = this.lang["upload_linkFilter"];
            this.config = Lang.merge(defaultConfig, pluginConfig);
            this.config.upload = Lang.merge(defaultConfig.upload, pluginConfig.upload || {});

            this._renderUI();
            this._bindUI();

            this.actionsBar = Dom.getElementsByClassName(ACTIONS_CLS, "div", this.dialog)[0];
            this.uploadingPanel = Dom.getElementsByClassName(UPLOADING_CLS, "div", this.dialog)[0];
            this.config.upload.enableXdr && this._initXdrUpload();
        },

        /**
         * 初始化对话框界面
         */
        _renderUI: function() {
            var dialog = E.Menu.generateDropMenu(this.editor, this.domEl, [1, 0]),
                lang = this.lang;

            // 添加自定义项
            lang["local_extraCode"] = this.config.upload.extraCode;

            dialog.className += " " + DIALOG_CLS;
            dialog.innerHTML = DIALOG_TMPL.replace(/\{([^}]+)\}/g, function(match, key) {
                return (key in lang) ? lang[key] : key;
            });

            this.dialog = dialog;
            this.form = dialog.getElementsByTagName("form")[0];
            if(isIE) E.Dom.setItemUnselectable(dialog);

            this._renderTabs();
        },

        _renderTabs: function() {
            var lang = this.lang, self = this,
                ul = Dom.getElementsByClassName(TAB_CLS, "ul", this.dialog)[0],
                panels = Dom.getElementsByClassName(TAB_CONTENT_CLS, "div", this.dialog);

            // 根据配置添加 tabs
            var keys = this.config["tabs"], html = "";
            for(var k = 0, l = keys.length; k < l; k++) {
                html += TABS_TMPL[keys[k]];
            }

            // 文案
            ul.innerHTML = html.replace(/\{([^}]+)\}/g, function(match, key) {
                return (key in lang) ? lang[key] : key;
            });

            // 只有一个 tabs 时不显示
            var tabs = ul.childNodes, len = panels.length;
            if(tabs.length === 1) {
                Dom.addClass(this.dialog, NO_TAB_CLS);
            }

            // 切换
            switchTab(tabs[0]); // 默认选中第一个Tab
            Event.on(tabs, "click", function() {
                switchTab(this);
            });

            function switchTab(trigger) {
                var j = 0, rel = trigger.getAttribute("rel");
                for (var i = 0; i < len; i++) {
                    if(tabs[i]) Dom.removeClass(tabs[i], SELECTED_TAB_CLS);
                    panels[i].style.display = "none";

                    if (panels[i].getAttribute("rel") == rel) {
                        j = i;
                    }
                }

                // ie6 下，需更新 iframe shim
                if(UA.ie === 6) E.Menu._updateShimRegion(self.dialog);

                Dom.addClass(trigger, SELECTED_TAB_CLS);
                panels[j].style.display = "";

                self.currentTab = trigger.getAttribute("rel");
                self.currentPanel = panels[j];
            }
        },

        /**
         * 绑定事件
         */
        _bindUI: function() {
            var self = this;

            // 显示/隐藏对话框时的事件
            Event.on(this.domEl, "click", function() {
                // 仅在显示时更新
                if (self.dialog.style.visibility === isIE ? "hidden" : "visible") { // 事件的触发顺序不同
                    self._syncUI();
                }
            });

            // 注册表单按钮点击事件
            Event.on(this.dialog, "click", function(ev) {
                var target = Event.getTarget(ev),
                    currentTab = self.currentTab;

                switch(target.className) {
                    case BTN_OK_CLS:
                        if(currentTab === "local") {
                            Event.stopPropagation(ev);
                            self._insertLocalImage();
                        } else {
                            self._insertWebImage();
                        }
                        break;
                    case BTN_CANCEL_CLS: // 直接往上冒泡，关闭对话框
                        break;
                    default: // 点击在非按钮处，停止冒泡，保留对话框
                        Event.stopPropagation(ev);
                }
            });
        },

        /**
         * 初始化跨域上传
         */
        _initXdrUpload: function() {
            var tabs = this.config["tabs"];

            for(var i = 0, len = tabs.length; i < len; i++) {
                if(tabs[i] === "local") { // 有上传 tab 时才进行以下操作
                    Connect.transport(this.config.upload.connectionSwf);
                    //Connect.xdrReadyEvent.subscribe(function(){ alert("xdr ready"); });
                    break;
                }
            }
        },

        _insertLocalImage: function() {
            var form = this.form,
                uploadConfig = this.config.upload,
                imgFile = form["imgFile"].value,
                actionUrl = uploadConfig.actionUrl,
                self = this, ext;

            if (imgFile && actionUrl) {

                // 检查文件类型是否正确
                if(uploadConfig.filter !== "*") {
                    ext = imgFile.substring(imgFile.lastIndexOf(".") + 1).toLowerCase();
                    if(uploadConfig.filter.indexOf(ext) == -1) {
                        alert(uploadConfig.filterMsg);
                        self.form.reset();
                        return;
                    }
                }

                // 显示上传滚动条
                this.uploadingPanel.style.display = "";
                this.currentPanel.style.display = "none";
                this.actionsBar.style.display = "none";
                if(UA.ie === 6) E.Menu._updateShimRegion(this.dialog); // ie6 下，还需更新 iframe shim

                // 发送 XHR
                Connect.setForm(form, true);
                Connect.asyncRequest("post", actionUrl, {
                    upload: function(o) {
                        try {
                            // 标准格式如下：
                            // 成功时，返回 ["0", "图片地址"]
                            // 失败时，返回 ["1", "错误信息"]
                            var data = uploadConfig.formatResponse(Lang.JSON.parse(o.responseText));
                            if (data[0] == "0") {
                                self._insertImage(data[1]);
                                self._hideDialog();
                            } else {
                                self._onUploadError(data[1]);
                            }
                        }
                        catch(ex) {
                            self._onUploadError(
                                    Lang.dump(ex) +
                                    "\no = " + Lang.dump(o) +
                                    "\n[from upload catch code]");
                        }
                    },
                    xdr: uploadConfig.enableXdr
                });
            } else {
                self._hideDialog();
            }
        },

        _onUploadError: function(msg) {
            alert(this.lang["upload_error"] + "\n\n" + msg);
            this._hideDialog();

            // 测试了以下错误类型：
            //   - json parse 异常，包括 actionUrl 不存在、未登录、跨域等各种因素
            //   - 服务器端返回错误信息 ["1", "error msg"]
        },

        _insertWebImage: function() {
            var imgUrl = this.form["imgUrl"].value || '',
                cfg = this.config.upload,
                filter = cfg.linkFilter,
                SEP = '|',
                match, hostname;

            // 获取 hostname
            if(match = REG_LINK_FILTER.exec(imgUrl)) {
               hostname = match[1];
            }
            if(!imgUrl || !hostname) return;

            // 检查网址是否在白名单中
            if (filter && filter !== "*") {
                if ((SEP + filter.toLowerCase() + SEP).indexOf(SEP + hostname.toLowerCase() + SEP) === -1) {
                    alert(cfg.linkFilterMsg);
                    return;
                }
            }

            this._insertImage(imgUrl);
        },

        /**
         * 隐藏对话框
         */
        _hideDialog: function() {
            var activeDropMenu = this.editor.activeDropMenu;
            if(activeDropMenu && Dom.isAncestor(activeDropMenu, this.dialog)) {
                E.Menu.hideActiveDropMenu(this.editor);
            }

            // 还原焦点
            this.editor.contentWin.focus();
        },

        /**
         * 更新界面上的表单值
         */
        _syncUI: function() {
            // 保存 range, 以便还原
            this.range = E.Range.saveRange(this.editor);

            // reset
            this.form.reset();

            // restore
            this.uploadingPanel.style.display = "none";
            this.currentPanel.style.display = "";
            this.actionsBar.style.display = "";
        },

        /**
         * 插入图片
         */
        _insertImage: function(url, alt) {
            url = Lang.trim(url);

            // url 为空时，不处理
            if (url.length === 0) {
                return;
            }

            var editor = this.editor,
                range = this.range;

            // 插入图片
            if (window.getSelection) { // W3C
                var img = editor.contentDoc.createElement("img");
                img.src = url;
                if(alt) img.setAttribute("alt", alt);

                range.deleteContents(); // 清空选中内容
                range.insertNode(img); // 插入图片

                // 使得连续插入图片时，添加在后面
                if(UA.webkit) {
                    var selection = editor.contentWin.getSelection();
                    selection.addRange(range);
                    selection.collapseToEnd();
                } else {
                    range.setStartAfter(img);
                }

                editor.contentWin.focus(); // 显示光标

            } else if(document.selection) { // IE
                // 还原焦点
                editor.contentWin.focus();

                if("text" in range) { // TextRange
                    range.select(); // 还原选区

                    var html = '<img src="' + url + '"';
                    alt && (html += ' "alt="' + alt + '"');
                    html += '>';
                    range.pasteHTML(html);

                } else { // ControlRange
                    range.execCommand("insertImage", false, url);
                }
            }
        }
    });

 });

/**
 * NOTES:
 *   - <input type="file" unselectable="on" /> 这一行，折腾了一下午。如果不加 unselectable, 会导致 IE 下
 *     焦点丢失（range.select() 和 contentDoc.focus() 不管用）。加上后，顺利解决。同时还自动使得 IE7- 下不可
 *     输入。
 *
 * TODO:
 *   - 跨域支持
 */
