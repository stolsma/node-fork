/**
 * fork04.js: backported child_process.fork() function from nodejs 5.x
 * for nodejs 4.x
 *
 * Copyright 2011 TTC/Sander Tolsma
 * See LICENSE file for license
 *
 * Copyright Joyent, Inc. and other Node contributors.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

var child_process = require('child_process'),
    path = require('path'),
    spawn = child_process.spawn,
    Stream = require('net').Stream,
    close = process.binding('net').close,
    createpair = require('../build/default/createpair').createpair;

/**
 * Setup one side of the bi-directional JSON communication channel
 * @private
 */
function setupChannel(target, fd) {
  target._channel = new Stream(fd);
  target._channel.writable = true;
  target._channel.readable = true;

  target._channel.resume();
  target._channel.setEncoding('utf8');

  var buffer = '';
  target._channel.on('data', function(d) {
    buffer += d;
    var i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      var json = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      var m = JSON.parse(json);
      target.emit('message', m);
    }
  });

  target.send = function(m) {
    target._channel.write(JSON.stringify(m) + '\n');
  };
}


/**
 * Close file descriptor
 * @private
 */
function closeFd(fd) {
  if (fd >= 0) {
    close(fd);
    return -1;
  }
  return fd;
}

/**
 * Spawn a node child process with communication channel with the parent process
 */
exports.fork = function fork(modulePath, args, options) {
  if (!options) options = {};

  // Create communications socket pair
  var fds;
  try {
    fds = createpair();
  } catch (err) {
      var error = new Error('Error creating socket pair!');
      error.pairErr = err;
      throw(error);
      return;
  }
  
  // communicate message channel numbers to child via environment
  options.env = options.env || {};
  options.env.NODE_CHANNEL_FD = fds[0] + ':' + fds[1];

  args = (args) ? args.slice() : [];
  args.unshift(modulePath);

  // execute node-fork before the requested modulePath and stay invisible?
  if (!options.visible) { 
    args.unshift(path.join(__dirname, 'fork.js'));
  }

  // Unless they used customFds/silent, just use the parent process stdout, stderr
  if (options.silent) options.customFds = [-1, -1, -1];
  if (!options.customFds) options.customFds = [0, 1, 2];

  // spawn the nodejs child process
  var child = spawn(process.execPath, args, options);

  // clean things we changed...
  delete options.env.NODE_CHANNEL_FD;

  // Close the childs's end of the channel.
  closeFd(fds[1]);
  
  // setup parent side of the comms channel
  setupChannel(child, fds[0]);

  child.on('exit', function() {
    child._channel.destroy();
  });

  return child;
};


/**
 * Execute the following code at module or child startup in order to be 
 * able to receive messages from the parent process. 
 * If we were spawned with env.NODE_CHANNEL_FD then get that var and start
 * parsing data from the given stream.
 */
exports.clientInitialize = function clientInitialize() {
  // clean fds argument
  var fds = process.env.NODE_CHANNEL_FD.split(':');
  fds[0] = parseInt(fds[0]);
  fds[1] = parseInt(fds[1]);

  // delete so no-one can use it later on
  delete process.env.NODE_CHANNEL_FD;

  // Close the parents's end of the channel.
  closeFd(fds[0]);

  // create comms channel with events/function on process
  if (fds[1] < 0) throw('No valid fd number available from parent process!');
  setupChannel(process, fds[1]);
}