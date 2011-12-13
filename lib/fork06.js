/**
 * fork06.js: changed child_process.fork() function from nodejs 6.x
 * for nodejs 6.x
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

var spawn = require('child_process').spawn;


function setupChannel(target, channel) {
  var isWindows = process.platform === 'win32';
  target._channel = channel;

  var jsonBuffer = '';

  if (isWindows) {
    var setSimultaneousAccepts = function(handle) {
      var simultaneousAccepts = (process.env.NODE_MANY_ACCEPTS
        && process.env.NODE_MANY_ACCEPTS != '0') ? true : false;

      if (handle._simultaneousAccepts != simultaneousAccepts) {
        handle.setSimultaneousAccepts(simultaneousAccepts);
        handle._simultaneousAccepts = simultaneousAccepts;
      }
    }
  }

  channel.onread = function(pool, offset, length, recvHandle) {
    if (recvHandle && setSimultaneousAccepts) {
      // Update simultaneous accepts on Windows
      setSimultaneousAccepts(recvHandle);
    }

    if (pool) {
      jsonBuffer += pool.toString('ascii', offset, offset + length);

      var i, start = 0;
      while ((i = jsonBuffer.indexOf('\n', start)) >= 0) {
        var json = jsonBuffer.slice(start, i);
        var message = JSON.parse(json);

        target.emit('message', message, recvHandle);
        start = i+1;
      }
      jsonBuffer = jsonBuffer.slice(start);

    } else {
      channel.close();
      target._channel = null;
    }
  };

  target.send = function(message, sendHandle) {
    if (!target._channel) throw new Error("channel closed");

    // For overflow protection don't write if channel queue is too deep.
    if (channel.writeQueueSize > 1024 * 1024) {
      return false;
    }

    var buffer = Buffer(JSON.stringify(message) + '\n');

    if (sendHandle && setSimultaneousAccepts) {
      // Update simultaneous accepts on Windows
      setSimultaneousAccepts(sendHandle);
    }

    var writeReq = channel.write(buffer, 0, buffer.length, sendHandle);

    if (!writeReq) {
      throw new Error(errno + " cannot write to IPC channel.");
    }

    writeReq.oncomplete = nop;

    return true;
  };

  channel.readStart();
}

function nop() { }

var Pipe;
// constructors for lazy loading
function createPipe(ipc) {
  // Lazy load
  if (!Pipe) {
    Pipe = process.binding('pipe_wrap').Pipe;
  }
  return new Pipe(ipc);
}


exports.fork = function fork(modulePath, args, options) {
  if (!options) options = {};

  if (options.stdinStream) {
    throw new Error("stdinStream not allowed for fork()");
  }

  // Leave stdin open for the IPC channel. 
  if (options.customFds) {
    // current 0.6.5 doesnt take given custom fd's for stdout and stderr but wil
    // create new fd's for stdout and stderr when customFds [-1, -1/1, -1/2] is
    // available so make sure [-1, -1, -1]/[-1, -1, 2]/[-1, 1, -1]/[-1, 1, 2] are 
    // requested when customFds is defined. 
    options.customFds[0] = -1;
    options.customFds[1] = (options.customFds[1]===1) ?  1 : -1;
    options.customFds[2] = (options.customFds[2]===2) ?  2 : -1;
  } else {
    // Unless they used customFds, just use the parent process stdout, stderr
    options.customFds = [ -1, 1, 2 ];
  }
  // stdin is the IPC channel.
  options.stdinStream = createPipe(true);

  // Just need to set this - child process won't actually use the fd.
  if (!options.env) options.env = {};
  options.env.NODE_CHANNEL_FD = 42;

  args = (args) ? args.slice() : [];
  args.unshift(modulePath);

  var child = spawn(process.execPath, args, options);

  setupChannel(child, options.stdinStream);

  child.on('exit', function() {
    if (child._channel) {
      child._channel.close();
    }
  });

  return child;
};

/**
 * Execute the following code at module or child startup when process.send is not
 * available. Will not happen in node 0.6 so empty!!
 */
exports.clientInitialize = function clientInitialize() {
}