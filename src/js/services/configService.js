'use strict';

angular.module('copayApp.services').factory('configService', function(storageService, lodash, $log, isCordova) {
  var root = {};

	root.colorOpts = [
	  '#00C8DC',
	  '#00C8DC',
	  '#00C8DC',
	  '#00C8DC',
	  '#00C8DC',
	  '#00C8DC',
	  '#00C8DC',
	  '#00C8DC',
	  '#00C8DC',
	  '#00C8DC',
	  '#00C8DC',
	  '#00C8DC',
	];

  var constants = require('core/constants.js');
  var isTestnet = constants.version.match(/t$/);
  root.TIMESTAMPER_ADDRESS = isTestnet ? 'OPNUXBRSSQQGHKQNEPD2GLWQYEUY5XLD' : '5ZUV6MOG43QK33BDYOHD6Q3A2S5RP562';

  root.oracles = {
		"5ZUV6MOG43QK33BDYOHD6Q3A2S5RP562" : {
			name: "Timestamp oracle",
			feedname_placeholder: "timestamp",
			feedvalue_placeholder: "e.g. 1541341626704",
			feednames_filter: ["^timestamp$"],
			feedvalues_filter: ["^\\d{13,}$"]
		}
	};

	root.privateTextcoinExt = 'coin';
	
  var defaultConfig = {
	// wallet limits
	limits: {
		totalCosigners: 6
	},

	hub: (constants.alt === '2' && isTestnet) ? 'testnethub.kizunacoin.jp' : 'hub.kizunacoin.jp',
	attestorAddresses: {
		email: 'TPJGUPB75MRD7VDWGNRAHCE4EO3JMQ63'
	},

	// requires bluetooth permission on android
	//deviceName: /*isCordova ? cordova.plugins.deviceName.name : */require('os').hostname(),

	getDeviceName: function(){
		return isCordova ? cordova.plugins.deviceName.name : require('os').hostname();
	},

	// wallet default config
	wallet: {
	  requiredCosigners: 2,
	  totalCosigners: 3,
	  spendUnconfirmed: false,
	  reconnectDelay: 5000,
	  idleDurationMin: 4,
	  singleAddress: false,
	  settings: {
		unitName: 'KIZ',
		unitValue: 1000000,
		unitDecimals: 6,
		unitCode: 'one',
		bbUnitName: 'blackbytes',
		bbUnitValue: 1,
		bbUnitDecimals: 0,
		bbUnitCode: 'one',
		alternativeName: 'US Dollar',
		alternativeIsoCode: 'USD',
		},
	},

	// hidden assets: key = wallet id, value = set of assets (string: boolean)
	hiddenAssets: {},

	rates: {
	  url: 'https://insight.bitpay.com:443/api/rates',
	},

	pushNotifications: {
	  enabled: true,
	  config: {
		android: {
		  icon: 'push',
		  iconColor: '#2F4053'
		},
		ios: {
		  alert: 'true',
		  badge: 'true',
		  sound: 'true',
		},
		windows: {},
	  }
	},

  autoUpdateWitnessesList: true
  };

  var configCache = null;


  root.getSync = function() {
	if (!configCache)
		throw new Error('configService#getSync called when cache is not initialized');
	return configCache;
  };

  root.get = function(cb) {

	storageService.getConfig(function(err, localConfig) {
	  configCache = migrateLocalConfig(localConfig);
	  $log.debug('Preferences read:', configCache);
	  return cb(err, configCache);
	});
  };

  root.set = function(newOpts, cb) {
	var config = defaultConfig;
	storageService.getConfig(function(err, oldOpts) {
	  if (lodash.isString(oldOpts)) {
		oldOpts = JSON.parse(oldOpts);
	  }
	  if (lodash.isString(config)) {
		config = JSON.parse(config);
	  }
	  if (lodash.isString(newOpts)) {
		newOpts = JSON.parse(newOpts);
	  }
	  lodash.merge(config, oldOpts, newOpts);
		checkAndReplaceOldUnitCode(config.wallet.settings);
	  configCache = config;

	  storageService.storeConfig(JSON.stringify(config), cb);
	});
  };

  root.reset = function(cb) {
	configCache = lodash.clone(defaultConfig);
	storageService.removeConfig(cb);
  };

  root.getDefaults = function() {
	return lodash.clone(defaultConfig);
  };
  
  if(window.config){
	configCache = migrateLocalConfig(window.config);
  }else{
	root.get(function() {});
  }
  
  function migrateLocalConfig(localConfig) {
	if (localConfig) {
		var _config = JSON.parse(localConfig);

		//these ifs are to avoid migration problems
		if (!_config.wallet) {
			_config.wallet = defaultConfig.wallet;
		}
		if (!_config.wallet.settings.unitCode) {
			_config.wallet.settings.unitCode = defaultConfig.wallet.settings.unitCode;
		}
		if (!_config.wallet.settings.unitValue){
			if(_config.wallet.settings.unitToBytes){
				_config.wallet.settings.unitValue = _config.wallet.settings.unitToBytes;
			}else{
				_config.wallet.settings.unitValue = defaultConfig.wallet.settings.unitValue;
			}
		}
		if (!_config.wallet.settings.bbUnitName) {
			_config.wallet.settings.bbUnitName = defaultConfig.wallet.settings.bbUnitName;
		}
		if (!_config.wallet.settings.bbUnitValue) {
			_config.wallet.settings.bbUnitValue = defaultConfig.wallet.settings.bbUnitValue;
		}
		if (!_config.wallet.settings.bbUnitDecimals) {
			_config.wallet.settings.bbUnitDecimals = defaultConfig.wallet.settings.bbUnitDecimals;
		}
		if (!_config.wallet.settings.bbUnitCode) {
			_config.wallet.settings.bbUnitCode = defaultConfig.wallet.settings.bbUnitCode;
		}
		if (!_config.pushNotifications) {
			_config.pushNotifications = defaultConfig.pushNotifications;
		}
		if (!_config.hub)
			_config.hub = defaultConfig.hub;
		if (!_config.attestorAddresses) {
			_config.attestorAddresses = defaultConfig.attestorAddresses;
		}
		for (var attestorKey in defaultConfig.attestorAddresses){
			if (!(attestorKey in _config.attestorAddresses))
				_config.attestorAddresses[attestorKey] = defaultConfig.attestorAddresses[attestorKey];
		}
		if (!_config.hiddenAssets) {
			_config.hiddenAssets = defaultConfig.hiddenAssets;
		}
		if (!_config.deviceName)
			_config.deviceName = defaultConfig.getDeviceName();

		checkAndReplaceOldUnitCode(_config.wallet.settings);
	} else {
		_config = lodash.clone(defaultConfig);
		_config.deviceName = defaultConfig.getDeviceName();
	}
	return _config;
  }
  
  function checkAndReplaceOldUnitCode(setting) {
	  switch (setting.unitCode){
		  case 'byte':
				setting.unitCode = 'one';
				setting.unitValue = 1000000;
		  	break;
		  case 'kB':
				setting.unitCode = 'kilo';
				setting.unitValue = 1000;
		  	break;
		  case 'MB':
				setting.unitCode = 'mega';
				setting.unitValue = 1000000;
		  	break;
		  case 'GB':
				setting.unitCode = 'giga';
				setting.unitValue = 1000000000;
		  	break;
	  }
  }


  return root;
});
