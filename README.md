# node-fork

*Look-alike nodejs 0.6.x child_process.fork() function module for nodejs 0.4.x and 0.6.x*

# Differences between fork() for nodejs 0.6.x and node-fork

  * Instead of using the stdin channel for communicating with the child process (nodejs 0.6.x), node-fork is using a totally separated new pipe channel when used in node 0.4.x.
  * If node-fork is used with node 0.6.x then the `customFds` option can be used to create custom stdout and stderr descriptors (thats not possible with fork in node 0.6.x)  
  * Its is not possible to send a handle with the send() function as can be done with nodejs 0.6.x. (pull request implementing this is much appreciated!!) 

# Installing node-fork

node-fork can be installed from NPM with:

    npm install node-fork

# Using node-fork

The code almost speaks for itself: see the example directories showing visisble and invisible examples!!

Following is a invisible example of node-fork use.

Parent code example:

``` javascript
var path = require('path'),
    inspect = require('util').inspect,
    fork = require('fork');

var child;

try {
  child = fork(path.join(__dirname, 'child.js'));
} catch (err) {
  console.log('Error forking child: ', inspect(err));
  process.exit(1);
}

child.on('message', function(msg) {
  console.log('The child says: ', msg.hello);
});

child.send('This is your parent!');
```

Child code example (child.js):

``` javascript
process.on('message', function(msg) {
  console.log('The parent says: ', msg);
  process.nextTick(function() {
    process.exit(0);
  });
});

process.send({ hello: 'I am alive!'});
```

# Building node-fork

To build node-fork and run the tests after checking it out from git:

    make test


#### Author: [Sander Tolsma](https://github.com/stolsma)
#### Contributors: [Tom Yandell](https://github.com/tomyan)


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
