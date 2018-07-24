'use strict';

angular.module('copayApp.controllers').controller('versionAndWalletTypeController', function() {
    
    // wallet type
    var conf = require('core/conf.js');
    //this.type = (conf.bLight ? 'light wallet' : 'full wallet');
    this.type = (conf.bLight ? 'light' : '');

    // version
    this.version = window.version;
    this.commitHash = window.commitHash;
});
