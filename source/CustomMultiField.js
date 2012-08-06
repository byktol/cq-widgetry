/**
 * @class CQ.form.CustomMultiField
 * @extends CQ.form.CompositeField
 * The CustomMultiField is an editable list of form fields for editing several
 * properties at any given time. The values are stored as arrays in the repostiory.
 * @constructor
 * Creates a new CustomMultiField.
 * @param {Object} config The config object
 */
CQ.form.CustomMultiField = CQ.Ext.extend(CQ.form.CompositeField, {

    /**
     * @cfg {Boolean} orderable
     * If the list of fields should be orderable and Up/Down buttons
     * are rendered (defaults to true).
     */
    
    /**
     * @cfg {CQ.Ext.form.Field/CQ.form.CompositeField} fieldConfig
     * The configuration options for the fields. Defaults to
     * <pre><code>
{
     "xtype": "textfield"
}      </code></pre>
     */
    fieldConfig: null,

    /**
     * @cfg {String} typeHint
     * The type of the single fields, such as "String" or "Boolean". If set to "String",
     * for example, the @TypeHint will automatically be set to "String[]" to ensure that
     * a multi-value property is created. Not set by default.
     * @since 5.4
     */
    
    // private
    path: "",

    // private
    bodyPadding: 4,

    // the width of the field
    // private
    fieldWidth: 0,

    // private
    fieldNames: new Array(),
    
    // The max number of items that can be added through the plus (+) button
    // private
    maxItems: 12,

    constructor: function(config) {
        var list = this;

        if (typeof config.orderable === "undefined") {
            config.orderable = true;
        }
        
        if (!config.fieldConfig) {
            config.fieldConfig = {};
        }
        if (!config.fieldConfig.xtype) {
            config.fieldConfig.xtype = "textfield";
        }
        if (config.maxEntries) {
          this.maxEntries = config.maxEntries;
      }

        config.fieldConfig.rootPath = config.rootPath;
        config.fieldConfig.rootTitle = config.rootTitle;
        config.fieldConfig.name = config.name;
//        config.fieldConfig.style = "width:95%;";
        config.fieldConfig.orderable = config.orderable;
        
        this.setFieldNames(config.fieldConfig.items);

        var items = new Array();

        if(config.readOnly) {
            //if component is defined as readOnly, apply this to all items
            config.fieldConfig.readOnly = true;
        } else {
            items.push({
                "xtype":"button",
                "cls": "cq-custommultifield-btn",
                "text":"+",
                "handler":function() {
                    list.addItem();
                }
            });
        }

        this.hiddenDeleteFields = new Array();
        for (var i = 0; i < this.fieldNames.length; i++) {
            this.hiddenDeleteFields[i] = new CQ.Ext.form.Hidden({
                "name": this.fieldNames[i] + CQ.Sling.DELETE_SUFFIX
            }); 
        };
        items.push(this.hiddenDeleteFields);

        if (config.typeHint) {
            this.typeHintField = new CQ.Ext.form.Hidden({
                name: config.name + CQ.Sling.TYPEHINT_SUFFIX,
                value: config.typeHint + "[]"
            });
            items.push(this.typeHintField);
        }
        
        config = CQ.Util.applyDefaults(config, {
            "defaults":{
                "xtype":"custommultifielditem",
                "fieldConfig":config.fieldConfig
            },
            "items":[
                {
                    "xtype":"panel",
                    "border":false,
                    "bodyStyle":"padding:" + this.bodyPadding + "px",
                    "items":items
                }
            ]
        });
        CQ.form.CustomMultiField.superclass.constructor.call(this,config);
        if (this.defaults.fieldConfig.regex) {
            // somehow regex get broken in this.defaults, so fix it
            this.defaults.fieldConfig.regex = config.fieldConfig.regex;
        }
        this.addEvents(
            /**
             * @event change
             * Fires when the value is changed.
             * @param {CQ.form.CustomMultiField} this
             * @param {Mixed} newValue The new value
             * @param {Mixed} oldValue The original value
             */
            "change"
        );
    },

    initComponent: function() {
        CQ.form.CustomMultiField.superclass.initComponent.call(this);

        this.on("resize", function() {
            // resize fields
            var item = this.items.get(0);
            this.calculateFieldWidth(item);
            if (this.fieldWidth > 0) {
                for (var i = 0; i < this.items.length; i++) {
                    try {
                        this.items.get(i).field.setWidth(this.fieldWidth);
                    }
                    catch (e) {
                        CQ.Log.debug("CQ.form.CustomMultiField#initComponent: " + e.message);
                    }
                }
            }
        });

        this.on("disable", function() {
            for (var i = 0; i < this.hiddenDeleteFields.length; i++)
            {
                this.hiddenDeleteFields[i].disable();
            }
            if (this.typeHintField) this.typeHintField.disable();
            this.items.each(function(item/*, index, length*/) {
                if (item instanceof CQ.form.CustomMultiField.Item) {
                    for (var i = 0; i < item.fields.length; i++) {
                        item.fields[i].disable();
                    }
                }
            }, this);
        });

        this.on("enable", function() {
            for (var i = 0; i < this.hiddenDeleteFields.length; i++)
            {
                this.hiddenDeleteFields[i].enable();
            }
            if (this.typeHintField) this.typeHintField.enable();
            this.items.each(function(item/*, index, length*/) {
                if (item instanceof CQ.form.CustomMultiField.Item) {
                    for (var i = 0; i < item.fields.length; i++) {
                        item.fields[i].enable();
                    }
                }
            }, this);
        });
    },

    // private
    calculateFieldWidth: function(item) {
        try {
            this.fieldWidth = this.getSize().width - 30*this.bodyPadding; // total row width
            for (var i = 1; i < item.items.length; i++) {
                // subtract each button
                var w = item.items.get(i).getSize().width;
                if (w == 0) {
                    // button has no size, e.g. because MV is hidden >> reset fieldWidth to avoid setWidth
                    this.fieldWidth = 0;
                    return;
                }

                this.fieldWidth -= item.items.get(i).getSize().width;
            }
        }
        catch (e) {
            // initial resize fails if the MF is on the visible first tab
            // >> reset to 0 to avoid setWidth
            this.fieldWidth = 0;
        }
    },

    /** 
     * Adds a new field with the specified value to the list.
     * @param {Object} value The value of the field pair. It has two properties: storypath and thumbnail.
     */
    addItem: function(value) {
        // Only add a new inline item when the limit is not exceeded
        if (this.items.getCount() > this.maxItems) {
            return;
        }

        var item = this.insert(this.items.getCount() - 1, {});
        for (var i = 0; i < item.fields.length; i++) {          
            this.findParentByType("form").getForm().add(item.fields[i]);
        }
        this.doLayout();

        for (var i = 0; i < item.fields.length; i++) {
            if (item.fields[i].processPath) {
                item.fields[i].processPath(this.path);
            }
        }
        if (value) {
            item.setValue(value);
        }

        if (this.fieldWidth < 0) {
            // fieldWidth is < 0 when e.g. the CustomMultiField is on a hidden tab page;
            // do not set width but wait for resize event triggered when the tab page is shown
            return;
        }
        if (!this.fieldWidth) {
            this.calculateFieldWidth(item);
        }
        try { 
            for (var i = 0; i < item.fields.length; i++) {
                item.fields[i].setWidth(this.fieldWidth);
            }
        }
        catch (e) {
            CQ.Log.debug("CQ.form.CustomMultiField#addItem: " + e.message);
        }
    },

    setFieldNames: function(configItems) {
        for (var i = 0; i < configItems.length; i++) {
            this.fieldNames.push(configItems[i].name);
        }
    },
    
    getFieldNames: function() {
        return this.fieldNames;
    },

    // overriding CQ.form.CompositeField#processRecord
    processRecord: function(record, path) {
      if (this.fireEvent('beforeloadcontent', this, record, path) !== false) {
          var names = this.getFieldNames();
          var supaRecord = {};
          for (var i = 0; i < names.length; i++) {
              supaRecord[names[i]] = record.get(names[i]);
          }

          var size = 0;
          for (var key in supaRecord) {
              var v = supaRecord[key];
              if (v instanceof Array || CQ.Ext.isArray(v)) {
                  size = v.length;
              }
              if (v == undefined) {
                  size = -1;
              }
              break;
          }

          values = new Array();

          // when it's an array
          if (size >= 1) {
              for (var i = 0; i < size; i++) {
                  values[i] = {};
                  for (var key in supaRecord) {
                      values[i][key] = supaRecord[key][i];
                  }
              }
              this.setValue(values);
          }
          
          // when it's a single value
          if (size == 0) {
              values[0] = {};
              for (var key in supaRecord) {
                  values[0][key] = supaRecord[key];
              }
              this.setValue(values);
          }

          if (size == -1) {
            
          }
          this.fireEvent('loadcontent', this, record, path);
      }
    },

    processPath: function(path) {
        this.path = path;
    },

    // overriding CQ.form.CompositeField#getValue
    getValue: function() {
        var value = new Array();
        this.items.each(function(item, index/*, length*/) {
            if (item instanceof CQ.form.CustomMultiField.Item) {
                value[index] = item.getValue();
                index++;
            }
        }, this);
        return value;
    },

    // overriding CQ.form.CompositeField#setValue
    setValue: function(value) {
        this.fireEvent("change", this, value, this.getValue());
        var oldItems = this.items;
        oldItems.each(function(item/*, index, length*/) {
            if (item instanceof CQ.form.CustomMultiField.Item) {
                this.remove(item, true);
                this.findParentByType("form").getForm().remove(item);
            }
        }, this);
        this.doLayout();
        if ((value != null) && (value != "")) {
            if (value instanceof Array || CQ.Ext.isArray(value)) {
                for (var i = 0; i < value.length; i++) {
                    this.addItem(value[i]);
                }
            } else {
                this.addItem(value);
            }
        }
    }

});

CQ.Ext.reg("custommultifield", CQ.form.CustomMultiField);

/**
 * @private
 * @class CQ.form.CustomMultiField.Item
 * @extends CQ.Ext.Panel
 * The CustomMultiField.Item is an item in the {@link CQ.form.CustomMultiField}.
 * This class is not intended for direct use.
 * @constructor
 * Creates a new CustomMultiField.Item.
 * @param {Object} config The config object
 */
CQ.form.CustomMultiField.Item = CQ.Ext.extend(CQ.Ext.Panel, {

    constructor: function(config) {
        var item = this;

        var fieldConfig = CQ.Util.copyObject(config.fieldConfig);
        
        this.fields = new Array();
        for (var i = 0; i < fieldConfig.items.length; i++) {
            this.fields.push(CQ.Util.build(fieldConfig.items[i], true));
        }

        var items = new Array();

        if(!fieldConfig.readOnly) {
            if (fieldConfig.orderable) {
                items.push({
                    "xtype": "panel",
                    "border": false,
                    "items": {
                        "xtype": "button",
                        "text": CQ.I18n.getMessage("&uarr;", null, "Ordering upwards"),
                        "handler": function(){
                            var parent = item.ownerCt;
                            var index = parent.items.indexOf(item);
                            
                            if (index > 0) {
                                item.reorder(parent.items.itemAt(index - 1));
                            }
                        }
                    }
                });
                items.push({
                    "xtype": "panel",
                    "border": false,
                    "items": {
                        "xtype": "button",
                        "text": CQ.I18n.getMessage("&darr;", null, "Ordering downwards"),
                        "handler": function(){
                            var parent = item.ownerCt;
                            var index = parent.items.indexOf(item);
                            
                            if (index < parent.items.getCount() - 1) {
                                item.reorder(parent.items.itemAt(index + 1));
                            }
                        }
                    }
                });
            }
            items.push({
                "xtype":"panel",
                "border":false,
                "items":{
                    "xtype":"button",
                    "cls": "cq-custommultifield-btn",
                    "text":"-",
                    "handler":function() {
                        item.ownerCt.remove(item);
                    }
                }
            });
        }

        this.panel = {
          "xtype":"panel",
          "border":false,
          "cellCls":"cq-custommultifield-itemct",
          "items": new CQ.Ext.Panel({
              cls: "filter-edit",
              layout: "fit",
              border: true,
              bodyStyle: "padding:3px",
              items: {
                  layout: "form",
                  autoHeight: true,
                  border: false,
                  defaults: {
                      labelWidth: 34,
                      anchor: "100%"
                  },
                  items: item.fields
              }
          })
        }

        config = CQ.Util.applyDefaults(config, {
            "layout":"table",
            "anchor":"100%",
            "border":false,
            "layoutConfig":{
                "columns":4
            },
            "defaults":{
                "bodyStyle":"padding:1px"
            },
            "items": [item.panel, items]
        });
        CQ.form.CustomMultiField.Item.superclass.constructor.call(this, config);

    },

    /**
     * Reorders the item above the specified item.
     * @param item {CQ.form.CustomMultiField.Item} The item to reorder above
     * @member CQ.form.CustomMultiField.Item
     */
    reorder: function(item) {
        var value = item.getValue();
        item.setValue(this.getValue());
        
        this.setValue(value);
    },

    /**
     * Returns the data value.
     * @return {Object} value The fields' values as an object pair
     * @member CQ.form.CustomMultiField.Item
     */
    getValue: function() {
        var result = {};
        for (var i = 0; i < this.fields.length; i++) {
            result[this.fields[i].getName()] = this.fields[i].getValue();
        }
        return result;
    },

    /**
     * Sets a data value into the field and validates it.
     * @param {Object} value The value to set
     * @member CQ.form.CustomMultiField.Item
     */
    setValue: function(value) {
        for (var key in value) {
            for (var i = 0; i < this.fields.length; i++) {
                if (this.fields[i].getName() == key) {
                    this.fields[i].setValue(value[key]);
                }
            }
        }
    }
});

CQ.Ext.reg("custommultifielditem", CQ.form.CustomMultiField.Item);