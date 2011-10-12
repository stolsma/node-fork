# node-fork

*Look-alike nodejs 6.x child_process.fork() function module for nodejs 4.x*

# Differences between fork() for node 6.x and node-fork

Instead of using the stdin channel for communicating with the child process (nodejs 6.x), node-fork is using a totally separated new pipe channel.
The child needs to call fork.forkChild() to connect the message channel to the parent process instead of automatically connecting as nodejs 6.x does.
Its is not possible to send a handle with the send() function as can be done with nodejs 6.x. (pull request implementing this is much appreciated!!) 

# Using node-fork

The code almost speaks for itself: see the example directory!!

Parent code example:

``` javascript
var path = require('path'),
	inspect = require('util').inspect,
	fork = require('fork');

var child;

try {
	child = fork.fork(path.join(__dirname, 'child.js'));
} catch (err) {
	console.log('Error forking child: ', inspect(err));
	process.exit(1);
}

child.on('message', function(msg) {
	if (msg.stop) process.exit(0);
	console.log('The child says: ', msg.hello);
});

child.send('This is your parent!');
```

Child code example (child.js):

``` javascript
var fork = require('fork'),
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
```


Documentation License
=====================

Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License

http://creativecommons.org/licenses/by-nc-sa/3.0/

Copyright (c)2011 [TTC](http://www.tolsma.net)/[Sander Tolsma](http://sander.tolsma.net/)


Code License
============

[MIT License](http://www.opensource.org/licenses/mit-license.php)

Copyright (c)2011 [TTC](http://www.tolsma.net)/[Sander Tolsma](http://sander.tolsma.net/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.