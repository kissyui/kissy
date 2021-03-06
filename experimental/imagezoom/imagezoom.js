/**
 * 放大镜效果
 * @module      imagezoom
 * @creater     qiaohua@taobao.com
 * @depender    kissy-core
 * @version     0.2
 */

KISSY.add("imagezoom", function(S, undefined) {
    var DOM = S.DOM,
        EVENT = S.Event,
        HIDDEN = 'hidden',
        IMGZOOM_CONTAINER_CLS = 'ks-imagezoom-container',
        IMGZOOM_MAGNIFIER_CLS = 'ks-imagezoom-magnifier',
        IMGZOOM_VIEWER_CLS = 'ks-imagezoom-viewer',
        IMGZOOM_GLASS_CLS = 'ks-imagezoom-glass',
        IMGZOOM_ICON_CLS = 'ks-imagezoom-icon',
        IMGZOOM_VIEWER_BK_CLS = 'ks-imagezoom-viewer-bk',
        POSITION = ['top', 'right', 'bottom', 'left'],
        TYPE = ['default', 'glass', 'follow'],
        DIV = '<div>',
        IMG = '<img>',
        B = '<b>',
        HEIGHT = 'height',
        WIDTH = 'width',
        TOP = 'top',
        LEFT = 'left',
        
        /**
         * imagezoom的默认设置
         */
        defaultConfig = {
            /**
             * 默认设置
             */
            bigImageSrc: '',    // 大图片路径, 为''时取原图路径
            offset: 10,         // 大图偏移量
            glassSize: {height:100, width:100},      // 镜片高,宽度
            useZoomIcon: true,          // 是否需要zoomicon
            zType: 'default',           // 选择显示模式, 可选值: TYPE
            position: 'right',          // 大图显示位置, 可选值: POSITION
            preload: true,              // 是否预加载
            timeout: 6000,              // 等待大图加载时间, 单位: ms
            bigImageSize: {height:900, width:900}     // 设定大图的高宽度
        };
        
        /** 
         * 放大镜组件
         * @class ImageZoom
         * @constructor
         * @param {String|HTMLElement} image
         * @param {Object} config
         */
        function ImageZoom(img, cfg) {
            var self = this;
            
            if (!(self instanceof ImageZoom)) {
                return new ImageZoom(img, cfg);
            }
            
            /**
             * 需要缩放的图片
             * @type HTMLElement
             */
            self.image = S.get(img);
            if (!self.image) {
                return;
            }
            /**
             * 整体容器
             * @type HTMLElement
             */
            self.container = null;
            
            /**
             * 小图外层
             * @type HTMLElement
             */
            self.origin = null;
            
            /**
             * 放大显示的图片外层
             * @type HTMLElement
             */
            self.viewer = null;
            
            /**
             * 放大显示的图片
             * @type HTMLElement
             */
            self.bigImage = null;
            
            /**
             * 配置参数
             * @type Object
             */
            self.config = S.merge(defaultConfig, cfg);
            
            /**
             * 镜片
             * @type HTMLElement
             */
            self.glass = null;
            
            /**
             * 放大镜图标
             * @type HTMLElement
             */
            self.zoomIcon = null;
            
            /**
             * 小图加载状态
             */
            self.imageReady = false;
            
            /**
             * 大图加载状态
             */
            self.bigImageReady = false;
            
            /**
             * 信息提示定时
             */
            self.timer = null;
            
            // 当小图加载完毕之后, 初始化
            self.image.onload = function(){
                if (!self.imageReady) {
                    self.imageReady = !self.imageReady;
                    self._init();
                }
            }
            if (!self.imageReady && self.image.complete && self.getSize(self.image).height) { 
                self.imageReady = !self.imageReady;
                self._init();
            }
        }
        
        S.augment(ImageZoom, {
            /**
             * 初始化方法
             * @protected
             */
            _init: function() {
                var self = this,
                    i = self.image;
                
                self._initContainer();
                
                /**
                 * 构建所需DOM
                 */
                var cfg = self.config,
                    g = self.glass,
                    z = self.zoomIcon;
                
                // 设置大图路径, 如果没有设定大图图片则用原图路径
                if (!cfg.bigImageSrc) cfg.bigImageSrc = DOM.attr(i, 'src');
                else if (cfg.preload) {
                    // 预加载大图
                    new Image().src = cfg.bigImageSrc;
                }
                
                /**
                 * 鼠标进入小图时, 显示大图
                 */
                EVENT.on(self.origin, 'mouseenter', function(ev) {
                    // 显示镜片
                    if (g) DOM.removeClass(g, HIDDEN);
                    // 隐藏放大镜图标
                    if (z) DOM.addClass(z, HIDDEN);
                    
                    // 创建/显示大图
                    if (!self.viewer) {
                        self._createZoom(ev);
                    } else DOM.removeClass(self.viewer, HIDDEN);
                    // 设置大图加载超时定时器
                    self.timer = setTimeout(function(){
                        if (!self.bigImageReady) self.showMsg();
                    }, self.config.timeout);
                });
                
                /**
                 * 鼠标离开小图时, 隐藏大图
                 */
                EVENT.on(self.origin, 'mouseleave', function(ev) {
                    // 隐藏镜片
                    if (g) DOM.addClass(g, HIDDEN);
                    // 显示放大镜
                    if (z) DOM.removeClass(z, HIDDEN);
                    
                    // 隐藏大图
                    if (self.viewer) DOM.addClass(self.viewer, HIDDEN);
                    if (self.timer) clearTimeout(self.timer);
                });
            },
            
            /**
             * 根据config创建所需DOM
             */
            _initContainer: function() {
                var self = this,
                    cfg = self.config,
                    c, o,
                    i = self.image,
                    g, z;
                
                // 构建整个容器
                c = DOM.create(DIV);
                DOM.addClass(c, IMGZOOM_CONTAINER_CLS);
                DOM.parent(i).insertBefore(c, i);
                self.container = c;
                
                // 构建小图外层
                o = DOM.create(DIV);
                DOM.addClass(o, IMGZOOM_MAGNIFIER_CLS);
                o.appendChild(i);
                c.appendChild(o);
                self.origin = o;
                
                // 镜片模式下
                if (TYPE[1] == cfg.zType) {
                    g = DOM.create(DIV);
                    DOM.addClass(g, IMGZOOM_GLASS_CLS);
                    DOM.addClass(g, HIDDEN);
                    DOM.css(g, HEIGHT, cfg.glassSize.height+'px');
                    DOM.css(g, WIDTH, cfg.glassSize.width+'px');
                    o.appendChild(g);
                    self.glass = g;
                }
                // 需要显示放大图标
                if (cfg.useZoomIcon) {
                    z = DOM.create(DIV);
                    DOM.addClass(z, IMGZOOM_ICON_CLS);
                    o.appendChild(z);
                    self.zoomIcon = z;
                }
                
                // 调整容器大小及位置
                DOM.css(self.container, HEIGHT, parseInt(DOM.css(o, 'marginTop')) + parseInt(DOM.css(o, 'marginBottom')) + self.getSize(o).height + 'px');
            },
            
            /**
             * 创建大图的显示DOM
             */
            _createZoom: function(ev) {
                var self = this,
                    cfg = self.config,
                    v;
                
                // 创建显示区域的DOM结构
                v = DOM.create(DIV);
                DOM.addClass(v, IMGZOOM_VIEWER_CLS);
                DOM.addClass(v, IMGZOOM_VIEWER_BK_CLS);
                var bimg = DOM.create(IMG);
                DOM.attr(bimg, 'src', cfg.bigImageSrc);
                v.appendChild(bimg);
                // 添加显示区域到原有DOM中, 跟随模式有点区别
                if (TYPE[2] == cfg.zType) {
                    self.origin.appendChild(v);
                } else {
                    self.container.appendChild(v);
                }
                self.bigImage = bimg;
                self.viewer = v;
                
                self._updateViewer(ev, false);
                self._zoom();
                // 大图加载完毕后更新显示区域
                self.bigImage.onload = function() {
                    if (!self.bigImageReady) {
                        self.bigImageReady = !self.bigImageReady;
                        self._updateViewer(ev, true);
                    }
                }
                if (!self.bigImageReady && self.bigImage.complete && self.getSize(self.bigImage).height) {
                    self.bigImageReady = !self.bigImageReady;
                    self._updateViewer(ev, true);
                }
            },
            
            /**
             * 设置放大图片显示的偏移量
             */
            _zoom: function() {
                var self = this,
                    cfg = self.config,
                    g = self.glass,
                    v = self.viewer;
                /**
                 * 移动鼠标时更新大图偏移量
                 */
                EVENT.on(self.origin, 'mousemove', function(ev) {
                    // 镜片偏移量并更新
                    var glassOffset = self.getGlassOffset(ev);
                    if (g) {
                        DOM.css(g, LEFT, glassOffset.left + 'px');
                        DOM.css(g, TOP, glassOffset.top + 'px');
                    }
                    // 计算大图偏移量并更新
                    var imageSize = self.getSize(self.image),
                        zoom = self.getSize(self.bigImage),
                        i = 0,
                        j = 0,
                        scrollx = Math.round(glassOffset.left*zoom.width/imageSize.width),
                        scrolly = Math.round(glassOffset.top*zoom.height/imageSize.height);
                    if (TYPE[2] == cfg.zType) {
                        var glassSize = self.getSize(g);
                        i = glassSize.width/2;
                        j = glassSize.height/2
                    }
                    v.scrollLeft = scrollx + i;
                    v.scrollTop = scrolly + j;
                    
                    // 跟随模式下更新显示区域位置
                    if (TYPE[2] == cfg.zType) {
                        DOM.css(v, LEFT, glassOffset.left + 'px');
                        DOM.css(v, TOP, glassOffset.top + 'px');
                    }
                });
            },
            
            /**
             * 更新显示区域大小及位置
             */
            _updateViewer: function(ev, ready) {
                var self = this;
                if (ready) {
                    if (self.timer) clearTimeout(self.timer);
                    self.hideMsg();
                }
                var i = self.image,
                    v = self.viewer,
                    cfg = self.config,
                    imageOffset = DOM.offset(i),
                    glassSize = self.getSize(self.glass);
                
                
                // 计算显示区域位置
                var leftPos, topPos, vHeight, vWidth;
                if (TYPE[2] == cfg.zType) {
                    // 跟随模式下, 设置显示区域初始位置
                    var mousePoint = self.getMousePoint(ev),
                        cursorX = mousePoint.x - imageOffset.left,
                        cursorY = mousePoint.y - imageOffset.top;
                    topPos = cursorX - glassSize.width/2;
                    leftPos = cursorY - glassSize.height/2;
                    // 跟随模式下, 显示区域宽高度由用户设定的glass宽高度决定
                    vHeight = glassSize.height;
                    vWidth =  glassSize.width;
                } else {
                    // 区域显示在不同位置上计算left和top值
                    var bigImageSize,
                        imageSize = self.getSize(i),
                        o = self.origin,
                        btw = parseInt(DOM.css(v, 'borderTopWidth')),
                        blw = parseInt(DOM.css(v, 'borderLeftWidth')),
                        containerOffset = DOM.offset(self.container);
                    if (!ready) {
                        bigImageSize = cfg.bigImageSize;
                    } else {
                        bigImageSize = self.getSize(self.bigImage);
                    }
                    if (POSITION[0] == cfg.position) {
                        topPos = - (imageSize.height + btw + cfg.offset - parseInt(DOM.css(o, 'marginTop'))*2);
                        leftPos = imageOffset.left - containerOffset.left;
                    } else if (POSITION[2] == cfg.position) {
                        topPos = imageSize.height + imageOffset.top + cfg.offset - containerOffset.top;
                        leftPos = imageOffset.left - containerOffset.left;
                    } else if (POSITION[3] == cfg.position) {
                        topPos = imageOffset.top - containerOffset.top;
                        leftPos = - (imageSize.width + blw + cfg.offset - parseInt(DOM.css(o, 'marginLeft'))*2);
                    } else {
                        topPos = imageOffset.top - containerOffset.top;
                        leftPos = imageOffset.left + imageSize.width + cfg.offset - containerOffset.left;
                    }
                    // 其他模式下, 显示区域宽高度由大小图的比例来定
                    vHeight = Math.round(bigImageSize.height*glassSize.height/imageSize.height);
                    vWidth = Math.round(bigImageSize.width*glassSize.width/imageSize.width);
                }
                DOM.css(v, HEIGHT, vHeight + 'px');
                DOM.css(v, WIDTH, vWidth + 'px');
                DOM.css(v, TOP, topPos + 'px');
                DOM.css(v, LEFT, leftPos + 'px');
            },
            
            /**
             * 获取镜片的偏移量
             * @param ev    触发的事件
             * @return  offset 镜片在放大目标元素上的横纵向位置
             */
            getGlassOffset: function(ev) {
                var self = this,
                    i = self.image,
                    offset = {
                        left: 0,
                        top: 0
                    };
                // 小图偏移量
                var imageOffset = DOM.offset(i);
                // 鼠标在页面上的位置
                var mousePoint = self.getMousePoint(ev);
                // 镜片实际尺寸
                var glassSize = self.getSize(self.glass);
                // 小图实际尺寸
                var imageSize = self.getSize(i);
                // 光标横向位置
                var cursorX = mousePoint.x - imageOffset.left;
                // 镜片横向偏移量
                offset.left = cursorX - glassSize.width/2;
                var i = 0,
                    j = 0;
                // 跟随模式下, 偏移限制不同
                if (TYPE[2] == self.config.zType) {
                    i = glassSize.width/2;
                    j = glassSize.height/2;
                }
                if (offset.left < -i) {
                    offset.left = 0;
                } else if (offset.left > imageSize.width - glassSize.width + i) {
                    offset.left = imageSize.width - glassSize.width;
                }
                // 光标纵向位置
                var cursorY = mousePoint.y - imageOffset.top;
                // 镜片纵向偏移量
                offset.top = cursorY - glassSize.height/2;
                if (offset.top < -j) {
                    offset.top = 0;
                } else if (offset.top > imageSize.height - glassSize.height + j) {
                    offset.top = imageSize.height - glassSize.height;
                }
                return offset;
            },
            
            /**
             * 获取元素的宽高度(不包括边线和滚动条)
             * @param   HTMLElement
             * @return  元素可见尺寸
             */
            getSize: function(elm) {
                if (!elm) return this.config.glassSize;
                return {
                    width: elm.clientWidth,
                    height: elm.clientWidth
                };
            },
            
            /**
             * 获取鼠标在页面上的位置
             * @param ev        触发事件
             * @return offset   鼠标在页面上的横纵向位置
             */
            getMousePoint: function(ev) {
                return {x: ev.pageX, y: ev.pageY}
            },
           
            /**
             * 大图片不可用时显示提示信息
             */
            showMsg: function(){
                var b = S.get('b', this.viewer);
                if (!b) {
                    b = DOM.create(B);
                    this.viewer.appendChild(b);
                    DOM.removeClass(this.viewer, IMGZOOM_VIEWER_BK_CLS);
                }
                DOM.html(b, '图片暂不可用');
            },
            hideMsg: function(){
                var b = S.get('b', this.viewer);
                DOM.html(b, '');
                DOM.addClass(this.viewer, IMGZOOM_VIEWER_BK_CLS);
            }
        }, S.EventTarget);
        
        S.ImageZoom = ImageZoom;
    
});

/**
 * NOTES:
 *  2010.6
 *      - 加入position选项, 动态构建所需dom;
 *      - 小图加载;
 *      - 大图加载之后才能显示;
 *      - 加入跟随模式
 *      - 加入Timeout
 *      - 6. 24  去除yahoo-dom-event依赖
 *  2010.7
 *      - 去除getStyle, 使用DOM.css()
 *  TODO:
 *      - 加入反转模式;
 *      - 
 */
