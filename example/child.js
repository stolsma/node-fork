/**
 * The child side example of the use of fork. 
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * @author TTC/Sander Tolsma
 * @docauthor TTC/Sander Tolsma
 */

var fork = require('../lib/fork'),
	inspect = require('util').inspect;

try {
	fork.forkChild();
} catch (err) {
	console.log('Error initializing parent comms:', inspect(err));
	process.exit(1);
}

process.on('message', function(msg) {
	console.log('The parent says: ', msg);
	process.nextTick(function() {
		process.exit(0);
	});
});

process.send({ hello: 'I am alive!'});