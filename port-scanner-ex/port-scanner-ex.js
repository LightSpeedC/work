'use strict';
var scanPorts = require('port-scanner');
scanPorts('127.0.0.1', false, 1, 9000, {
	logStepCount : 0,
	namedPorts : {
		80 : 'noradle main website',
		443 : 'noradle main website (https)',

		81 : 'noradle test main website',
		444 : 'noradle test main website (https)',

		8010 : 'psp oracle (test)',
		8011 : 'file http (test)',
		8012 : 'sms oracle(test)',
		8013 : 'sms proxy(p2p) (test)',
		8014 : 'sms proxy(simple) (test)',
		8015 : 'sms proxy(bulk) (test)',
		8016 : 'IM http (test)',
		8017 : 'evac http test',
		8018 : 'exthub oracle (test)',
		8019 : 'IM oracle (test)',
		8021 : 'psp http (test)',
		9008 : 'telen http test',

		8000 : 'psp oracle (prod)',
		8001 : 'file http (prod)',
		8002 : 'sms oracle(prod)',
		8003 : 'sms proxy(p2p) (prod)',
		8004 : 'sms proxy(simple) (prod)',
		8005 : 'sms proxy(bulk) (prod)',
		8006 : 'IM http (prod)',
		8007 : 'evac http prod',
		8008 : 'exthub oracle (prod)',
		8009 : 'IM oracle (prod)',
		8020 : 'psp http (prod)',
		9003 : 'telen http prod'
	}});

