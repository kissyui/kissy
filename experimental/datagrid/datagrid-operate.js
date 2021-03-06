/**
 * DataGrid Operate
 * @creator     沉鱼<fool2fish@gmail.com>
 * @depends     kissy-core, yui2-yahoo-dom-event, yui2-connection
 */

KISSY.add("datagrid-operate", function(S) {

    var DOM = S.DOM, Event = S.Event, YDOM = YAHOO.util.Dom,
        doc = document,

        DataGrid = S.DataGrid,
        create = DataGrid.create,

        //特殊列的类型
        COL_CHECKBOX = 'COL_CHECKBOX', COL_RADIO = 'COL_RADIO', COL_EXTRA = 'COL_EXTRA',

        //class前缀
        CLS_PREFIX = 'ks-datagrid-',
        //行class
        CLS_ROW = CLS_PREFIX + 'row', CLS_ROW_EXTRA = CLS_PREFIX + 'row-extra', CLS_ROW_SELECTED = CLS_PREFIX + 'row-selected', CLS_ROW_EXPANDED = CLS_PREFIX + 'row-expanded',

        //特殊单元格class
        CLS_CELL_EXTRA = CLS_PREFIX + 'cell-extra',
        //排序单元格class
        CLS_SORTABLE = CLS_PREFIX + 'cell-sortable', CLS_SORT_DESC = CLS_PREFIX + 'cell-desc', CLS_SORT_ASC = CLS_PREFIX + 'cell-asc',
        //特殊icon的class
        CLS_ICON_EXPAND = CLS_PREFIX + 'icon-expand', CLS_ICON_CHECKBOX = CLS_PREFIX + 'icon-checkbox', CLS_ICON_RADIO = CLS_PREFIX + 'icon-radio',

        //行索引，可排序th的排序字段
        ATTR_ROW_IDX = 'data-list-idx',ATTR_CELL_IDX = 'data-cell-idx', ATTR_SORT_FIELD = 'data-sort-field',

        //排序方式
        DESC = 'desc', ASC = 'asc';

    S.augment(S.DataGrid,{
        
        /**************************************************************************************************************
         * 滚动时，固定表头功能
         *************************************************************************************************************/
        _activateFixThead:function(){
            var scrollState = 0,
                self = this,
                container = self.container,
                table = self._tableEl,
                thead = self._theadEl,
                proxy = create('<table class="ks-datagrid-proxy ks-datagrid"></table>');
            
            S.ready(function() {
                doc.body.appendChild(proxy);
            });

            if(!self._defColWidth) self._setColWidth();

            Event.on(window,'scroll',function(){
                var theadHeight = thead.offsetHeight,
                    tWidth = container.offsetWidth,
                    tHeight = container.offsetHeight,
                    tLeft =  YDOM.getX(container),
                    tTop =  YDOM.getY(container),
                    scrollTop = YDOM.getDocumentScrollTop();
                if(scrollTop<tTop){
                    if(scrollState){
                        table.style.paddingTop = 0;
                        table.appendChild(thead);
                    }
                    scrollState = 0;                    
                }else if( scrollTop > tTop+tHeight-theadHeight){
                    if(scrollState != 3){
                        proxy.style.top = '-400px';
                    }
                    scrollState = 3;
                }else{
                    if(!scrollState){
                        table.style.paddingTop = theadHeight + 'px';
                        proxy.appendChild(thead);
                    }
                    if(scrollState!=2){
                        proxy.style.top='0px';
                        proxy.style.left = tLeft+'px';
                        proxy.style.width = tWidth+'px';
                    }
                    if(S.UA.ie===6){
                        proxy.style.top = scrollTop+'px';
                    }
                    scrollState = 2;
                }                                                                                    
            });

            Event.on(window,'resize',function(){
                proxy.style.width = container.offsetWidth+'px';                
            });
        },

        /**
         * 渲染出表格（如果没有数据，则为渲染出表头后）,获取每列的实际宽度并赋值
         */
        _setColWidth:function(){
            var self = this ,
                colArr = self._colgroupEl.getElementsByTagName('col'),
                thArr = self._theadEl.getElementsByTagName('th');
            for(var i=0,len=colArr.length;i<len;i++){
                if(!colArr[i].width) colArr[i].width = colArr[i].offsetWidth;
            }
            for(var j=0,len2=thArr.length;j<len2;j++){
                if((!thArr[j].width) && (thArr[j].className.indexOf(CLS_CELL_EXTRA)<0)) thArr[j].width = thArr[j].offsetWidth;
            }

        },

        /**************************************************************************************************************
         * 激活排序，选择列和扩展列功能
         *************************************************************************************************************/
        
        //激活排序功能
        _activateRowSort:function(){
            var self = this , sortTrigger = self._sortTrigger;
            Event.on(sortTrigger, 'click', function(e){
                if( !self._listData || self._listData.length == 0 ) return;
                var t = this;
                var sortBy = t.getAttribute( ATTR_SORT_FIELD );;
                var sortType;
                //获得排序类型 和 设置当前排序触点的样式
                if( DOM.hasClass( t , CLS_SORT_ASC ) ){
                    sortType = DESC;
                    DOM.removeClass( t, CLS_SORT_ASC);
                    DOM.addClass( t, CLS_SORT_DESC);
                //如果目前是降序排列或者目前列无排序
                }else{
                    sortType = ASC;
                    DOM.addClass( t, CLS_SORT_ASC);
                    DOM.removeClass( t, CLS_SORT_DESC);
                }
                //修改前一个排序触点的样式
                if( self._curSortTrigger && self._curSortTrigger != t ){
                    DOM.removeClass( self._curSortTrigger, CLS_SORT_DESC);
                    DOM.removeClass( self._curSortTrigger, CLS_SORT_ASC);
                }
                self._curSortTrigger = t;
                var queryData = DataGrid.setQueryParamValue( self._latestQueryData,self.datasourceDef.sortBy, sortBy);
                queryData = DataGrid.setQueryParamValue( queryData,self.datasourceDef.sortType, sortType);
                self.update(queryData);
            });
        },

        //激活列选择功能
        _activateRowSelect:function(){
            var self = this ,selectDef=self._colSelectDef, selectType = selectDef.xType, curSelectedIdx;
            function getRow(t){
                var tc = t.className,p=t.parentNode,pc=p.className;
                //如果t为单选/多选按钮icon
                if( p.nodeName.toLowerCase()=='td'&&(tc.indexOf(CLS_ICON_CHECKBOX)+1 || tc.indexOf(CLS_ICON_RADIO)+1)){
                    return p.parentNode;
                //或者为td
                }else if(pc.indexOf(CLS_ROW)+1 || pc.indexOf(CLS_ROW_EXTRA)+1){
                    return p;
                }else{
                    return null;
                }
            }

            Event.on(self._tableEl,'click',function(e){
                var t=e.target, row = getRow(t);
                if(!row) return;
                if(selectType == COL_CHECKBOX){
                    self.toggleSelectRow( row.getAttribute( ATTR_ROW_IDX ));
                }else if(selectType == COL_RADIO){
                    if( curSelectedIdx != undefined ) self.deselectRow(curSelectedIdx);
                    curSelectedIdx = row.getAttribute( ATTR_ROW_IDX );
                    self.selectRow( curSelectedIdx );
                }
            });

            /**
             * 全选/取消全选
             * 由于滚动时如果固定页头，则thead会暂时从table中取出来，故需要直接将事件注册在全选触点上
             */
            if(self._selectAllTrigger){
                Event.on(self._selectAllTrigger,'click',function(){
                    if(!self._tbodyEl) return;
                    var theadRow = self._theadEl.getElementsByTagName('tr')[0];
                    if(DOM.hasClass(theadRow,CLS_ROW_SELECTED)){
                        self.deselectAll();
                    }else{
                        self.selectAll();
                    }
                });
            }

        },

        //激活扩展列功能
        _activateRowExpand:function(){
            var self = this;
            Event.on(self._tableEl,'click',function(e){
                var t = e.target;
                if( DOM.hasClass( t , CLS_ICON_EXPAND ) ){
                    var row = YDOM.getAncestorByClassName( t , CLS_ROW );
                    var nextSibling = YDOM.getNextSibling( row );
                    //如果row无相邻元素，或者相邻元素不是扩展列
                    if( !nextSibling || !DOM.hasClass( nextSibling , CLS_ROW_EXTRA ) ){
                        var idx = row.getAttribute( ATTR_ROW_IDX );
                        var rowExtra = self._renderRowExtra( self._listData[idx] );
                            rowExtra.setAttribute( ATTR_ROW_IDX , idx );
                        if(DOM.hasClass( row , CLS_ROW_SELECTED )) YDOM.addClass( rowExtra, CLS_ROW_SELECTED );
                        YDOM.insertAfter( rowExtra , row );
                    }else{
                        var rowExtra = nextSibling;
                    }
                    DOM.toggleClass( row , CLS_ROW_EXPANDED );
                    DOM.toggleClass( rowExtra , CLS_ROW_EXPANDED );
                }
            });
        },

        /**************************************************************************************************************
         * @选择操作
         *************************************************************************************************************/

        /**
         * 切换指定行选中状态
         * @param idx 行索引
         */
        toggleSelectRow:function(){
            for(var i = 0 , len = arguments.length ; i < len ; i++){
                this._toggleSelectRow(arguments[i]);
            }
            this._checkIfSelectAll();
        },
        /**
         * 选中指定行
         * @param idx 行索引
         */
        selectRow:function(){
            for(var i = 0 , len = arguments.length ; i < len ; i++){
                this._toggleSelectRow(arguments[i],1);
            }
            this._checkIfSelectAll();
        },
        /**
         * 取消选中指定行
         * @param idx 行索引
         */
        deselectRow:function(){
            for(var i = 0 , len = arguments.length ; i < len ; i++){
                this._toggleSelectRow(arguments[i],0);
            }
            this._checkIfSelectAll();
        },
        /**
         * 全选
         */
        selectAll:function(){
            for(var i = 0 , len = this._rowElArr.length ; i < len ; i++){
                this._toggleSelectRow(i,1);
            }
            this._checkIfSelectAll();
        },
        /**
         * 全不选
         */
        deselectAll:function(){
            for(var i = 0 , len = this._rowElArr.length ; i < len ; i++){
                this._toggleSelectRow(i,0);
            }
            this._checkIfSelectAll();
        },
        /**
         * 反选
         */
        selectInverse:function(){
            for(var i = 0 , len = this._rowElArr.length ; i < len ; i++){
                this._toggleSelectRow(this._rowElArr[i]);
            }
            this._checkIfSelectAll();
        },

        /**
         * 获取被选中record的索引
         */
        getSelectedIndex:function(){
            return this._getSelected('index');
        },
        /**
         * 获取被选中的record
         */
        getSelectedRecord:function(){
            return this._getSelected();
        },

        /**
         * 将指定索引的行显示为指定的选中状态
         * @param idx 要切换选中状态的行在listData中的索引号
         * @param selectType 1为选中，0为取消选中，不填则为自动切换
         */
        _toggleSelectRow:function(idx,selectType){
            var row = this._rowElArr[idx];
            var nextSibling = YDOM.getNextSibling( row );
            if( nextSibling && DOM.hasClass( nextSibling , CLS_ROW_EXTRA )) var rowExtra = nextSibling;
            if(selectType == undefined){
                DOM.toggleClass( row , CLS_ROW_SELECTED );
                if(rowExtra) DOM.toggleClass( rowExtra , CLS_ROW_SELECTED );
            }else if(selectType){
                DOM.addClass( row , CLS_ROW_SELECTED );
                if(rowExtra) DOM.addClass( rowExtra , CLS_ROW_SELECTED );
            }else{
                DOM.removeClass( row , CLS_ROW_SELECTED );
                if(rowExtra) DOM.removeClass( rowExtra , CLS_ROW_SELECTED );
            }
        },

        //检查是否全选
        _checkIfSelectAll:function(){
            var ifSelectAll = true , rowElArr = this._rowElArr;
            for(var i = 0 , len = rowElArr.length ; i < len ; i++){
                if( !DOM.hasClass( rowElArr[i] , CLS_ROW_SELECTED)){
                    ifSelectAll = false;
                    break;
                }
            }
            var theadRow = this._theadEl.getElementsByTagName('tr')[0];
            if(ifSelectAll){
                DOM.addClass( theadRow , CLS_ROW_SELECTED );
            }else{
                DOM.removeClass( theadRow , CLS_ROW_SELECTED );
            }
        },

        /**
         * 获取选中的行或者record
         * @param returnBy 默认'record'，可选'index'
         */
        _getSelected:function(returnBy){
            var selected = [];
            for( var  i = 0 , len = this._rowElArr.length ; i < len ; i++ ){
                if( YDOM.hasClass( this._rowElArr[i] , CLS_ROW_SELECTED ) ){
                    if(returnBy == 'index'){
                        selected.push( i );
                    }else{
                        selected.push( this._listData[i] );
                    }
                }
            }
            if( selected.length ==  0 ){
                return null;
            }else{
                return selected;
            }
        }


        /**************************************************************************************************************
         * @增删改操作
         *************************************************************************************************************/

        /*addRecord:function(){

        },
        modifyRecord:function(){

        },
        deleteRecord:function(){

        }*/
    });

});