
Ext.define('CArABU.technicalservices.SnapshotNameDialog',{
    extend: 'Rally.ui.dialog.Dialog',

    width: 300,
    layout: 'fit',
    closable: true,
    draggable: true,

    constructor: function(config) {
        this.mergeConfig(config);

        this.callParent([this.config]);
    },

    beforeRender: function() {
        this.callParent(arguments);

        this.selectedProject = null;

        this.addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '0 0 10 0',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    cls: 'primary rly-small',
                    disabled: true,
                    handler: function() {
                        this.fireEvent('takesnapshot', this.getName());
                        this.close();
                    },
                    itemId: 'doneButton',
                    scope: this,
                    iconCls: 'icon-snapshot'
                },
                {
                    xtype: 'rallybutton',
                    iconCls: 'icon-cancel',
                    cls: 'secondary rly-small',
                    handler: this.close,
                    scope: this
                }
            ]
        });

         var pt = this.add({
            xtype: 'rallytextfield',
            itemId: 'txtName',
            maxLength: 200
        });
        pt.on('change', function(txt, newValue){
            this.down('#doneButton').setDisabled(!newValue || newValue.length === 0);
        }, this);

    },
    getName: function(){
        return this.down('#txtName').getValue();
    }


});

Ext.define('CArABU.technicalservices.SnapshotBulkRecordMenuItem', {
    alias: 'widget.snapshotbulkmenuitem',
    extend: 'Rally.ui.menu.bulk.MenuItem',

    config: {
        onBeforeAction: function(){
//            console.log('onbeforeaction');
        },

        /**
         * @cfg {Function} onActionComplete a function called when the specified menu item action has completed
         * @param Rally.data.wsapi.Model[] onActionComplete.successfulRecords any successfully modified records
         * @param Rally.data.wsapi.Model[] onActionComplete.unsuccessfulRecords any records which failed to be updated
         */
        onActionComplete: function(){
            console.log('onActionComplete');
        },

        text: 'Take Snapshot...',

        handler: function () {
            this._getSnapshotName();
        },
        predicate: function (records) {
            var type = null;
            //The goal here is to only allow selection of portfolio items and to
            //not allow mixed selections (e.g. not allow initiatives and features both in one snapshot)
            if (records && records.length > 0){
                type = records[0].get('_type').toLowerCase();
            }
            return _.every(records, function (record) {
                var recordType = record.get('_type').toLowerCase(),
                    isPortfolioItem = /portfolioitem/.test(recordType);

                if (!type){
                    return isPortfolioItem;
                }
                return type === recordType;
            });
        },
        _getSnapshotName: function(){
            Ext.create('CArABU.technicalservices.SnapshotNameDialog', {
                autoShow: true,
                draggable: true,
                width: 300,
                title: 'Enter Snapshot Name',
                listeners: {
                    takesnapshot: this._saveSnapshot,
                    scope: this
                }
            });
        },
        _saveSnapshot: function(name) {
            console.log('_saveSnapshot', name, this.records);

            if (!this.records || this.records.length === 0){
                return;
            }

            var snapshotSettings = {};
            Ext.Array.each(this.records, function (r) {
                snapshotSettings[r.get('ObjectID')] = r.get('_rollupData')._rollupDataTotalCost;
            });

            var type = this.records[0].get('_type');

            Rally.data.ModelFactory.getModel({
                type: 'Preference',
                success: function (model) {
                    var pref = Ext.create(model, {
                        Name: CArABU.technicalservices.PortfolioCostApps.toolbox.getSnapshotPreferenceName(name),
                        Value: CArABU.technicalservices.PortfolioCostApps.toolbox.getEncodedSnapshotValueString(snapshotSettings, type)
                    });

                    pref.save({
                        callback: function (records, operation, success) {
                            if (success) {
                                console.log('prefs', records);
                                Ext.callback(this.onActionComplete, null, [this.records, []]);
                                var msg = Ext.String.format("Snapshot '{0}' saved successfully.", name);
                                Rally.ui.notify.Notifier.show({message: msg});
                            } else {
                                Rally.ui.notify.Notifier.showError({message: "Failed to save snapshots for " + name});
                                Ext.callback(this.onActionComplete, null, [[], this.records]);
                            }
                        },
                        scope: this
                    });
                },
                scope: this
            });

        }
    }
});