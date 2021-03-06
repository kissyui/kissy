
KISSY.Editor.add("config", function(E) {

    E.config = {
        /**
         * 基本路径
         */
        base: "",

        /**
         * 语言
         */
        language: "zh-cn",

        /**
         * 主题
         */
        theme: "default",

        /**
         * Toolbar 上功能插件
         */
        toolbar: [
            "source",
            "",
            /*"undo", "redo",
            "",*/
            "fontName", "fontSize", "bold", "italic", "underline", "strikeThrough", "foreColor", "backColor",
            "",
            "link", "smiley", "image",
            "",
            "insertOrderedList", "insertUnorderedList", "outdent", "indent", "justifyLeft", "justifyCenter", "justifyRight"
            //"",
            //"removeformat"
        ],

        /**
         * Statusbar 上的插件
         */
        statusbar: [
            "wordcount",
            "resize"
        ],

        /**
         * 插件的配置
         */
        pluginsConfig: { }

        /**
         * 自动聚焦
         */
        // autoFocus: false
    };

});
